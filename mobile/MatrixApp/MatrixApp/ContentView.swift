import SwiftUI

struct RootView: View {
    @StateObject private var vm = AppViewModel()
    @State private var screen: AuthScreen = .login

    var body: some View {
        Group {
            if vm.isLoggedIn {
                DashboardView()
                    .environmentObject(vm)
            } else {
                AuthContainerView(screen: $screen)
                    .environmentObject(vm)
            }
        }
        .preferredColorScheme(vm.activeTheme == .appleClean ? .light : .dark)
        .task {
            vm.bootstrap()
        }
    }
}

struct AuthContainerView: View {
    @Binding var screen: AuthScreen
    @EnvironmentObject var vm: AppViewModel

    var body: some View {
        ZStack {
            // Persistent background gradient
            LinearGradient(
                gradient: Gradient(colors: [vm.activeTheme.background, vm.activeTheme.backgroundEnd]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            // Decorative background glowing bubbles
            VStack {
                HStack {
                    Circle()
                        .fill(vm.activeTheme.primaryAccent.opacity(0.12))
                        .frame(width: 250, height: 250)
                        .blur(radius: 50)
                        .offset(x: -50, y: -50)
                    Spacer()
                }
                Spacer()
                HStack {
                    Spacer()
                    Circle()
                        .fill(vm.activeTheme.accentSecondary.opacity(0.08))
                        .frame(width: 200, height: 200)
                        .blur(radius: 50)
                        .offset(x: 50, y: 50)
                }
            }
            .ignoresSafeArea()
            
            switch screen {
            case .login:
                LoginView(screen: $screen)
            case .register:
                RegisterView(screen: $screen)
            case .forgot:
                ForgotPasswordView(screen: $screen)
            }
        }
    }
}

struct LoginView: View {
    @Binding var screen: AuthScreen
    @EnvironmentObject var vm: AppViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var validationError: String?

    var body: some View {
        VStack(spacing: 28) {
            // Brand Logo & Header
            VStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(vm.activeTheme.primaryAccent.opacity(0.15))
                        .frame(width: 60, height: 60)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(vm.activeTheme.primaryAccent.opacity(0.4), lineWidth: 1.5)
                        )
                    
                    Image("AppLogo")
                        .renderingMode(.original)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 40, height: 40)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                
                Text("Matrix Command")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(vm.activeTheme.textPrimary)
                
                Text("Launch your hackathon events with speed.")
                    .font(.subheadline)
                    .foregroundStyle(vm.activeTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 20)
            
            // Glass Card Wrapper
            VStack(spacing: 20) {
                // Inputs Block
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email Address")
                            .font(.caption.bold())
                            .foregroundColor(vm.activeTheme.textSecondary)
                        
                        HStack {
                            Image(systemName: "envelope.fill")
                                .foregroundColor(vm.activeTheme.textSecondary)
                            TextField("name@email.com", text: $email)
                                .keyboardType(.emailAddress)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.none)
                                .foregroundStyle(vm.activeTheme.textPrimary)
                        }
                        .padding()
                        .background(vm.activeTheme.surfaceVariant.opacity(0.5))
                        .cornerRadius(12)
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Secure Password")
                            .font(.caption.bold())
                            .foregroundColor(vm.activeTheme.textSecondary)
                        
                        HStack {
                            Image(systemName: "lock.fill")
                                .foregroundColor(vm.activeTheme.textSecondary)
                            SecureField("••••••••", text: $password)
                                .foregroundStyle(vm.activeTheme.textPrimary)
                        }
                        .padding()
                        .background(vm.activeTheme.surfaceVariant.opacity(0.5))
                        .cornerRadius(12)
                    }
                }
                
                // Error Notification block
                if let error = validationError ?? vm.authError {
                    Text(error)
                        .font(.caption)
                        .bold()
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }
                
                // Submit Button
                Button {
                    validationError = vm.validateLogin(email: email, password: password)
                    guard validationError == nil else { return }
                    Task {
                        await vm.login(email: email, password: password)
                    }
                } label: {
                    HStack {
                        if vm.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Authorize Mission")
                                .fontWeight(.bold)
                            Image(systemName: "arrow.right")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [vm.activeTheme.primaryAccent, vm.activeTheme.accentSecondary]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundColor(.white)
                    .cornerRadius(14)
                    .shadow(color: vm.activeTheme.primaryAccent.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .disabled(vm.isLoading)
            }
            .glassCardStyle(theme: vm.activeTheme)
            
            // Footer Navigation Links
            VStack(spacing: 12) {
                Button {
                    screen = .register
                } label: {
                    Text("New here? Create Account")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(vm.activeTheme.primaryAccent)
                }
                
                Button {
                    screen = .forgot
                } label: {
                    Text("Recover Password")
                        .font(.footnote)
                        .foregroundColor(vm.activeTheme.textSecondary)
                }
            }
        }
        .padding(.horizontal, 24)
    }
}

struct ContentView: View {
    var body: some View {
        RootView()
    }
}
