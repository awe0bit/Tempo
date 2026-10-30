import Foundation

enum TempoPreferenceKey {
  static let appearance = "qingxu.appearance"
  static let moduleOrder = "qingxu.modules.order"
  static let haptics = "qingxu.feedback.haptics"
  static let completionSound = "qingxu.feedback.completionSound"
  static let dailyReminder = "qingxu.reminders.daily.enabled"
  static let dailyReminderMinutes = "qingxu.reminders.daily.minutes"
  static let weekStartsMonday = "qingxu.calendar.weekStartsMonday"
  static let showFestivals = "qingxu.calendar.showFestivals"
  static let showTaskIndicators = "qingxu.calendar.showTaskIndicators"
}

enum TempoModuleOrder {
  #if os(iOS)
  static let defaultValue = "inbox,today,tools,settings"
  #else
  static let defaultValue = AppTab.allCases.map(\.rawValue).joined(separator: ",")
  #endif

  static func decode(_ rawValue: String) -> [AppTab] {
    var seen = Set<AppTab>()
    let decoded = rawValue
      .split(separator: ",")
      .compactMap { value -> AppTab? in
        #if os(iOS)
        if ["pomodoro", "focus", "rss"].contains(String(value)) { return .tools }
        #endif
        return AppTab(rawValue: String(value))
      }
      .filter { seen.insert($0).inserted }
    #if os(iOS)
    let missing = [AppTab.inbox, .today, .tools, .settings].filter { !decoded.contains($0) }
    #else
    let missing = AppTab.allCases.filter { !decoded.contains($0) }
    #endif
    return decoded + missing
  }

  static func encode(_ tabs: [AppTab]) -> String {
    decode(tabs.map(\.rawValue).joined(separator: ","))
      .map(\.rawValue)
      .joined(separator: ",")
  }
}

enum TempoNavigationPolicy {
  static let maximumVisibleTabs = 5

  static func visibleTabs(order: [AppTab]) -> [AppTab] {
    TempoModuleOrder.decode(order.map(\.rawValue).joined(separator: ","))
      .prefix(maximumVisibleTabs)
      .map { $0 }
  }
}

#if os(iOS)
import AudioToolbox
import UIKit
import UserNotifications

actor TempoPermissionGate {
  static let shared = TempoPermissionGate()

  private var isReady = false
  private var waiters: [CheckedContinuation<Void, Never>] = []

  func markAppReady() {
    guard !isReady else { return }
    isReady = true
    waiters.forEach { $0.resume() }
    waiters.removeAll()
  }

  func waitUntilAppReady() async {
    guard !isReady else { return }
    await withCheckedContinuation { continuation in
      waiters.append(continuation)
    }
  }
}

enum TempoFeedback {
  static func selection(enabled: Bool) {
    guard enabled else { return }
    UISelectionFeedbackGenerator().selectionChanged()
  }

  static func taskCompletion(haptics: Bool, sound: Bool) {
    if haptics {
      UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    if sound {
      AudioServicesPlaySystemSound(1104)
    }
  }
}

enum TempoDailyReminder {
  static let identifier = "qingxu.daily-reminder"

  static func authorizationStatus() async -> UNAuthorizationStatus {
    await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
  }

  @discardableResult
  static func update(enabled: Bool, minutesAfterMidnight: Int) async throws -> Bool {
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: [identifier])
    guard enabled else { return true }

    let settings = await center.notificationSettings()
    var authorized = settings.authorizationStatus == .authorized
      || settings.authorizationStatus == .provisional
    if settings.authorizationStatus == .notDetermined {
      await TempoPermissionGate.shared.waitUntilAppReady()
      authorized = try await center.requestAuthorization(options: [.alert, .sound, .badge])
    }
    guard authorized else { return false }

    let normalized = min(23 * 60 + 59, max(0, minutesAfterMidnight))
    var components = DateComponents()
    components.hour = normalized / 60
    components.minute = normalized % 60

    let content = UNMutableNotificationContent()
    content.title = "Tempo"
    content.body = "看一眼今天的安排，轻松开始。"
    content.sound = .default

    let request = UNNotificationRequest(
      identifier: identifier,
      content: content,
      trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
    )
    try await center.add(request)
    return true
  }
}
#endif
