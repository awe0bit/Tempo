import Foundation

struct TempoPairingInvitation: Decodable {
  let type: String
  let v: Int
  let server: String
  let code: String

  static func parse(_ text: String) throws -> Self {
    guard let data = text.data(using: .utf8), data.count <= 2048,
          let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          Set(object.keys) == Set(["type", "v", "server", "code"]),
          let value = try? JSONDecoder().decode(Self.self, from: data),
          value.type == "tempo-sync-pair", value.v == 1,
          value.code.utf8.count == 64,
          value.code.range(of: "^[0-9a-fA-F]{64}$", options: .regularExpression) != nil,
          let components = URLComponents(string: value.server),
          value.server.rangeOfCharacter(from: .whitespacesAndNewlines) == nil,
          components.scheme == "https", let host = components.host, !host.isEmpty,
          components.user == nil, components.password == nil,
          components.query == nil, components.fragment == nil,
          components.path.isEmpty || components.path == "/",
          components.port.map({ (1...65535).contains($0) }) ?? true,
          components.url != nil else { throw TempoPairingError.invalidCode }
    return value
  }
}

enum TempoPairingError: LocalizedError {
  case invalidCode, expired, serverUnsupported, connectionFailed, cameraUnavailable

  var errorDescription: String? {
    let key: String
    switch self {
    case .invalidCode: key = "这不是有效的 Tempo 配对二维码"
    case .expired: key = "二维码已使用或过期，请在服务器生成新码"
    case .serverUnsupported: key = "服务器尚未支持扫码配对，请先更新同步服务"
    case .connectionFailed: key = "无法连接配对服务器，请检查网络并重新生成二维码"
    case .cameraUnavailable: key = "当前设备无法使用扫码，请检查相机权限"
    }
    return NSLocalizedString(key, bundle: .main, comment: "")
  }
}
