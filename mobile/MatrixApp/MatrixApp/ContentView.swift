//
//  ContentView.swift
//  MatrixApp
//
//  Created by Admin on 10/06/26.
//

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
        .task {
            vm.bootstrap()
        }
    }
}

struct AuthContainerView: View {
    @Binding var screen: AuthScreen

    var body: some View {
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

struct LoginView: View {
    @Binding var screen: AuthScreen
    @EnvironmentObject var vm: AppViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var validationError: String?

    var body: some View {
        NavigationStack {
            Form {
                TextField("Email", text: $email)
                SecureField("Password", text: $password)

                if let error = validationError ?? vm.authError {
                    Text(error).foregroundStyle(.red)
                }

                Button("Sign In") {
                    validationError = vm.validateLogin(email: email, password: password)
                    guard validationError == nil else { return }
                    Task { await vm.login(email: email, password: password) }
                }
                .disabled(vm.isLoading)

                Button("Create Account") { screen = .register }
                Button("Forgot Password") { screen = .forgot }
            }
            .navigationTitle("Sign In")
        }
    }
}

struct ContentView: View {
    var body: some View {
        RootView()
    }
}
