import Foundation
import Security

final class KeychainHelper {
	static let shared = KeychainHelper()
	private let key = "matrix.jwt"

	private init() {}

	func save(_ token: String) {
		let data = Data(token.utf8)
		SecItemDelete(baseQuery() as CFDictionary)
		var query = baseQuery()
		query[kSecValueData as String] = data
		SecItemAdd(query as CFDictionary, nil)
	}

	func read() -> String? {
		var query = baseQuery()
		query[kSecReturnData as String] = true
		query[kSecMatchLimit as String] = kSecMatchLimitOne
		var item: CFTypeRef?
		SecItemCopyMatching(query as CFDictionary, &item)
		guard let data = item as? Data else { return nil }
		return String(data: data, encoding: .utf8)
	}

	func clear() {
		SecItemDelete(baseQuery() as CFDictionary)
	}

	private func baseQuery() -> [String: Any] {
		[
			kSecClass as String: kSecClassGenericPassword,
			kSecAttrAccount as String: key
		]
	}
}