import Foundation

private final class PairingRedirectPolicy: NSObject, URLSessionTaskDelegate {
  func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
    completionHandler(nil)
  }
}

enum TempoPairingClient {
  static func redeem(_ invitation: TempoPairingInvitation) async throws -> String {
    let config = URLSessionConfiguration.ephemeral
    config.timeoutIntervalForRequest = 10
    config.timeoutIntervalForResource = 15
    config.urlCache = nil
    config.httpCookieStorage = nil
    let session = URLSession(configuration: config, delegate: PairingRedirectPolicy(), delegateQueue: nil)
    defer { session.finishTasksAndInvalidate() }
    guard let baseURL = URL(string: invitation.server), baseURL.scheme == "https" else { throw TempoPairingError.invalidCode }
    let url = baseURL.appendingPathComponent("v1/pairing/redeem")
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.httpBody = try JSONEncoder().encode(["code": invitation.code])
    let data: Data
    let response: URLResponse
    do { (data, response) = try await session.data(for: request) }
    catch { throw TempoPairingError.connectionFailed }
    guard let response = response as? HTTPURLResponse else { throw TempoPairingError.connectionFailed }
    if response.statusCode == 401 || response.statusCode == 410 { throw TempoPairingError.expired }
    if response.statusCode == 404 { throw TempoPairingError.serverUnsupported }
    guard response.statusCode == 200, data.count <= 4096,
          let result = try? JSONDecoder().decode([String: String].self, from: data),
          let token = result["token"],
          token.utf8.count == 64,
          token.range(of: "^[0-9a-fA-F]{64}$", options: .regularExpression) != nil else {
      throw TempoPairingError.connectionFailed
    }
    var ping = URLRequest(url: baseURL.appendingPathComponent("v1/ping"))
    ping.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    let (pingData, pingResponse) = try await session.data(for: ping)
    guard (pingResponse as? HTTPURLResponse)?.statusCode == 200, pingData.count <= 4096,
          let result = try? JSONDecoder().decode([String: String].self, from: pingData),
          result["status"] == "ok" else { throw TempoPairingError.connectionFailed }
    return token
  }
}
