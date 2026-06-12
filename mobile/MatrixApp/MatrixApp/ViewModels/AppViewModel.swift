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
    @Published var currentUser: User?
    @Published var currentProfile: HackerProfile?
    @Published var allRegistrations: [Registration] = []
    @Published var activeTheme: AppTheme = .norseObsidian {
        didSet {
            if let encoded = try? JSONEncoder().encode(activeTheme) {
                UserDefaults.standard.set(encoded, forKey: "matrix_active_theme")
            }
        }
    }
    @Published var publicTeams: [Team] = []
    @Published var myOutgoingRequests: [TeamJoinRequest] = []
    @Published var myIncomingInvitations: [TeamInvitation] = []
    @Published var incomingTeamRequests: [TeamJoinRequest] = []
    
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
    private var cancellables = Set<AnyCancellable>()

    init() {
        NotificationCenter.default.publisher(for: .didReceiveFCMToken)
            .receive(on: RunLoop.main)
            .sink { [weak self] notification in
                guard let self = self, self.isLoggedIn else { return }
                if let token = notification.userInfo?["token"] as? String {
                    Task {
                        try? await NetworkManager.shared.saveFcmToken(token: token)
                    }
                }
            }
            .store(in: &cancellables)
    }

    func bootstrap() {
        if let data = UserDefaults.standard.data(forKey: "matrix_active_theme"),
           let decoded = try? JSONDecoder().decode(AppTheme.self, from: data) {
            activeTheme = decoded
        }
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
            async let userFetch = NetworkManager.shared.fetchCurrentUser()
            async let profileFetch = NetworkManager.shared.fetchMyProfile()
            
            currentUser = try await userFetch
            currentProfile = try await profileFetch
        } catch {
            authError = "Profile load failed: \(error.localizedDescription)"
        }
    }

    func logout() {
        KeychainHelper.shared.clear()
        currentUser = nil
        currentProfile = nil
        allRegistrations = []
        selectedHackathon = nil
        selectedRegistration = nil
        selectedTeam = nil
        selectedAnnouncements = []
        hackathons = []
        isLoggedIn = false
    }

    func saveProfile(profile: HackerProfile) async {
        isLoading = true
        authError = nil
        defer { isLoading = false }
        do {
            try await NetworkManager.shared.updateProfile(profile)
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
            
            // Parallel load registrations for dashboard stats
            var regs: [Registration] = []
            await withTaskGroup(of: Registration?.self) { group in
                for hack in hackathons {
                    group.addTask {
                        try? await NetworkManager.shared.fetchRegistrationStatus(for: hack.id)
                    }
                }
                for await reg in group {
                    if let reg = reg {
                        regs.append(reg)
                    }
                }
            }
            self.allRegistrations = regs
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
            
            self.registrationStatus = fetchedReg
            self.activeHackathonTeam = fetchedTeam
            self.announcements = fetchedAnn
            
            // Fetch team hub state conditionally
            if fetchedReg?.approvalStatus == "Accepted" {
                if let teamInfo = fetchedTeam {
                    let isLeader = currentUser?.id != nil && currentUser?.id == teamInfo.team.leaderId
                    if isLeader {
                        self.incomingTeamRequests = (try? await NetworkManager.shared.fetchTeamRequests(hackathonId: id, teamId: teamInfo.team.id)) ?? []
                    } else {
                        self.incomingTeamRequests = []
                    }
                    self.publicTeams = []
                    self.myOutgoingRequests = []
                    self.myIncomingInvitations = []
                } else {
                    async let pub = NetworkManager.shared.fetchPublicTeams(for: id)
                    async let out = NetworkManager.shared.fetchMyRequests(hackathonId: id)
                    async let inv = NetworkManager.shared.fetchMyInvitations(hackathonId: id)
                    
                    self.publicTeams = (try? await pub) ?? []
                    self.myOutgoingRequests = (try? await out) ?? []
                    self.myIncomingInvitations = (try? await inv) ?? []
                    self.incomingTeamRequests = []
                }
            } else {
                self.publicTeams = []
                self.myOutgoingRequests = []
                self.myIncomingInvitations = []
                self.incomingTeamRequests = []
            }
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
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                if let fcmToken = UserDefaults.standard.string(forKey: "matrix_fcm_token") {
                    try? await NetworkManager.shared.saveFcmToken(token: fcmToken)
                }
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

    // MARK: - Team Hub Management Actions
    func requestToJoin(teamId: String) async {
        guard let hackId = selectedHackathon?.id else { return }
        do {
            try await NetworkManager.shared.requestToJoinTeam(hackathonId: hackId, teamId: teamId)
            await refreshSelectedHackathon()
        } catch {
            print("Request to join failed: \(error)")
        }
    }

    func inviteUser(email: String) async throws {
        guard let hackId = selectedHackathon?.id, let teamId = selectedTeam?.team.id else { return }
        try await NetworkManager.shared.inviteUserToTeam(hackathonId: hackId, teamId: teamId, email: email)
        await refreshSelectedHackathon()
    }

    func removeMember(memberId: String) async {
        guard let hackId = selectedHackathon?.id, let teamId = selectedTeam?.team.id else { return }
        do {
            try await NetworkManager.shared.removeTeamMember(hackathonId: hackId, teamId: teamId, memberId: memberId)
            await refreshSelectedHackathon()
        } catch {
            print("Remove member failed: \(error)")
        }
    }

    func respondToRequest(requestId: String, accept: Bool) async {
        guard let hackId = selectedHackathon?.id else { return }
        let status = accept ? "Accepted" : "Rejected"
        do {
            try await NetworkManager.shared.manageTeamRequest(hackathonId: hackId, requestId: requestId, status: status)
            await refreshSelectedHackathon()
        } catch {
            print("Respond to request failed: \(error)")
        }
    }

    func respondToInvitation(invitationId: String, accept: Bool) async {
        guard let hackId = selectedHackathon?.id else { return }
        let status = accept ? "Accepted" : "Declined"
        do {
            try await NetworkManager.shared.manageInvitation(hackathonId: hackId, invitationId: invitationId, status: status)
            await refreshSelectedHackathon()
        } catch {
            print("Respond to invitation failed: \(error)")
        }
    }
}
