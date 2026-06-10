import SwiftUI
import Combine
import UserNotifications

@MainActor
final class AppViewModel: ObservableObject {
    @Published var isLoggedIn = false
    @Published var hackathons: [Hackathon] = []
    @Published var isRegisterMode = false
    @Published var isLoading = false
    @Published var authError: String?
    @Published var authMessage: String?
    @Published var currentProfile: UserProfile?
    
    // MARK: - Selected Hackathon Details State
    @Published var selectedHackathon: Hackathon? {
        didSet {
            if let id = selectedHackathon?.id {
                Task { await loadSelectedHackathonDetails(id: id) }
            }
        }
    }
    @Published var selectedRegistration: Registration?
    @Published var selectedTeam: TeamStatusResponse?
    @Published var selectedAnnouncements: [Announcement] = []
    
    // Backward compatibility or fallback placeholders for list view
    @Published var announcements: [Announcement] = []
    @Published var activeHackathonTeam: TeamStatusResponse?
    @Published var registrationStatus: Registration?
    
    func bootstrap() {
        #if DEBUG
        // In debug mode, we can clear to allow testing fresh login states easily
        // If you want persistent logins, comment out clear()
        KeychainHelper.shared.clear()
        isLoggedIn = false
        #else
        isLoggedIn = KeychainHelper.shared.read() != nil
        if isLoggedIn {
            Task {
                await loadCurrentProfile()
                await loadHackathons()
            }
        }
        #endif
    }

    func loadCurrentProfile() async {
        do {
            currentProfile = try await NetworkManager.shared.fetchMyProfile()
        } catch {
            authError = "Profile load failed: \(error.localizedDescription)"
        }
    }

    func logout() {
        KeychainHelper.shared.clear()
        currentProfile = nil
        selectedHackathon = nil
        selectedRegistration = nil
        selectedTeam = nil
        selectedAnnouncements = []
        hackathons = []
        isLoggedIn = false
    }

    func saveProfile(bio: String, github: String, linkedin: String, skills: [String]) async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await NetworkManager.shared.updateProfile(
                HackerProfileRequest(
                    bio: bio,
                    githubUrl: github,
                    linkedinUrl: linkedin,
                    skills: skills
                )
            )
            await loadCurrentProfile()
        } catch {
            authError = "Failed to save profile: \(error.localizedDescription)"
        }
    }

    func login(email: String, password: String) async {
        isLoading = true
        authError = nil
        defer { isLoading = false }
        do {
            let token = try await NetworkManager.shared.login(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password
            )
            KeychainHelper.shared.save(token)
            isLoggedIn = true
            
            await loadCurrentProfile()
            await loadHackathons()
            
            // Auto-select first hackathon if available
            if let first = hackathons.first {
                selectedHackathon = first
            }
            
            // Sync push notifications
            Task {
                await requestNotificationPermissions()
            }
        } catch {
            authError = error.localizedDescription
        }
    }

    func loadHackathons() async {
        isLoading = true
        defer { isLoading = false }
        do {
            hackathons = try await NetworkManager.shared.fetchHackathons()
            if selectedHackathon == nil, let first = hackathons.first {
                selectedHackathon = first
            }
        } catch {
            authError = "Failed to load hackathons: \(error.localizedDescription)"
        }
    }

    func loadSelectedHackathonDetails(id: String) async {
        do {
            async let reg = NetworkManager.shared.fetchRegistrationStatus(for: id)
            async let team = NetworkManager.shared.fetchMyTeam(for: id)
            async let ann = NetworkManager.shared.fetchAnnouncements(for: id)
            
            let fetchedReg = try await reg
            let fetchedTeam = try await team
            let fetchedAnn = try await ann
            
            self.selectedRegistration = fetchedReg
            self.selectedTeam = fetchedTeam
            self.selectedAnnouncements = fetchedAnn
            
            // Synchronize back to legacy single-context states
            self.registrationStatus = fetchedReg
            self.activeHackathonTeam = fetchedTeam
            self.announcements = fetchedAnn
        } catch {
            print("Failed to load details for hackathon \(id): \(error)")
        }
    }
    
    func refreshSelectedHackathon() async {
        if let id = selectedHackathon?.id {
            await loadSelectedHackathonDetails(id: id)
        }
    }

    func register(name: String, email: String, password: String) async {
        isLoading = true
        authError = nil
        defer { isLoading = false }
        do {
            try await NetworkManager.shared.register(
                name: name.trimmingCharacters(in: .whitespaces),
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password
            )
            await login(email: email, password: password)
        } catch {
            authError = error.localizedDescription
        }
    }

    func forgotPassword(email: String) async {
        isLoading = true
        authError = nil
        defer { isLoading = false }
        do {
            try await NetworkManager.shared.forgotPassword(email: email.trimmingCharacters(in: .whitespacesAndNewlines))
            authMessage = "Password reset link has been dispatched."
        } catch {
            authError = "Unable to process request."
        }
    }
    
    // MARK: - Push Notifications
    func requestNotificationPermissions() async {
        let center = UNUserNotificationCenter.current()
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            if granted {
                // In production this would be retrieved from application:didRegisterForRemoteNotificationsWithDeviceToken:
                // For simulator/testing, we supply a simulation-grade APNS push token to test Go API connection.
                let simulatedToken = "simulated_apns_device_token_matrix_command_ios_2026"
                try await NetworkManager.shared.saveFcmToken(token: simulatedToken)
            }
        } catch {
            print("Push notification registration failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Helpers
    func isValidEmail(_ email: String) -> Bool {
        let regex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        return email.range(of: regex, options: .regularExpression) != nil
    }

    func validateRegistration(name: String, email: String, password: String, confirmPassword: String) -> String? {
        if name.trimmingCharacters(in: .whitespaces).count < 2 { return "Enter your full name" }
        if !isValidEmail(email) { return "Enter a valid email address" }
        if password.count < 8 { return "Password must be at least 8 characters" }
        if password != confirmPassword { return "Passwords do not match" }
        return nil
    }

    func validateLogin(email: String, password: String) -> String? {
        if !isValidEmail(email.trimmingCharacters(in: .whitespacesAndNewlines)) {
            return "Enter a valid email address"
        }
        if password.isEmpty {
            return "Password is required"
        }
        return nil
    }
}
