import SwiftUI
import UIKit

@main
struct TempoApp: App {
  @State private var services = TempoAppServices()

  init() {
    // Configure the selected state before SwiftUI creates the first tab bar.
    // This avoids the launch transition briefly rendering the selected item
    // with UIKit's default dark tint and switching to Tempo blue later.
    UITabBar.appearance().tintColor = .tempoTabAccent
    UITabBar.appearance().unselectedItemTintColor = .secondaryLabel
    if #unavailable(iOS 26.0) {
      let appearance = UITabBarAppearance()
      appearance.configureWithTransparentBackground()
      appearance.backgroundEffect = UIBlurEffect(style: .systemUltraThinMaterial)
      appearance.backgroundColor = .clear
      appearance.shadowColor = UIColor.separator.withAlphaComponent(0.18)
      UITabBar.appearance().standardAppearance = appearance
      UITabBar.appearance().scrollEdgeAppearance = appearance
    }
  }

  var body: some Scene {
    WindowGroup {
      TempoStartupView(services: services)
    }
    .backgroundTask(.appRefresh(RSSBackgroundRefresh.identifier)) {
      await services.rssStore.refresh()
      RSSBackgroundRefresh.schedule()
    }
  }
}

// Keep disk/keychain hydration and system-surface work out of the first-frame
// path. The launch overlay does not depend on any application services.
@MainActor
private final class TempoAppServices {
  lazy var store = AppStore()
  lazy var rssStore = RSSStore()
  lazy var updateChecker = AppUpdateChecker()
}

private struct TempoStartupView: View {
  let services: TempoAppServices
  @State private var contentMounted = false
  @State private var showingLaunchExperience = true
  @State private var contentVisibility = 0.0
  @State private var runtimeReady = false
  @AppStorage(TempoPreferenceKey.appearance) private var appearance = "system"

  var body: some View {
    ZStack {
      TempoPalette.background.ignoresSafeArea()
      if contentMounted {
        iOSRootView(
          showingLaunchExperience: showingLaunchExperience,
          launchContentVisibility: contentVisibility
        )
        .environmentObject(services.store)
        .environmentObject(services.rssStore)
        .environmentObject(services.updateChecker)
      }
      if showingLaunchExperience {
        TempoLaunchExperience(contentVisibility: $contentVisibility, isContentReady: runtimeReady) {
          showingLaunchExperience = false
        }
        .zIndex(10)
      }
    }
    .task {
      // Yield a render interval so the launch artwork is already on screen
      // before local hydration or the brownfield runtime can occupy the main thread.
      do { try await Task.sleep(for: .milliseconds(120)) } catch { return }
      contentMounted = true
    }
    .onReceive(NotificationCenter.default.publisher(for: .tempoRuntimeReady)) { _ in
      runtimeReady = true
    }
    .preferredColorScheme(appearance == "light" ? .light : appearance == "dark" ? .dark : nil)
  }
}

private struct iOSRootView: View {
  let showingLaunchExperience: Bool
  let launchContentVisibility: Double
  @EnvironmentObject private var store: AppStore
  @EnvironmentObject private var updateChecker: AppUpdateChecker
  @EnvironmentObject private var rssStore: RSSStore
  @Environment(\.openURL) private var openURL
  @Environment(\.scenePhase) private var scenePhase
  @State private var selection = AppTab.today
  @State private var availableUpdate: TempoRelease?
  @State private var runtimeNavigationDepth = 0
  @State private var runtimeTabVisibility: CGFloat = 1
  @AppStorage(TempoPreferenceKey.moduleOrder) private var moduleOrder = TempoModuleOrder.defaultValue

  var body: some View {
    GeometryReader { geometry in
      ZStack(alignment: .bottom) {
        TempoPalette.background.ignoresSafeArea()

        // Keep the Brownfield host's size stable while the native tab bar follows
        // React Navigation's interactive transition as an independent overlay.
        TempoRuntimeScreen(route: selection)
          .opacity(launchContentVisibility)
          .allowsHitTesting(!showingLaunchExperience)
          .accessibilityHidden(showingLaunchExperience)

        TempoNativeTabBar(
          selection: Binding(
            get: { selection == .pomodoro || selection == .rss ? .tools : selection },
            set: { selection = $0 }
          ),
          visibleTabs: visibleTabs
        ) {
          openDeveloperTools()
        }
        .frame(height: 49 + geometry.safeAreaInsets.bottom)
        .opacity(runtimeTabVisibility * launchContentVisibility)
        .allowsHitTesting(runtimeTabVisibility > 0.98 && !showingLaunchExperience)
        .accessibilityHidden(showingLaunchExperience || runtimeTabVisibility < 0.98)
      }
      .ignoresSafeArea(edges: .bottom)
    }
    .onChange(of: showingLaunchExperience) { _, showing in
      guard !showing else { return }
      Task { await TempoPermissionGate.shared.markAppReady() }
      checkForUpdates()
    }
    .onChange(of: selection) { _ in
      runtimeNavigationDepth = 0
      runtimeTabVisibility = 1
      guard !showingLaunchExperience else { return }
      let feedback = UIImpactFeedbackGenerator(style: .soft)
      feedback.prepare()
      feedback.impactOccurred(intensity: 0.78)
    }
    .onChange(of: scenePhase) { phase in
      if phase == .active {
        consumePendingWidgetDestination()
        Task {
          await store.syncNow()
          await rssStore.syncNow()
          await rssStore.refreshIfNeeded()
        }
      } else if phase == .background {
        RSSBackgroundRefresh.schedule()
      }
    }
    .onOpenURL { url in
      switch url.host {
      case "today": selection = .today
      case "inbox": selection = .inbox
      case "pomodoro": selection = .pomodoro
      case "rss": selection = .rss
      case "tools": selection = .tools
      case "settings": selection = .settings
      default: selection = .today
      }
    }
    .alert(item: $availableUpdate) { release in
      Alert(
        title: Text(TempoL10n.format("发现新版本 v%@", release.version)),
        message: Text(updateMessage(release)),
        primaryButton: .default(Text(TempoL10n.string("直接下载"))) {
          openURL(release.iOSAsset?.browserDownloadURL ?? release.htmlURL)
        },
        secondaryButton: .cancel(Text(TempoL10n.string("稍后")))
      )
    }
    .onReceive(NotificationCenter.default.publisher(for: .tempoOpenDeveloperTools)) { _ in
      openDeveloperTools()
    }
    .onReceive(NotificationCenter.default.publisher(for: .tempoOpenTool)) { notification in
      switch notification.userInfo?["tool"] as? String {
      case "pomodoro": selection = .pomodoro
      case "rss": selection = .rss
      default: selection = .tools
      }
    }
    .onReceive(NotificationCenter.default.publisher(for: .tempoRuntimeNavigationDepth)) { notification in
      runtimeNavigationDepth = notification.userInfo?["depth"] as? Int ?? 0
    }
    .onReceive(NotificationCenter.default.publisher(for: .tempoRuntimeNavigationProgress)) { notification in
      let value = (notification.userInfo?["progress"] as? NSNumber)?.doubleValue ?? 0
      runtimeTabVisibility = CGFloat(min(max(value, 0), 1))
    }
    .onAppear {
      TempoNativeRegistry.shared.connect(
        store: store,
        rssStore: rssStore,
        updateChecker: updateChecker
      )
      consumePendingWidgetDestination()
      RSSBackgroundRefresh.schedule()
    }
  }

  private var visibleTabs: [AppTab] {
    TempoNavigationPolicy.visibleTabs(order: TempoModuleOrder.decode(moduleOrder))
  }

  private func consumePendingWidgetDestination() {
    let defaults = UserDefaults(suiteName: "group.one.darker.qingxu")
    guard let rawValue = defaults?.string(forKey: "pendingWidgetDestination") else { return }
    defaults?.removeObject(forKey: "pendingWidgetDestination")
    switch rawValue {
    case "pomodoro": selection = .pomodoro
    default: selection = .today
    }
  }

  private func openDeveloperTools() {
    selection = .settings
    DispatchQueue.main.async {
      TempoNativeRegistry.shared.sendCommand("openDeveloperTools")
    }
  }

  private func checkForUpdates() {
    Task {
      if let release = await updateChecker.check() {
        availableUpdate = release
      }
    }
  }

  private func updateMessage(_ release: TempoRelease) -> String {
    let notes = release.body.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !notes.isEmpty else { return TempoL10n.string("新版本已经发布，可前往 GitHub 下载 IPA。") }
    return String(notes.prefix(240))
  }
}

private struct TempoNativeTabBar: UIViewRepresentable {
  @Binding var selection: AppTab
  let visibleTabs: [AppTab]
  let onReveal: () -> Void

  func makeCoordinator() -> Coordinator {
    Coordinator(selection: $selection, visibleTabs: visibleTabs, onReveal: onReveal)
  }

  func makeUIView(context: Context) -> UITabBar {
    let tabBar = UITabBar(frame: .zero)
    tabBar.delegate = context.coordinator
    tabBar.tintColor = .tempoTabAccent
    tabBar.unselectedItemTintColor = .secondaryLabel
    context.coordinator.installGestures(on: tabBar)
    return tabBar
  }

  func updateUIView(_ tabBar: UITabBar, context: Context) {
    context.coordinator.selection = $selection
    context.coordinator.onReveal = onReveal
    context.coordinator.visibleTabs = visibleTabs
    let titles = tabBar.items?.compactMap(\.title) ?? []
    if titles != visibleTabs.map(\.title) {
      tabBar.items = visibleTabs.enumerated().map { index, tab in
        let image = UIImage(systemName: tab.symbol)
        let selectedImage = UIImage(systemName: "\(tab.symbol).fill") ?? image
        let item = UITabBarItem(title: tab.title, image: image, selectedImage: selectedImage)
        item.tag = index
        return item
      }
    }
    if let index = visibleTabs.firstIndex(of: selection),
       let items = tabBar.items,
       items.indices.contains(index) {
      tabBar.selectedItem = items[index]
    }
    DispatchQueue.main.async { [weak coordinator = context.coordinator, weak tabBar] in
      if let tabBar {
        coordinator?.updateItemScale(in: tabBar, animated: false)
      }
    }
  }

  final class Coordinator: NSObject, UITabBarDelegate, UIGestureRecognizerDelegate {
    var selection: Binding<AppTab>
    var onReveal: () -> Void
    var visibleTabs: [AppTab]

    init(selection: Binding<AppTab>, visibleTabs: [AppTab], onReveal: @escaping () -> Void) {
      self.selection = selection
      self.visibleTabs = visibleTabs
      self.onReveal = onReveal
    }

    func installGestures(on tabBar: UITabBar) {
      let tap = UITapGestureRecognizer(target: self, action: #selector(handleFourTaps(_:)))
      tap.numberOfTapsRequired = 4
      tap.cancelsTouchesInView = false
      tap.delegate = self

      let longPress = UILongPressGestureRecognizer(target: self, action: #selector(handleLongPress(_:)))
      longPress.minimumPressDuration = 0.65
      longPress.cancelsTouchesInView = false
      longPress.delegate = self

      tabBar.addGestureRecognizer(tap)
      tabBar.addGestureRecognizer(longPress)
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
      guard visibleTabs.indices.contains(item.tag) else { return }
      selection.wrappedValue = visibleTabs[item.tag]
      updateItemScale(in: tabBar, animated: true)
    }

    func updateItemScale(in tabBar: UITabBar, animated: Bool) {
      guard let selectedIndex = visibleTabs.firstIndex(of: selection.wrappedValue) else { return }
      let controls = tabBar.subviews
        .compactMap { $0 as? UIControl }
        .sorted { $0.frame.minX < $1.frame.minX }
      let changes = {
        for (index, control) in controls.enumerated() {
          control.transform = index == selectedIndex
            ? CGAffineTransform(scaleX: 1.06, y: 1.06)
            : .identity
        }
      }
      if animated {
        UIView.animate(
          withDuration: 0.22,
          delay: 0,
          usingSpringWithDamping: 0.82,
          initialSpringVelocity: 0.2,
          options: [.allowUserInteraction, .beginFromCurrentState],
          animations: changes
        )
      } else {
        changes()
      }
    }

    @objc private func handleFourTaps(_ recognizer: UITapGestureRecognizer) {
      guard recognizer.state == .ended,
            let tabBar = recognizer.view as? UITabBar,
            isSettingsItem(at: recognizer.location(in: tabBar), in: tabBar)
      else { return }
      reveal()
    }

    @objc private func handleLongPress(_ recognizer: UILongPressGestureRecognizer) {
      guard recognizer.state == .began,
            let tabBar = recognizer.view as? UITabBar,
            isSettingsItem(at: recognizer.location(in: tabBar), in: tabBar)
      else { return }
      reveal()
    }

    private func reveal() {
      UIImpactFeedbackGenerator(style: .medium).impactOccurred()
      onReveal()
    }

    private func isSettingsItem(at point: CGPoint, in tabBar: UITabBar) -> Bool {
      guard
            let items = tabBar.items,
            !items.isEmpty,
            tabBar.bounds.width > 0 else { return false }
      let rawIndex = Int((point.x / tabBar.bounds.width) * CGFloat(items.count))
      let visualIndex = min(items.count - 1, max(0, rawIndex))
      let index = tabBar.effectiveUserInterfaceLayoutDirection == .rightToLeft
        ? items.count - 1 - visualIndex
        : visualIndex
      return items[index].title == AppTab.settings.title
    }

    func gestureRecognizer(
      _ gestureRecognizer: UIGestureRecognizer,
      shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool { true }

  }
}

private extension UIColor {
  static let tempoTabAccent = UIColor { traits in
    traits.userInterfaceStyle == .dark
      ? UIColor(red: 0x33 / 255, green: 0x9C / 255, blue: 1.00, alpha: 1)
      : UIColor(red: 0x33 / 255, green: 0x9C / 255, blue: 1.00, alpha: 1)
  }
}
