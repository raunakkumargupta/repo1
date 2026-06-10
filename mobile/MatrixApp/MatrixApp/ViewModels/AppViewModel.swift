import SwiftUI
import Combine

@MainActor
final class AppViewModel: ObservableObject {
 @Published var isLoggedIn = false
 @Published var hackathons:[Hackathon] = []
 @Published var isRegisterMode = false
 @Published var isLoading = false
 @Published var authError: String?
 @Published var authMessage: String?
 @Published var currentProfile: UserProfile?
 @Published var announcements: [Announcement] = []
 @Published var activeHackathonTeam: TeamStatus?
 @Published var registrationStatus: RegistrationStatus?
 func bootstrap(){
	 #if DEBUG
	 KeychainHelper.shared.clear()
	 isLoggedIn = false
	 #else
	 isLoggedIn = KeychainHelper.shared.read() != nil
	 if isLoggedIn {
			Task { await loadCurrentProfile() }
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
	 isLoggedIn = false
 }

 func saveProfile(city: String, bio: String, github: String, linkedin: String, skills: String) async {
	 try? await NetworkManager.shared.updateProfile(
			HackerProfileRequest(
				city: city,
				bio: bio,
				github_url: github,
				linkedin_url: linkedin,
				skills: skills
			)
	 )
	 await loadCurrentProfile()
 }
 func login(email:String,password:String) async {
	isLoading = true
	authError = nil
	defer { isLoading = false }
	do {
		let token = try await NetworkManager.shared.login(email: email, password: password)
		KeychainHelper.shared.save(token)
		isLoggedIn = true
		await loadCurrentProfile()
		await loadHackathons()
		await loadAnnouncements()
		await loadRegistrationStatus()
		await loadMyTeam()
	} catch {
		authError = error.localizedDescription
	}
 }
 func loadHackathons() async { hackathons = (try? await NetworkManager.shared.fetchHackathons()) ?? [] }

 func loadAnnouncements() async {
	guard let firstHackathon = hackathons.first else { return }
	announcements = (try? await NetworkManager.shared.fetchAnnouncements(for: firstHackathon.id)) ?? []
 }

 func loadMyTeam() async {
	guard let firstHackathon = hackathons.first else { return }
	activeHackathonTeam = try? await NetworkManager.shared.fetchMyTeam(for: firstHackathon.id)
 }

 func loadRegistrationStatus() async {
	guard let firstHackathon = hackathons.first else { return }
	registrationStatus = try? await NetworkManager.shared.fetchRegistrationStatus(for: firstHackathon.id)
 }

 func register(name:String,email:String,password:String) async {
	isLoading = true
	authError = nil
	defer { isLoading = false }
	do {
		try await NetworkManager.shared.register(name: name, email: email, password: password)
		await login(email: email, password: password)
	} catch {
		authError = error.localizedDescription
	}
 }

 func forgotPassword(email: String) async {
	do {
		try await NetworkManager.shared.forgotPassword(email: email)
		authMessage = "Password reset email sent if account exists."
	} catch {
		authError = "Unable to process request."
	}
 }

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
