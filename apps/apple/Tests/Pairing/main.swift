import Foundation

let code = String(repeating: "a", count: 64)
func payload(server: String = "https://sync.example.com", version: Int = 1, value: String = code) -> String {
  let data = try! JSONSerialization.data(withJSONObject: ["type": "tempo-sync-pair", "v": version, "server": server, "code": value])
  return String(data: data, encoding: .utf8)!
}

func rejects(_ text: String) {
  do {
    _ = try TempoPairingInvitation.parse(text)
    fatalError("unsafe pairing payload was accepted")
  } catch {}
}

let invitation = try TempoPairingInvitation.parse(payload())
precondition(invitation.server == "https://sync.example.com" && invitation.code == code)
_ = try TempoPairingInvitation.parse(payload(server: "https://sync.example.com:8443/"))
for server in ["http://sync.example.com", "file:///tmp/pair", "https://user:secret@sync.example.com", "https://sync.example.com/path", "https://sync.example.com?secret=1", "https://sync.example.com#fragment", "https://sync.example.com:99999", "https://sync.example.com\n", "", "https://"] {
  rejects(payload(server: server))
}
rejects(payload(version: 2))
rejects(payload(value: "short"))
rejects(payload(value: code + "\n"))
rejects(payload(value: String(repeating: "z", count: 64)))
rejects("not a QR invitation")
rejects("{}")
rejects(String(repeating: "x", count: 2049))
rejects("{\"type\":\"tempo-sync-pair\",\"v\":1,\"server\":\"https://sync.example.com\",\"code\":\"\(code)\",\"token\":\"unexpected\"}")
print("PASS: pairing invitation accepts versioned HTTPS QR payloads and rejects unsafe inputs")
