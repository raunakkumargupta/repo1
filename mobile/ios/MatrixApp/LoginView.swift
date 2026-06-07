import SwiftUI

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    
    // Use an environment object or binding to switch views on success
    @Binding var isLoggedIn: Bool
    
    var body: some View {
        VStack(spacing: 24) {
            Text("Matrix Command")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(Color.theme.textPrimary)
                .padding(.bottom, 20)
            
            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.theme.destructive)
                    .cornerRadius(8)
            }
            
            VStack(spacing: 16) {
                TextField("Email Address", text: $email)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .padding()
                    .background(Color.theme.surface)
                    .cornerRadius(10)
                    .foregroundColor(Color.theme.textPrimary)
                
                SecureField("Password", text: $password)
                    .padding()
                    .background(Color.theme.surface)
                    .cornerRadius(10)
                    .foregroundColor(Color.theme.textPrimary)
            }
            
            Button(action: performLogin) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Sign In")
                        .fontWeight(.bold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.theme.primaryAccent)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(isLoading || email.isEmpty || password.isEmpty)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.theme.background.edgesIgnoringSafeArea(.all))
    }
    
    func performLogin() {
        isLoading = true
        errorMessage = ""
        
        let payload = ["email": email, "password": password]
        
        NetworkManager.shared.request(endpoint: "auth/login", method: "POST", body: payload) { result in
            isLoading = false
            switch result {
            case .success(let data):
                if let token = data["token"] as? String, let tokenData = token.data(using: .utf8) {
                    KeychainHelper.standard.save(tokenData, service: "matrix-jwt", account: "user")
                    isLoggedIn = true
                }
            case .failure(let error):
                errorMessage = error.localizedDescription
            }
        }
    }
}
