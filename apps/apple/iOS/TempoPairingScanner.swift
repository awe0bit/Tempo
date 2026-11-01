import AVFoundation
import SwiftUI
import UIKit
import VisionKit

@MainActor
final class TempoPairingCoordinator: NSObject, UIAdaptivePresentationControllerDelegate {
  static let shared = TempoPairingCoordinator()
  private var controller: UIViewController?

  func present(store: AppStore) throws {
    guard controller == nil else { return }
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    guard let scene = scenes.first(where: { $0.activationState == .foregroundActive }),
          var presenter = scene.windows.first(where: \.isKeyWindow)?.rootViewController else {
      throw TempoPairingError.cameraUnavailable
    }
    while let presented = presenter.presentedViewController { presenter = presented }
    let host = UIHostingController(rootView: TempoPairingView(store: store) { [weak self] in self?.close() })
    host.modalPresentationStyle = .pageSheet
    host.sheetPresentationController?.detents = [.large()]
    host.sheetPresentationController?.prefersGrabberVisible = true
    host.presentationController?.delegate = self
    controller = host
    presenter.present(host, animated: true)
  }

  private func close() {
    controller?.dismiss(animated: true)
    controller = nil
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    controller = nil
  }
}

private struct TempoPairingView: View {
  @ObservedObject var store: AppStore
  let onClose: () -> Void
  @State private var scanning = false
  @State private var permissionDenied = false
  @State private var unavailable = false
  @State private var invitation: TempoPairingInvitation?
  @State private var problem: String?
  @State private var pairing = false
  @State private var paired = false
  @State private var pairingTask: Task<Void, Never>?
  @AppStorage(TempoPreferenceKey.appearance) private var appearance = "system"

  var body: some View {
    NavigationStack {
      ZStack {
        TempoPalette.background.ignoresSafeArea()
        if paired {
          VStack(spacing: 18) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 52)).foregroundStyle(TempoPalette.accent)
            Text(TempoL10n.string("配对成功")).font(.title2.weight(.semibold))
            Text(TempoL10n.string("已保存连接，任务将在后台自动同步")).foregroundStyle(TempoPalette.quiet)
            Button(TempoL10n.string("完成"), action: onClose).buttonStyle(.borderedProminent).tint(TempoPalette.accent)
          }.padding(24).multilineTextAlignment(.center)
        } else if let invitation {
          VStack(spacing: 20) {
            Image(systemName: "network").font(.system(size: 42)).foregroundStyle(TempoPalette.accent)
            Text(TempoL10n.string("连接这台服务器？")).font(.title2.weight(.semibold))
            Text(invitation.server).font(.body).textSelection(.enabled).multilineTextAlignment(.center)
            Text(TempoL10n.string("请确认这是你自己的服务器。配对后，本机数据会按同步规则与服务器合并。"))
              .font(.subheadline).foregroundStyle(TempoPalette.quiet).multilineTextAlignment(.center)
            if let problem { Text(problem).font(.subheadline).foregroundStyle(TempoPalette.danger).multilineTextAlignment(.center) }
            if pairing {
              ProgressView(TempoL10n.string("正在配对并验证连接…"))
            } else if problem != nil {
              Button(TempoL10n.string("重新扫码")) { self.invitation = nil; problem = nil; scanning = true }
                .buttonStyle(.borderedProminent).tint(TempoPalette.accent)
            } else {
              Button(TempoL10n.string("确认配对")) { pair(invitation) }
                .buttonStyle(.borderedProminent).tint(TempoPalette.accent)
              Button(TempoL10n.string("重新扫码")) { self.invitation = nil; scanning = true }.tint(TempoPalette.accent)
            }
          }.padding(28)
        } else if scanning {
          PairingCamera { text in
            do {
              invitation = try TempoPairingInvitation.parse(text)
              problem = nil
              scanning = false
            } catch { problem = error.localizedDescription }
          } onUnavailable: {
            scanning = false
            unavailable = true
          }
          .ignoresSafeArea(edges: .bottom)
          VStack {
            Spacer()
            Text(problem ?? TempoL10n.string("对准服务器终端中的 Tempo 配对二维码"))
              .font(.subheadline).padding(16).frame(maxWidth: .infinity)
              .background(TempoPalette.surface).foregroundStyle(TempoPalette.ink)
          }.padding(20).allowsHitTesting(false)
        } else {
          VStack(spacing: 18) {
            Image(systemName: "qrcode.viewfinder").font(.system(size: 44)).foregroundStyle(TempoPalette.accent)
            if permissionDenied {
              Text(TempoL10n.string("请允许相机访问以扫描配对二维码")).multilineTextAlignment(.center)
              Button(TempoL10n.string("打开系统设置")) {
                guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                UIApplication.shared.open(url)
              }.buttonStyle(.borderedProminent).tint(TempoPalette.accent)
              Button(TempoL10n.string("重新检查权限")) { Task { await prepareCamera() } }.tint(TempoPalette.accent)
            } else if unavailable {
              Text(TempoL10n.string("当前设备无法使用扫码，请检查相机权限")).multilineTextAlignment(.center)
            } else { ProgressView() }
          }.padding(28)
        }
      }
      .foregroundStyle(TempoPalette.ink)
      .navigationTitle(TempoL10n.string("扫码配对"))
      .navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .cancellationAction) { Button(TempoL10n.string("取消"), action: onClose).disabled(pairing) } }
    }
    .interactiveDismissDisabled(pairing)
    .preferredColorScheme(appearance == "light" ? .light : appearance == "dark" ? .dark : nil)
    .task { await prepareCamera() }
    .onDisappear { pairingTask?.cancel() }
  }

  @MainActor private func prepareCamera() async {
    let allowed: Bool
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized: allowed = true
    case .notDetermined: allowed = await AVCaptureDevice.requestAccess(for: .video)
    default: allowed = false
    }
    guard !Task.isCancelled else { return }
    permissionDenied = !allowed
    unavailable = allowed && (!DataScannerViewController.isSupported || !DataScannerViewController.isAvailable)
    scanning = allowed && !unavailable
  }

  private func pair(_ invitation: TempoPairingInvitation) {
    guard !pairing else { return }
    pairing = true
    pairingTask = Task { @MainActor in
      do {
        let token = try await TempoPairingClient.redeem(invitation)
        try Task.checkCancellation()
        var settings = store.syncSettings
        settings.serverURL = invitation.server
        settings.token = token
        if settings.deviceName.isEmpty { settings.deviceName = UIDevice.current.name }
        settings.autoSync = true
        try store.saveSyncSettings(settings)
        paired = true
        if UserDefaults.standard.object(forKey: TempoPreferenceKey.haptics) as? Bool != false {
          UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
        Task { await store.syncNow() }
      } catch {
        if !Task.isCancelled { problem = error.localizedDescription }
      }
      pairing = false
    }
  }
}

private struct PairingCamera: UIViewControllerRepresentable {
  let onCode: (String) -> Void
  let onUnavailable: () -> Void
  func makeUIViewController(context: Context) -> PairingCameraController {
    PairingCameraController(onCode: onCode, onUnavailable: onUnavailable)
  }
  func updateUIViewController(_ controller: PairingCameraController, context: Context) {}
}

private final class PairingCameraController: UIViewController, DataScannerViewControllerDelegate {
  private let scanner = DataScannerViewController(
    recognizedDataTypes: [.barcode(symbologies: [.qr])], qualityLevel: .balanced,
    recognizesMultipleItems: false, isHighFrameRateTrackingEnabled: false,
    isPinchToZoomEnabled: true, isGuidanceEnabled: true, isHighlightingEnabled: true
  )
  private let onCode: (String) -> Void
  private let onUnavailable: () -> Void
  private var lastCode: String?

  init(onCode: @escaping (String) -> Void, onUnavailable: @escaping () -> Void) {
    self.onCode = onCode
    self.onUnavailable = onUnavailable
    super.init(nibName: nil, bundle: nil)
    scanner.delegate = self
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
  override func viewDidLoad() {
    super.viewDidLoad()
    addChild(scanner)
    view.addSubview(scanner.view)
    scanner.view.frame = view.bounds
    scanner.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    scanner.didMove(toParent: self)
  }
  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    do { try scanner.startScanning() } catch { onUnavailable() }
  }
  override func viewWillDisappear(_ animated: Bool) {
    scanner.stopScanning()
    super.viewWillDisappear(animated)
  }
  func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
    for case .barcode(let code) in addedItems {
      guard let text = code.payloadStringValue, text != lastCode else { continue }
      lastCode = text
      if (try? TempoPairingInvitation.parse(text)) != nil { dataScanner.stopScanning() }
      onCode(text)
      break
    }
  }
}
