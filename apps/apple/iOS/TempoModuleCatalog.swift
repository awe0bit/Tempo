import Foundation

enum TempoIOSModulePreferenceKey {
  static let installed = "qingxu.ios.modules.installed.v1"
}

enum TempoIOSModuleID: String, CaseIterable, Hashable {
  case today
  case pomodoro
  case rss

  var tab: AppTab {
    switch self {
    case .today: .today
    case .pomodoro: .pomodoro
    case .rss: .rss
    }
  }

  var version: String { "1.0.0" }

  var downloadSize: Int {
    switch self {
    case .today: 2_400_000
    case .pomodoro: 1_600_000
    case .rss: 3_800_000
    }
  }
}

enum TempoIOSModuleCatalog {
  static let defaultInstalledValue = TempoIOSModuleID.today.rawValue

  static func installedIDs(
    from rawValue: String? = UserDefaults.standard.string(forKey: TempoIOSModulePreferenceKey.installed)
  ) -> Set<TempoIOSModuleID> {
    let source = rawValue ?? defaultInstalledValue
    return Set(source.split(separator: ",").compactMap { TempoIOSModuleID(rawValue: String($0)) })
  }

  static func encoded(_ modules: Set<TempoIOSModuleID>) -> String {
    TempoIOSModuleID.allCases
      .filter { modules.contains($0) }
      .map(\.rawValue)
      .joined(separator: ",")
  }

  static func setInstalled(_ module: TempoIOSModuleID, installed: Bool) {
    var modules = installedIDs()
    if installed {
      modules.insert(module)
    } else {
      modules.remove(module)
    }
    UserDefaults.standard.set(encoded(modules), forKey: TempoIOSModulePreferenceKey.installed)
  }

  static func visibleTabs(moduleOrder: String, installedRawValue: String) -> [AppTab] {
    let installed = installedIDs(from: installedRawValue)
    let optionalTabs = TempoModuleOrder.decode(moduleOrder)
      .filter { tab in
        guard let module = TempoIOSModuleID(rawValue: tab.rawValue) else { return false }
        return installed.contains(module)
      }
    return [.inbox] + optionalTabs + [.settings]
  }

  static func snapshot() -> [[String: Any]] {
    let installed = installedIDs()
    return TempoIOSModuleID.allCases.map { module in
      [
        "id": module.rawValue,
        "version": module.version,
        "downloadSize": module.downloadSize,
        "installed": installed.contains(module),
        "delivery": "bundled",
      ]
    }
  }
}
