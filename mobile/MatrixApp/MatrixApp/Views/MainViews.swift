import SwiftUI

enum AuthScreen {
	case login, register, forgot
}

struct RegisterView: View {
@Binding var screen: AuthScreen
@EnvironmentObject var vm: AppViewModel
@State private var name=""
@State private var email=""
@State private var password=""
@State private var confirmPassword=""
@State private var validationError: String?
@State private var showPassword = false

var body: some View {
ScrollView {
VStack(spacing: 24) {
Text("Create Account")
.font(.system(size: 32, weight: .bold))

Text("Join hackathons, build teams and manage your portfolio.")
.multilineTextAlignment(.center)
.foregroundColor(.secondary)

VStack(spacing: 14) {
if let error = vm.authError {
Text(error)
.foregroundStyle(.red)
}

TextField("Full Name", text:$name)
TextField("Email", text:$email)

Group {
if showPassword {
TextField("Password", text:$password)
TextField("Confirm Password", text:$confirmPassword)
} else {
SecureField("Password", text:$password)
SecureField("Confirm Password", text:$confirmPassword)
}
}

Toggle("Show Passwords", isOn: $showPassword)
}
.textFieldStyle(.roundedBorder)

Button {
validationError = nil
if let error = vm.validateRegistration(name: name, email: email, password: password, confirmPassword: confirmPassword) {
validationError = error
return
}
Task { await vm.register(name:name,email:email,password:password) }
} label: {
if vm.isLoading { ProgressView() } else { Text("Create Account") }
}
.buttonStyle(.borderedProminent)

if let validationError {
Text(validationError)
.foregroundStyle(.red)
}

Button("Already have an account? Sign In") {
screen = .login
}
}
.padding(28)
.background(.white)
.clipShape(RoundedRectangle(cornerRadius: 28))
.shadow(color: .black.opacity(0.08), radius: 25)
.padding()
}
}
}

struct ForgotPasswordView: View {
@Binding var screen: AuthScreen
@EnvironmentObject var vm: AppViewModel
@State private var email = ""

var body: some View {
NavigationStack {
Form {
Section {
Text("Enter your email and we'll send reset instructions.")
}

Section {
TextField("Email", text: $email)
}

if let message = vm.authMessage {
Section { Text(message).foregroundStyle(.green) }
}

Button("Send Reset Link") {
guard vm.isValidEmail(email) else {
	vm.authError = "Enter a valid email address"
	return
}
Task { await vm.forgotPassword(email: email) }
}
}
.navigationTitle("Reset Password")
.toolbar {
Button("Back") { screen = .login }
}
}
}
}


struct DashboardView: View {
var body: some View {
TabView {
HomeDashboardView()
 .tabItem { Label("Home", systemImage: "house.fill") }

HackathonsView()
 .tabItem { Label("Hackathons", systemImage: "trophy.fill") }

TeamView()
 .tabItem { Label("Team", systemImage: "person.3.fill") }

ProfileView()
 .tabItem { Label("Profile", systemImage: "person.crop.circle") }
}
}
}

struct HomeDashboardView: View {
@EnvironmentObject var vm: AppViewModel
@State private var showNotifications = false

private var profileCompletion: Double {
var score = 0.0
let profile = vm.currentProfile
if !(profile?.name ?? "").isEmpty { score += 1 }
if !(profile?.email ?? "").isEmpty { score += 1 }
if !(profile?.bio ?? "").isEmpty { score += 1 }
if !(profile?.github_url ?? "").isEmpty { score += 1 }
if !(profile?.linkedin_url ?? "").isEmpty { score += 1 }
if !(profile?.skills?.isEmpty ?? true) { score += 1 }
return score / 6.0
}

var body: some View {
NavigationStack {
ScrollView {
VStack(spacing: 20) {

VStack(alignment: .leading, spacing: 8) {
Text("Welcome Back")
.font(.largeTitle.bold())

Text(vm.currentProfile?.name ?? "Hacker")
.font(.title2)
.foregroundStyle(.secondary)

Label("Hacker Dashboard", systemImage: "sparkles")
	.font(.subheadline.weight(.medium))
	.foregroundStyle(.blue)
}
.frame(maxWidth: .infinity, alignment: .leading)

RoundedRectangle(cornerRadius: 24)
.fill(.blue.gradient)
.frame(height: 180)
.overlay(alignment: .leading) {
HStack {
VStack(alignment: .leading, spacing: 12) {
Text("Profile Completion")
Text("\(Int(profileCompletion * 100))%")
.font(.system(size: 44, weight: .bold))
Text("Complete your profile to unlock more hackathons")
}

Spacer()

ProgressRingView(progress: profileCompletion)
}
.foregroundStyle(.white)
.padding()
}

HStack {
DashboardMetric(title: "Applications", value: vm.registrationStatus == nil ? "0" : "1")
DashboardMetric(title: "Hackathons", value: "\(vm.hackathons.count)")
}

DashboardMetric(title: "Skills Added", value: "\(vm.currentProfile?.skills?.count ?? 0)")

DashboardStatusCard(
title: "Profile Status",
status: profileCompletion > 0.8 ? "Ready" : "Needs Attention",
color: profileCompletion > 0.8 ? .green : .orange
)

DashboardInsightCard(
title: "Next Best Action",
message: profileCompletion < 1
? "Complete your profile to improve application readiness."
: (vm.hackathons.isEmpty
? "New hackathons will appear here when available."
: "Browse available hackathons and start applying.")
)

DashboardTeamCard(team: vm.activeHackathonTeam)

RegistrationStatusCard(status: vm.registrationStatus?.approval_status)

VStack(alignment: .leading, spacing: 12) {
Text("Your Journey")
.font(.headline)

JourneyTimelineCard(title: "Profile Completed", subtitle: "Ready for applications", icon: "checkmark.seal.fill", color: .green)
JourneyTimelineCard(title: "Team Matching", subtitle: "Find teammates for upcoming events", icon: "person.3.fill", color: .blue)
JourneyTimelineCard(title: "Submit Projects", subtitle: "Track active hackathon submissions", icon: "paperplane.fill", color: .orange)
}

VStack(alignment: .leading) {
Text("Upcoming Events")
.font(.headline)

if vm.hackathons.isEmpty {
DashboardEventCard(title: "No Active Events", subtitle: "Pull to refresh for latest hackathons")
} else {
ForEach(Array(vm.hackathons.prefix(2))) { hackathon in
DashboardEventCard(title: hackathon.title, subtitle: "Open for registration")
}
}
}

VStack(alignment: .leading, spacing: 12) {
Text("Announcements")
.font(.headline)

if vm.announcements.isEmpty {
AnnouncementCard(
title: "No Announcements",
message: "Hackathon broadcasts and updates will appear here."
)
} else {
ForEach(vm.announcements) { announcement in
AnnouncementCard(
title: "Hackathon Update",
message: announcement.message
)
}
}
}

VStack(alignment: .leading, spacing: 12) {
Text("Featured Hackathons")
.font(.headline)

ScrollView(.horizontal, showsIndicators: false) {
HStack {
ForEach(Array(vm.hackathons.prefix(5))) { hackathon in
FeaturedHackathonCard(title: hackathon.title)
}

if vm.hackathons.isEmpty {
FeaturedHackathonCard(title: "Discover New Events")
}
}
}
}

VStack(alignment: .leading, spacing: 12) {
Text("Recent Activity")
.font(.headline)

ActivityRow(icon: "person.crop.circle.badge.checkmark", text: "Profile synced")
ActivityRow(icon: "sparkles", text: "\(vm.hackathons.count) hackathons available")
ActivityRow(icon: "link", text: "Keep GitHub and LinkedIn updated")
}

VStack(alignment: .leading) {
Text("Quick Actions")
.font(.headline)

LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
QuickActionCard(
title: "Profile",
icon: "person.crop.circle.badge.checkmark",
color: .blue
)

QuickActionCard(
title: profileCompletion < 1 ? "Complete Profile" : "Profile Ready",
icon: profileCompletion < 1 ? "exclamationmark.circle.fill" : "checkmark.circle.fill",
color: profileCompletion < 1 ? .orange : .green
)

QuickActionCard(
title: "Teams",
icon: "person.3.sequence.fill",
color: .green
)

QuickActionCard(
title: "Events",
icon: "sparkles",
color: .orange
)

QuickActionCard(
title: "Inbox",
icon: "bell.badge.fill",
color: .purple
)
}
}
 .frame(maxWidth: .infinity, alignment: .leading)
}
.padding()
}
.refreshable {
await vm.loadCurrentProfile()
await vm.loadHackathons()
await vm.loadAnnouncements()
await vm.loadMyTeam()
await vm.loadRegistrationStatus()
}
.task {
await vm.loadCurrentProfile()
await vm.loadHackathons()
await vm.loadAnnouncements()
await vm.loadMyTeam()
await vm.loadRegistrationStatus()
}
.navigationTitle("Matrix")
.toolbar {
ToolbarItem(placement: .topBarTrailing) {
Button {
showNotifications = true
} label: {
Image(systemName: "bell.badge")
}
}
}
.sheet(isPresented: $showNotifications) {
NotificationCenterView()
}
}
}
}

struct EmptyStateCard: View {
let title: String
let icon: String
let message: String

var body: some View {
MatrixCard {
VStack(spacing: 12) {
Image(systemName: icon)
	.font(.system(size: 40))
	.foregroundStyle(.secondary)

Text(title)
	.font(.headline)

Text(message)
	.font(.subheadline)
	.foregroundStyle(.secondary)
	.multilineTextAlignment(.center)
}
.frame(maxWidth: .infinity)
}
}
}

struct ProgressRingView: View {
let progress: Double

var body: some View {
ZStack {
Circle().stroke(.white.opacity(0.25), lineWidth: 8)
Circle()
.trim(from: 0, to: progress)
.stroke(.white, style: StrokeStyle(lineWidth: 8, lineCap: .round))
.rotationEffect(.degrees(-90))
}
.frame(width: 64, height: 64)
}
}

struct FeaturedHackathonCard: View {
let title: String

var body: some View {
RoundedRectangle(cornerRadius: 22)
.fill(.purple.gradient)
.frame(width: 220, height: 120)
.overlay(alignment: .bottomLeading) {
Text(title)
.foregroundStyle(.white)
.font(.headline)
.padding()
}
}
}

struct DashboardMetric: View {
let title: String
let value: String
var body: some View {
VStack {
Text(value).font(.title.bold())
Text(title).foregroundStyle(.secondary)
}
.frame(maxWidth: .infinity)
.padding()
.background(.regularMaterial)
.clipShape(RoundedRectangle(cornerRadius: 20))
}
}

struct DashboardEventCard: View {
let title: String
let subtitle: String
var body: some View {
VStack(alignment: .leading, spacing: 6) {
Text(title).font(.headline)
Text(subtitle).foregroundStyle(.secondary)
}
.frame(maxWidth: .infinity, alignment: .leading)
.padding()
.background(.regularMaterial)
.clipShape(RoundedRectangle(cornerRadius: 20))
}
}

struct AnnouncementCard: View {
let title: String
let message: String

var body: some View {
MatrixCard {
Text(title).font(.headline)
Text(message).foregroundStyle(.secondary)
}
}
}

struct ActivityRow: View {
let icon: String
let text: String

var body: some View {
HStack {
Image(systemName: icon)
Text(text)
Spacer()
}
.padding()
.background(.regularMaterial)
.clipShape(RoundedRectangle(cornerRadius: 16))
}
}

struct QuickActionCard: View {
let title: String
let icon: String
let color: Color

var body: some View {
MatrixCard {
HStack {
ZStack {
Circle()
	.fill(color.opacity(0.15))
	.frame(width: 44, height: 44)

Image(systemName: icon)
	.foregroundStyle(color)
}

VStack(alignment: .leading) {
	Text(title)
		.font(.headline)
	Text("Open")
		.font(.caption)
		.foregroundStyle(.secondary)
}

Spacer()

Image(systemName: "chevron.right")
	.foregroundStyle(.tertiary)
}
}
}
}

struct JourneyTimelineCard: View {
let title: String
let subtitle: String
let icon: String
let color: Color

var body: some View {
HStack(spacing: 14) {
Image(systemName: icon)
.font(.title3)
.foregroundStyle(.white)
.frame(width: 42, height: 42)
.background(color)
.clipShape(Circle())

VStack(alignment: .leading, spacing: 4) {
Text(title)
.font(.headline)
Text(subtitle)
.font(.subheadline)
.foregroundStyle(.secondary)
}

Spacer()

Image(systemName: "chevron.right")
.foregroundStyle(.tertiary)
}
.padding()
.background(.regularMaterial)
.clipShape(RoundedRectangle(cornerRadius: 20))
}
}

struct DashboardStatusCard: View {
let title: String
let status: String
let color: Color

var body: some View {
HStack {
VStack(alignment: .leading, spacing: 4) {
Text(title)
.foregroundStyle(.secondary)
Text(status)
.font(.headline)
}

Spacer()

Circle()
.fill(color)
.frame(width: 12, height: 12)
}
.padding()
.background(.regularMaterial)
.clipShape(RoundedRectangle(cornerRadius: 20))
}
}

struct DashboardInsightCard: View {
let title: String
let message: String

var body: some View {
VStack(alignment: .leading, spacing: 8) {
Label(title, systemImage: "brain.head.profile")
.font(.headline)

Text(message)
.foregroundStyle(.secondary)
}
.frame(maxWidth: .infinity, alignment: .leading)
.padding()
.background(.thinMaterial)
.clipShape(RoundedRectangle(cornerRadius: 22))
}
}

struct DashboardTeamCard: View {
let team: TeamStatus?

var body: some View {
VStack(alignment: .leading, spacing: 8) {
Label("Team Status", systemImage: "person.3.fill")
	.font(.headline)

if let team {
Text(team.team_name)
	.font(.title3.bold())

Text("Members: \(team.members?.count ?? 0)")
	.foregroundStyle(.secondary)

if let inviteCode = team.invite_code {
Text("Invite: \(inviteCode)")
	.font(.caption)
	.foregroundStyle(.secondary)
}

Label(team.is_submitted == true ? "Project Submitted" : "Submission Pending",
	  systemImage: team.is_submitted == true ? "checkmark.circle.fill" : "clock.fill")
} else {
Text("No Active Team")
	.font(.headline)

Text("Create or join a team for your next hackathon.")
	.foregroundStyle(.secondary)
}
}
.frame(maxWidth: .infinity, alignment: .leading)
.padding()
.background(.regularMaterial)
.clipShape(RoundedRectangle(cornerRadius: 22))
}
}

struct RegistrationStatusCard: View {
let status: String?

private var displayStatus: String {
status ?? "Not Applied"
}

private var statusColor: Color {
switch displayStatus {
case "Accepted": return .green
case "Pending": return .orange
case "Rejected": return .red
default: return .blue
}
}

var body: some View {
VStack(alignment: .leading, spacing: 8) {
Label("Application Status", systemImage: "doc.badge.clock")
	.font(.headline)

StatusBadge(title: displayStatus, color: statusColor)

Text(statusDescription)
	.font(.subheadline)
	.foregroundStyle(.secondary)
}
.frame(maxWidth: .infinity, alignment: .leading)
.padding()
.background(.regularMaterial)
.clipShape(RoundedRectangle(cornerRadius: 22))
}

private var statusDescription: String {
switch displayStatus {
case "Accepted": return "You are approved and can participate."
case "Pending": return "Your application is awaiting review."
case "Rejected": return "Review feedback may be available later."
default: return "Apply to join this hackathon."
}
}
}

struct StatusBadge: View {
let title: String
let color: Color

var body: some View {
Text(title)
	.font(.subheadline.weight(.semibold))
	.foregroundStyle(color)
	.padding(.horizontal, 12)
	.padding(.vertical, 8)
	.background(color.opacity(0.15))
	.clipShape(Capsule())
}
}

struct MatrixCard<Content: View>: View {
@ViewBuilder let content: Content

var body: some View {
	VStack(alignment: .leading, spacing: 12) {
		content
	}
	.frame(maxWidth: .infinity, alignment: .leading)
	.padding()
	.background(.regularMaterial)
	.clipShape(RoundedRectangle(cornerRadius: 22))
}
}

struct SectionHeader: View {
	let title: String
	let subtitle: String?

	var body: some View {
		VStack(alignment: .leading, spacing: 4) {
			Text(title)
				.font(.headline)

			if let subtitle {
				Text(subtitle)
					.font(.subheadline)
					.foregroundStyle(.secondary)
			}
		}
	}
}

struct DashboardStatCard: View {
	let title: String
	let value: String
	let color: Color
	var body: some View {
		VStack(alignment: .leading) {
			Text(value).font(.title.bold()).foregroundColor(.white)
			Text(title).foregroundColor(.gray)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding()
		.background(color.opacity(0.15))
		.clipShape(RoundedRectangle(cornerRadius: 18))
	}
}

struct EventRow: View {
	let title: String
	let date: String
	var body: some View {
		HStack {
			VStack(alignment: .leading) {
				Text(title).foregroundColor(.white)
				Text(date).foregroundColor(.gray)
			}
			Spacer()
		}
	}
}

struct DrawerMenuView: View {
	var body: some View {
		NavigationStack {
			List {
				Label("Dashboard", systemImage: "square.grid.2x2")
				Label("Profile", systemImage: "person.crop.circle")
				Label("Hackathons", systemImage: "trophy")
				Label("Teams", systemImage: "person.3")
			}
			.navigationTitle("Matrix")
		}
	}

	struct ResponsiveShellView<Content: View>: View {
		let content: Content

		init(@ViewBuilder content: () -> Content) {
			self.content = content()
		}

		var body: some View {
			NavigationSplitView {
				List {
					Label("Dashboard", systemImage: "square.grid.2x2")
					Label("Profile", systemImage: "person.crop.circle")
					Label("Hackathons", systemImage: "trophy")
					Label("Teams", systemImage: "person.3")
				}
				.navigationTitle("Matrix")
			} detail: {
				content
			}
		}
	}
}

struct HackathonsView: View {
@EnvironmentObject var vm: AppViewModel

var body: some View {
NavigationStack {
List {
ForEach(vm.hackathons) { h in
NavigationLink(destination: HackathonDetailView(hackathon: h)) {
VStack(alignment: .leading, spacing: 4) {
Text(h.title)
.font(.headline)
Text(h.description)
.lineLimit(2)
.foregroundStyle(.secondary)
}
}
}
}
.searchable(text: .constant(""))
.refreshable {
await vm.loadHackathons()
}
.task {
await vm.loadHackathons()
}
.navigationTitle("Hackathons")
}
}
}

struct HackathonDetailView: View {
let hackathon: Hackathon
@EnvironmentObject var vm: AppViewModel
@State private var showApplySheet = false

var body: some View {
ScrollView {
VStack(alignment: .leading, spacing: 20) {
HackathonHeroCard(title: hackathon.title)

MatrixCard {
SectionHeader(
title: hackathon.title,
subtitle: "Hackathon Overview"
)

Text(hackathon.description)
}

RegistrationStatusCard(status: vm.registrationStatus?.approval_status)

if let team = vm.activeHackathonTeam,
   team.hackathon_id == hackathon.id {
MatrixCard {
Label(team.team_name, systemImage: "person.3.fill")
	.font(.headline)

if let inviteCode = team.invite_code {
	Text("Invite Code: \(inviteCode)")
		.font(.subheadline)
}

StatusBadge(
	title: team.is_submitted == true ? "Submitted" : "Submission Pending",
	color: team.is_submitted == true ? .green : .orange
)
}
}

Button("Apply to Hackathon") {
showApplySheet = true
}
.buttonStyle(.borderedProminent)

HStack {
ActionPill(title: "Rules", icon: "doc.text")
ActionPill(title: "Timeline", icon: "calendar")
ActionPill(title: "Prizes", icon: "trophy")
}

if !vm.announcements.isEmpty {
MatrixCard {
SectionHeader(title: "Announcements", subtitle: "Latest updates")

ForEach(Array(vm.announcements.prefix(3)), id: \.message) { announcement in
	AnnouncementCard(
		title: "Announcement",
		message: announcement.message
	)
}
}
}

HackathonTeamSection(hackathonId: hackathon.id)
}
.padding()
}
.sheet(isPresented: $showApplySheet) {
HackathonApplicationView(hackathonId: hackathon.id)
}
}
}

struct HackathonHeroCard: View {
let title: String

var body: some View {
RoundedRectangle(cornerRadius: 28)
.fill(.indigo.gradient)
.frame(height: 180)
.overlay(alignment: .bottomLeading) {
VStack(alignment: .leading) {
Text("Featured Event")
.font(.caption.weight(.semibold))

Text(title)
.font(.title.bold())
}
.foregroundStyle(.white)
.padding()
}
}
}

struct HackathonTeamSection: View {
let hackathonId: Int
@EnvironmentObject var vm: AppViewModel
@State private var showCreateTeam = false
@State private var showJoinTeam = false
@State private var showSubmission = false

var body: some View {
VStack(alignment: .leading, spacing: 12) {
Text("Team for This Hackathon")
.font(.headline)

HStack {
Image(systemName: "person.3.fill")
	.foregroundStyle(.blue)

VStack(alignment: .leading) {
	Text("Build With Others")
		.font(.subheadline.weight(.semibold))
	Text("Create, join and manage your hackathon team")
		.font(.caption)
		.foregroundStyle(.secondary)
}

Spacer()
}

TeamMembersPreviewCard(members: vm.activeHackathonTeam?.members ?? [])

Button("Create Team") { showCreateTeam = true }
.buttonStyle(.borderedProminent)

Button("Join via Invite Code") { showJoinTeam = true }
.buttonStyle(.bordered)

Button("Browse Teams") {}
.buttonStyle(.bordered)

Button("Submit Project") { showSubmission = true }
.buttonStyle(.borderedProminent)
}
.frame(maxWidth: .infinity, alignment: .leading)
.padding()
.background(.regularMaterial)
.clipShape(RoundedRectangle(cornerRadius: 22))

.sheet(isPresented: $showCreateTeam) {
CreateTeamView(hackathonId: hackathonId)
}
.sheet(isPresented: $showJoinTeam) {
JoinTeamView(hackathonId: hackathonId)
}
.sheet(isPresented: $showSubmission) {
ProjectSubmissionView(hackathonId: hackathonId)
}
}

struct TeamMembersPreviewCard: View {
let members: [TeamMember]

var body: some View {
VStack(alignment: .leading, spacing: 8) {
Text("Team Members")
	.font(.subheadline.weight(.semibold))

if members.isEmpty {
ContentUnavailableView(
	"No Team Loaded",
	systemImage: "person.crop.circle.badge.questionmark",
	description: Text("Member information will appear here after team sync.")
)
} else {
ForEach(members) { member in
	HStack {
		Image(systemName: "person.crop.circle.fill")
			.foregroundStyle(.blue)

		VStack(alignment: .leading) {
			Text(member.name)
				.font(.headline)
			Text(member.email)
				.font(.caption)
				.foregroundStyle(.secondary)
		}
	}
}
}
}
.padding()
.background(.thinMaterial)
.clipShape(RoundedRectangle(cornerRadius: 18))
}
}
}

struct ProjectSubmissionView: View {
@Environment(\.dismiss) private var dismiss
@EnvironmentObject var vm: AppViewModel
let hackathonId: Int
@State private var repositoryURL = ""
@State private var errorMessage: String?

var body: some View {
NavigationStack {
Form {
if let errorMessage {
Text(errorMessage).foregroundStyle(.red)
}

TextField("Repository URL", text: $repositoryURL)
}
.navigationTitle("Submit Project")
.safeAreaInset(edge: .bottom) {
Button("Submit Repository") {
Task {
do {
try await NetworkManager.shared.submitProject(
hackathonId: hackathonId,
repositoryURL: repositoryURL
)
await vm.loadMyTeam()
dismiss()
} catch {
errorMessage = "Submission failed"
}
}
}
.buttonStyle(.borderedProminent)
}
}
}
}

struct CreateTeamView: View {
@Environment(\.dismiss) private var dismiss
@EnvironmentObject var vm: AppViewModel
let hackathonId: Int
@State private var teamName = ""
@State private var errorMessage: String?

var body: some View {
NavigationStack {
Form {
if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
TextField("Team Name", text: $teamName)
}
.navigationTitle("Create Team")
.toolbar {
ToolbarItem(placement: .topBarTrailing) {
Button("Done") { dismiss() }

}
}

.safeAreaInset(edge: .bottom) {
Button("Create Team") {
Task {
do {
try await NetworkManager.shared.createTeam(hackathonId: hackathonId, teamName: teamName)
await vm.loadMyTeam()
dismiss()
} catch {
errorMessage = "Failed to create team"
}
}
}
.buttonStyle(.borderedProminent)
}
}
}
}

struct JoinTeamView: View {
@Environment(\.dismiss) private var dismiss
@EnvironmentObject var vm: AppViewModel
let hackathonId: Int
@State private var inviteCode = ""
@State private var errorMessage: String?

var body: some View {
NavigationStack {
Form {
if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
TextField("Invite Code", text: $inviteCode)
}
.navigationTitle("Join Team")
.toolbar {
ToolbarItem(placement: .topBarTrailing) {
Button("Join") { dismiss() }
}
}

.safeAreaInset(edge: .bottom) {
Button("Join Team") {
Task {
do {
try await NetworkManager.shared.joinTeam(hackathonId: hackathonId, inviteCode: inviteCode)
await vm.loadMyTeam()
dismiss()
} catch {
errorMessage = "Failed to join team"
}
}
}
.buttonStyle(.borderedProminent)
}
}
}
}

struct ActionPill: View {
let title: String
let icon: String

var body: some View {
Label(title, systemImage: icon)
.font(.caption.weight(.medium))
.padding(.horizontal, 12)
.padding(.vertical, 8)
.background(.regularMaterial)
.clipShape(Capsule())
}
}

struct HackathonApplicationView: View {
@Environment(\.dismiss) private var dismiss
let hackathonId: Int
@State private var github = ""
@State private var linkedin = ""
@State private var skills = ""
@State private var teamPreference = "JoinTeam"
@State private var isSubmitting = false
@State private var errorMessage: String?

var body: some View {
NavigationStack {
Form {
if let errorMessage {
Text(errorMessage)
	.foregroundStyle(.red)
}

TextField("GitHub URL", text: $github)
TextField("LinkedIn URL", text: $linkedin)
TextField("Skills", text: $skills)

Picker("Team Preference", selection: $teamPreference) {
Text("Join Team").tag("JoinTeam")
Text("Create Team").tag("CreateTeam")
Text("Solo").tag("Solo")
}
}
.navigationTitle("Hackathon Application")
.toolbar {
ToolbarItem(placement: .topBarLeading) {
Button("Cancel") { dismiss() }
}
ToolbarItem(placement: .topBarTrailing) {
Button(isSubmitting ? "Submitting..." : "Submit") {
Task {
await submitApplication()
}
}
disabled(isSubmitting)
}
}
}
}

func submitApplication() async {
isSubmitting = true
defer { isSubmitting = false }

do {
try await NetworkManager.shared.applyToHackathon(
hackathonId: hackathonId,
requestBody: HackathonApplicationRequest(
github_url: github,
linkedin_url: linkedin,
skills: skills.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) },
team_preference: teamPreference
)
)
dismiss()
} catch {
errorMessage = "Unable to submit application"
}
}
}

struct TeamView: View {
var body: some View {
NavigationStack {
ContentUnavailableView(
"Teams Live Inside Hackathons",
systemImage: "person.3.fill",
description: Text("Open a hackathon to create, join, or manage a team.")
)
.navigationTitle("Teams")
}
}
}

struct ProfileView: View {
@EnvironmentObject var vm: AppViewModel
@State private var availableForHackathons = true

var body: some View {
NavigationStack {
Form {
Section {
HStack {
Spacer()
Image(systemName: "person.crop.circle.fill")
.font(.system(size: 72))
.foregroundStyle(.blue)
Spacer()
}
} 

Section("Personal Information") {
TextField("Full Name", text: .constant(vm.currentProfile?.name ?? ""))
TextField("Email", text: .constant(vm.currentProfile?.email ?? ""))
TextField("Location", text: .constant("Singapore"))
}

Section("Education") {
TextField("University", text: .constant(""))
TextField("Degree", text: .constant(""))
}

Section("Links") {
TextField("GitHub", text: .constant(""))
TextField("LinkedIn", text: .constant(""))
}

Section("Preferences") {
Toggle("Available for Hackathons", isOn: $availableForHackathons)
}

Section {
Button(role: .destructive) {
vm.logout()
} label: {
Text("Sign Out")
}
}
}
.navigationTitle("Profile")

.toolbar {
ToolbarItem(placement: .topBarTrailing) {
Button("Save") {
}
}
}
}
}
}
