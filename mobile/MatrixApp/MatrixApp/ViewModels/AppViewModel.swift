import SwiftUI
import Combine
import UserNotifications
import CometChatSDK

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
    
    // MARK: - My Hackathons Pagination State
    @Published var myHackathonsPage = 1
    @Published var myHackathonsHasMore = false
    @Published var isLoadingMoreHackathons = false
    @Published var totalHackathonCount = 0
    @Published var totalRegistrationStats: (total: Int, accepted: Int, pending: Int) = (0, 0, 0)
    private let myHackathonsPageSize = 10
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
    
    // MARK: - Explore/Discover Tab Paginated State
    @Published var exploreHackathons: [Hackathon] = []
    @Published var exploreSearchText = ""
    @Published var exploreCurrentPage = 1
    @Published var exploreHasMore = false
    @Published var isLoadingMoreExplore = false
    private let explorePageSize = 10
    
    // MARK: - Public Teams Paginated State
    @Published var publicTeamsSearchText = ""
    @Published var publicTeamsCurrentPage = 1
    @Published var publicTeamsHasMore = false
    private let publicTeamsPageSize = 10
    
    // MARK: - Calling State
    @Published var incomingCall: Call?
    @Published var ongoingCallSessionID: String?
    var ongoingCallStartTime: Date?
    
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
            
        // Bind CometChat call events to SwiftUI state
        CometChatManager.shared.onIncomingCallReceived = { [weak self] call in
            print("[CALL-DEBUG] onIncomingCallReceived: sessionID=\(call.sessionID ?? "nil")")
            self?.incomingCall = call
        }
        CometChatManager.shared.onOutgoingCallAccepted = { [weak self] call in
            print("[CALL-DEBUG] onOutgoingCallAccepted: sessionID=\(call.sessionID ?? "nil"), current ongoingCallSessionID=\(self?.ongoingCallSessionID ?? "nil")")
            self?.incomingCall = nil
            guard let sessionID = call.sessionID else { return }
            // Dismiss the UIKit's internal outgoing call view
            NotificationCenter.default.post(name: NSNotification.Name("CometChatCallEnded"), object: nil)
            // Present the ongoing call view
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self?.ongoingCallSessionID = sessionID
                self?.ongoingCallStartTime = Date()
            }
        }
        CometChatManager.shared.onCallEnded = { [weak self] endedSessionID in
            print("[CALL-DEBUG] onCallEnded: endedSessionID=\(endedSessionID ?? "nil"), active ongoingCallSessionID=\(self?.ongoingCallSessionID ?? "nil"), active incomingCall=\(self?.incomingCall?.sessionID ?? "nil")")
            
            // Clear incoming call if it matches
            if let endedID = endedSessionID, let activeCall = self?.incomingCall {
                if endedID == activeCall.sessionID {
                    print("[CALL-DEBUG] Clearing incomingCall (matches ended session)")
                    self?.incomingCall = nil
                }
            }
            
            // Only clear ongoing session if it's been active for at least 5 seconds
            if let endedID = endedSessionID, let activeID = self?.ongoingCallSessionID {
                if endedID == activeID {
                    let elapsed = Date().timeIntervalSince(self?.ongoingCallStartTime ?? Date())
                    if elapsed > 5.0 {
                        print("[CALL-DEBUG] Clearing ongoingCallSessionID (matches ended session, elapsed=\(elapsed)s)")
                        self?.ongoingCallSessionID = nil
                        self?.ongoingCallStartTime = nil
                    } else {
                        print("[CALL-DEBUG] IGNORING premature call ended (elapsed=\(elapsed)s < 5s, still connecting)")
                    }
                } else {
                    print("[CALL-DEBUG] IGNORING stale call ended event (endedID != activeID)")
                }
            }
            
            // Always re-initialize Calls SDK after any call ends so the next call works
            CometChatManager.shared.reinitializeCallsSDK()
            
            // Dismiss CallKit native UI if it's showing
            CometChatPushHelper.shared.endCallKitCall()
        }
    }

    func bootstrap() {
        if let data = UserDefaults.standard.data(forKey: "matrix_active_theme"),
           let decoded = try? JSONDecoder().decode(AppTheme.self, from: data) {
            activeTheme = decoded
        }
        #if DEBUG
        // In debug mode, check if we have a valid token for persistent login
        // Remove the clear() call so calls don't redirect to login on end
        isLoggedIn = KeychainHelper.shared.read() != nil
        if isLoggedIn {
            Task {
                await loadCurrentProfile()
                await loadHackathons()
                
                // CometChat auto-login
                if let userId = currentUser?.id {
                    CometChatManager.shared.login(uid: userId) { user, error in
                        if let user = user {
                            print("CometChat auto-login success: \(user.uid ?? "") ✓")
                            // Register pending push tokens after login
                            CometChatPushHelper.shared.registerPendingTokens()
                        } else if let error = error {
                            print("CometChat auto-login failed: \(error.errorDescription)")
                        }
                    }
                }
            }
        }
        #else
        isLoggedIn = KeychainHelper.shared.read() != nil
        if isLoggedIn {
            Task {
                await loadCurrentProfile()
                await loadHackathons()
                
                // CometChat auto-login — use backend user ID (UUID) as CometChat UID
                if let userId = currentUser?.id {
                    CometChatManager.shared.login(uid: userId) { user, error in
                        if let user = user {
                            print("CometChat auto-login success: \(user.uid ?? "") ✓")
                            CometChatPushHelper.shared.registerPendingTokens()
                        } else if let error = error {
                            print("CometChat auto-login failed: \(error.errorDescription)")
                        }
                    }
                }
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
        
        // CometChat Logout
        CometChatManager.shared.logout { success, error in
            if success {
                print("CometChat logged out successfully ✓")
            } else if let error = error {
                print("CometChat logout failed: \(error.errorDescription)")
            }
        }
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
            
            // CometChat Login — use backend user ID (UUID) as CometChat UID
            // The sync script creates CometChat users with the backend UUID, not email
            let ccUid = currentUser?.id ?? CometChatManager.uidFromEmail(email.trimmingCharacters(in: .whitespacesAndNewlines))
            await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                CometChatManager.shared.login(uid: ccUid) { user, error in
                    if let user = user {
                        print("CometChat logged in as user: \(user.uid ?? "") ✓")
                    } else if let error = error {
                        print("CometChat login failed: \(error.errorDescription)")
                    }
                    continuation.resume()
                }
            }
            
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
            // Reset pagination state
            myHackathonsPage = 1
            
            let result = try await NetworkManager.shared.fetchHackathonsPaginated(limit: myHackathonsPageSize, offset: 0)
            hackathons = result.hackathons
            totalHackathonCount = result.totalCount
            myHackathonsHasMore = result.hackathons.count >= myHackathonsPageSize
            
            if selectedHackathon == nil, let first = result.hackathons.first {
                selectedHackathon = first
            }
            
            // Load registrations for the displayed page
            let regs = await fetchRegistrations(for: result.hackathons)
            self.allRegistrations = regs
            
            // Fetch full registration stats in the background (lightweight - no hackathon details)
            Task { await loadRegistrationStats() }
        } catch {
            authError = "Failed to load hackathons: \(error.localizedDescription)"
        }
    }
    
    func loadMoreHackathons() async {
        guard myHackathonsHasMore, !isLoadingMoreHackathons else { return }
        isLoadingMoreHackathons = true
        defer { isLoadingMoreHackathons = false }
        do {
            let offset = myHackathonsPage * myHackathonsPageSize
            let result = try await NetworkManager.shared.fetchHackathonsPaginated(limit: myHackathonsPageSize, offset: offset)
            
            myHackathonsHasMore = result.hackathons.count >= myHackathonsPageSize
            myHackathonsPage += 1
            
            hackathons.append(contentsOf: result.hackathons)
            
            // Load registrations for the new page
            let newRegs = await fetchRegistrations(for: result.hackathons)
            self.allRegistrations.append(contentsOf: newRegs)
        } catch {
            print("Failed to load more hackathons: \(error.localizedDescription)")
        }
    }
    
    /// Fetches registration status for ALL hackathons to compute accurate stats.
    /// This runs in the background and only updates the stats counters.
    private func loadRegistrationStats() async {
        do {
            // Fetch all hackathon IDs (use no limit to get them all — just IDs for stat counting)
            let allHacks = try await NetworkManager.shared.fetchHackathons()
            
            var total = 0
            var accepted = 0
            var pending = 0
            
            await withTaskGroup(of: Registration?.self) { group in
                for hack in allHacks {
                    group.addTask {
                        try? await NetworkManager.shared.fetchRegistrationStatus(for: hack.id)
                    }
                }
                for await reg in group {
                    if let reg = reg {
                        total += 1
                        switch reg.approvalStatus.lowercased() {
                        case "accepted": accepted += 1
                        case "pending": pending += 1
                        default: break
                        }
                    }
                }
            }
            
            self.totalRegistrationStats = (total, accepted, pending)
        } catch {
            print("Failed to load registration stats: \(error.localizedDescription)")
        }
    }
    
    private func fetchRegistrations(for hackathonList: [Hackathon]) async -> [Registration] {
        var regs: [Registration] = []
        await withTaskGroup(of: Registration?.self) { group in
            for hack in hackathonList {
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
        return regs
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
                    async let out = NetworkManager.shared.fetchMyRequests(hackathonId: id)
                    async let inv = NetworkManager.shared.fetchMyInvitations(hackathonId: id)
                    
                    self.myOutgoingRequests = (try? await out) ?? []
                    self.myIncomingInvitations = (try? await inv) ?? []
                    self.incomingTeamRequests = []
                    
                    // Reset pagination parameters and load first page of public teams
                    self.publicTeamsCurrentPage = 1
                    self.publicTeamsSearchText = ""
                    await self.loadPublicTeams()
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
        if name.trimmingCharacters(in: .whitespaces).count < 2 { return "Enter your full name (at least 2 characters)" }
        if !isValidEmail(email) { return "Enter a valid email address" }
        if let pwdError = validatePasswordStrength(password) { return pwdError }
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
        if let pwdError = validatePasswordStrength(password) {
            return pwdError
        }
        return nil
    }

    // MARK: - Password Strength Validator
    /// Returns nil if strong enough, otherwise a human-readable error string.
    func validatePasswordStrength(_ password: String) -> String? {
        if password.count < 8 {
            return "Password must be at least 8 characters"
        }
        let hasUpper   = password.range(of: "[A-Z]",           options: .regularExpression) != nil
        let hasLower   = password.range(of: "[a-z]",           options: .regularExpression) != nil
        let hasDigit   = password.range(of: "[0-9]",           options: .regularExpression) != nil
        let hasSpecial = password.range(of: "[@#$%^&+=!?_\\-.*]", options: .regularExpression) != nil

        var missing: [String] = []
        if !hasUpper   { missing.append("uppercase letter") }
        if !hasLower   { missing.append("lowercase letter") }
        if !hasDigit   { missing.append("number") }
        if !hasSpecial { missing.append("special character (@#$%)") }

        if missing.isEmpty { return nil }
        return "Password needs: " + missing.prefix(2).joined(separator: ", ") + (missing.count > 2 ? " and more" : "")
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

    // MARK: - Explore Hackathons Pagination
    func loadExploreHackathons() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let offset = (exploreCurrentPage - 1) * explorePageSize
            let query = exploreSearchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let searchParam = query.isEmpty ? nil : query
            
            let list = try await NetworkManager.shared.fetchHackathons(
                limit: explorePageSize,
                offset: offset,
                search: searchParam,
                track: nil
            )
            
            if exploreCurrentPage == 1 {
                self.exploreHackathons = list
            } else {
                self.exploreHackathons.append(contentsOf: list)
            }
            self.exploreHasMore = list.count == explorePageSize
        } catch {
            print("Failed to load explore hackathons: \(error)")
        }
    }
    
    func loadMoreExploreHackathons() async {
        guard exploreHasMore, !isLoadingMoreExplore else { return }
        isLoadingMoreExplore = true
        defer { isLoadingMoreExplore = false }
        exploreCurrentPage += 1
        do {
            let offset = (exploreCurrentPage - 1) * explorePageSize
            let query = exploreSearchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let searchParam = query.isEmpty ? nil : query
            
            let list = try await NetworkManager.shared.fetchHackathons(
                limit: explorePageSize,
                offset: offset,
                search: searchParam,
                track: nil
            )
            self.exploreHackathons.append(contentsOf: list)
            self.exploreHasMore = list.count == explorePageSize
        } catch {
            print("Failed to load more explore hackathons: \(error)")
            exploreCurrentPage -= 1
        }
    }
    
    private var exploreSearchTask: Task<Void, Never>?
    
    func updateExploreSearch(_ search: String) {
        exploreSearchText = search
        exploreCurrentPage = 1
        exploreHackathons = []
        
        exploreSearchTask?.cancel()
        exploreSearchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce
            if Task.isCancelled { return }
            await loadExploreHackathons()
        }
    }
    
    // MARK: - Public Teams Pagination
    func loadPublicTeams() async {
        guard let hackathonId = selectedHackathon?.id else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let offset = (publicTeamsCurrentPage - 1) * publicTeamsPageSize
            let query = publicTeamsSearchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let searchParam = query.isEmpty ? nil : query
            
            let teams = try await NetworkManager.shared.fetchPublicTeams(
                for: hackathonId,
                limit: publicTeamsPageSize,
                offset: offset,
                search: searchParam
            )
            self.publicTeams = teams
            self.publicTeamsHasMore = teams.count == publicTeamsPageSize
        } catch {
            print("Failed to load public teams: \(error)")
        }
    }
    
    private var publicTeamsSearchTask: Task<Void, Never>?
    
    func updateTeamSearch(_ search: String) {
        publicTeamsSearchText = search
        publicTeamsCurrentPage = 1
        
        publicTeamsSearchTask?.cancel()
        publicTeamsSearchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce
            if Task.isCancelled { return }
            await loadPublicTeams()
        }
    }
}
