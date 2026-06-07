import SwiftUI

@main
struct MatrixApp: App {
    @State private var isLoggedIn: Bool = false
    
    init() {
        // Check if token exists on app launch
        if let _ = KeychainHelper.standard.read(service: "matrix-jwt", account: "user") {
            _isLoggedIn = State(initialValue: true)
        }
    }
    
    var body: some Scene {
        WindowGroup {
            if isLoggedIn {
                DashboardView(isLoggedIn: $isLoggedIn)
            } else {
                LoginView(isLoggedIn: $isLoggedIn)
            }
        }
    }
}
