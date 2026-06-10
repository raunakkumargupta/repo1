import SwiftUI

// MARK: - Register View
struct RegisterView: View {
    @Binding var screen: AuthScreen
    @EnvironmentObject var vm: AppViewModel
    
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showPassword = false
    @State private var validationError: String?

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("Join Matrix")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("Register your hacker portfolio and join events.")
                    .font(.subheadline)
                    .foregroundColor(Color.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            VStack(spacing: 16) {
                TextField("Full Name", text: $name)
                    .autocorrectionDisabled()
                    .padding()
                    .background(Color.surfaceVariant.opacity(0.5))
                    .cornerRadius(12)
                
                TextField("Email Address", text: $email)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.none)
                    .padding()
                    .background(Color.surfaceVariant.opacity(0.5))
                    .cornerRadius(12)
                
                Group {
                    if showPassword {
                        TextField("Password", text: $password)
                        TextField("Confirm Password", text: $confirmPassword)
                    } else {
                        SecureField("Password", text: $password)
                        SecureField("Confirm Password", text: $confirmPassword)
                    }
                }
                .padding()
                .background(Color.surfaceVariant.opacity(0.5))
                .cornerRadius(12)
                
                Toggle("Show Passwords", isOn: $showPassword)
                    .font(.footnote)
                    .foregroundColor(Color.textSecondary)
                    .tint(Color.primaryAccent)
                
                if let error = validationError ?? vm.authError {
                    Text(error)
                        .font(.caption.bold())
                        .foregroundColor(.red)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }
                
                Button {
                    validationError = vm.validateRegistration(
                        name: name,
                        email: email,
                        password: password,
                        confirmPassword: confirmPassword
                    )
                    guard validationError == nil else { return }
                    Task {
                        await vm.register(name: name, email: email, password: password)
                    }
                } label: {
                    HStack {
                        if vm.isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Text("Initialize Portfolio")
                                .fontWeight(.bold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.primaryAccent)
                    .foregroundColor(.white)
                    .cornerRadius(14)
                }
                .disabled(vm.isLoading)
            }
            .glassCardStyle()
            
            Button {
                screen = .login
            } label: {
                Text("Already registered? Sign In")
                    .font(.footnote.weight(.semibold))
                    .foregroundColor(Color.primaryAccent)
            }
        }
        .padding(.horizontal, 24)
    }
}

// MARK: - Forgot Password View
struct ForgotPasswordView: View {
    @Binding var screen: AuthScreen
    @EnvironmentObject var vm: AppViewModel
    @State private var email = ""

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("Recover Mission")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("Enter your email address and we'll send reset instructions.")
                    .font(.subheadline)
                    .foregroundColor(Color.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            VStack(spacing: 20) {
                TextField("Email Address", text: $email)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.none)
                    .padding()
                    .background(Color.surfaceVariant.opacity(0.5))
                    .cornerRadius(12)
                
                if let message = vm.authMessage {
                    Text(message)
                        .font(.caption.bold())
                        .foregroundColor(.green)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(8)
                }
                
                if let error = vm.authError {
                    Text(error)
                        .font(.caption.bold())
                        .foregroundColor(.red)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                }
                
                Button {
                    guard vm.isValidEmail(email) else {
                        vm.authError = "Enter a valid email address"
                        return
                    }
                    Task {
                        await vm.forgotPassword(email: email)
                    }
                } label: {
                    HStack {
                        if vm.isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Text("Send Link")
                                .fontWeight(.bold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.primaryAccent)
                    .foregroundColor(.white)
                    .cornerRadius(14)
                }
            }
            .glassCardStyle()
            
            Button {
                screen = .login
            } label: {
                Text("Back to Sign In")
                    .font(.footnote.weight(.semibold))
                    .foregroundColor(Color.primaryAccent)
            }
        }
        .padding(.horizontal, 24)
    }
}

// MARK: - Main Dashboard
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
                .tabItem { Label("Profile", systemImage: "person.crop.circle.fill") }
        }
        .tint(Color.primaryAccent)
    }
}

// MARK: - Home Dashboard View
struct HomeDashboardView: View {
    @EnvironmentObject var vm: AppViewModel
    @State private var showNotifications = false
    
    private var profileCompletion: Double {
        var score = 0.0
        guard let profile = vm.currentProfile else { return 0 }
        if !(profile.name ?? "").isEmpty { score += 1 }
        if !(profile.email ?? "").isEmpty { score += 1 }
        if !(profile.bio ?? "").isEmpty { score += 1 }
        if !(profile.githubUrl ?? "").isEmpty { score += 1 }
        if !(profile.linkedinUrl ?? "").isEmpty { score += 1 }
        if !(profile.skills?.isEmpty ?? true) { score += 1 }
        return score / 6.0
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header Area
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Welcome Back")
                            .font(.system(.title2, design: .rounded).weight(.bold))
                            .foregroundColor(Color.textSecondary)
                        
                        Text(vm.currentProfile?.name ?? "Hacker")
                            .font(.system(.largeTitle, design: .rounded).weight(.black))
                            .foregroundColor(Color.textPrimary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 10)
                    
                    // Profile Completion Ring Card
                    HStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Profile Completion")
                                .font(.headline)
                                .foregroundColor(.white)
                            Text("Sync details to stand out to team organizers.")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.8))
                        }
                        
                        Spacer()
                        
                        ZStack {
                            Circle()
                                .stroke(Color.white.opacity(0.15), lineWidth: 6)
                            Circle()
                                .trim(from: 0, to: profileCompletion)
                                .stroke(Color.white, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                                .rotationEffect(.degrees(-90))
                            
                            Text("\(Int(profileCompletion * 100))%")
                                .font(.system(.subheadline, design: .rounded).bold())
                                .foregroundColor(.white)
                        }
                        .frame(width: 55, height: 55)
                    }
                    .padding()
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.primaryAccent, Color.accentSecondary]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(20)
                    .shadow(color: Color.primaryAccent.opacity(0.25), radius: 8, x: 0, y: 4)

                    // Quick Stats grid
                    HStack(spacing: 12) {
                        DashboardMetricCard(
                            title: "Applications",
                            value: vm.selectedRegistration != nil ? "1" : "0",
                            icon: "doc.text.fill",
                            color: Color.primaryAccent
                        )
                        DashboardMetricCard(
                            title: "Total Events",
                            value: "\(vm.hackathons.count)",
                            icon: "trophy.fill",
                            color: Color.accentSecondary
                        )
                    }
                    
                    // selected hackathon registration status card
                    if let selected = vm.selectedHackathon {
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Active Hackathon Context")
                                .font(.system(.headline, design: .rounded).bold())
                                .foregroundColor(Color.textPrimary)
                            
                            VStack(alignment: .leading, spacing: 12) {
                                Text(selected.title)
                                    .font(.title3.bold())
                                    .foregroundColor(Color.textPrimary)
                                
                                HStack {
                                    Text("Status:")
                                        .foregroundColor(Color.textSecondary)
                                    Spacer()
                                    StatusBadge(status: vm.selectedRegistration?.approvalStatus)
                                }
                            }
                            .glassCardStyle()
                        }
                    }

                    // Journey checklist
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Matrix Launch Checklist")
                            .font(.system(.headline, design: .rounded).bold())
                            .foregroundColor(Color.textPrimary)
                        
                        VStack(spacing: 12) {
                            ChecklistItem(title: "Complete Profile Data", isDone: profileCompletion > 0.8)
                            ChecklistItem(title: "Choose Hackathon", isDone: vm.selectedHackathon != nil)
                            ChecklistItem(title: "Assemble Hacker Team", isDone: vm.selectedTeam != nil)
                        }
                    }
                }
                .padding()
            }
            .matrixBackground()
            .navigationTitle("Command Matrix")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showNotifications = true
                    } label: {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: "bell.fill")
                                .font(.title3)
                                .foregroundColor(Color.textPrimary)
                            
                            if !vm.selectedAnnouncements.isEmpty {
                                Circle()
                                    .fill(Color.red)
                                    .frame(width: 8, height: 8)
                                    .offset(x: 2, y: -2)
                            }
                        }
                    }
                }
            }
            .sheet(isPresented: $showNotifications) {
                NotificationCenterView()
            }
            .refreshable {
                await vm.loadCurrentProfile()
                await vm.loadHackathons()
                if let id = vm.selectedHackathon?.id {
                    await vm.loadSelectedHackathonDetails(id: id)
                }
            }
            .task {
                await vm.loadCurrentProfile()
                await vm.loadHackathons()
                if let id = vm.selectedHackathon?.id {
                    await vm.loadSelectedHackathonDetails(id: id)
                }
            }
        }
    }
}

// MARK: - Hackathons View
struct HackathonsView: View {
    @EnvironmentObject var vm: AppViewModel
    
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    if vm.isLoading && vm.hackathons.isEmpty {
                        ProgressView().tint(.white).padding()
                    } else if vm.hackathons.isEmpty {
                        EmptyStateView(title: "No Events Online", systemImage: "trophy.slash", message: "Check back later for approved hackathon events.")
                    } else {
                        ForEach(vm.hackathons) { hack in
                            NavigationLink(destination: HackathonDetailView(hackathon: hack).onAppear {
                                vm.selectedHackathon = hack
                            }) {
                                HackathonRowCard(hackathon: hack)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }
                .padding()
            }
            .matrixBackground()
            .navigationTitle("Discover Events")
            .refreshable {
                await vm.loadHackathons()
            }
        }
    }
}

struct HackathonRowCard: View {
    let hackathon: Hackathon
    @EnvironmentObject var vm: AppViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Cover Placeholder
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: 14)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.surfaceVariant, Color.surface]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(height: 120)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("ACTIVE ROUND")
                        .font(.system(size: 10).weight(.black))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.primaryAccent)
                        .cornerRadius(6)
                    
                    Text(hackathon.title)
                        .font(.system(.title3, design: .rounded).weight(.black))
                        .lineLimit(1)
                }
                .foregroundColor(.white)
                .padding()
            }
            
            Text(hackathon.description)
                .font(.subheadline)
                .foregroundColor(Color.textSecondary)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
            
            HStack {
                if let tracksStr = hackathon.tracks {
                    Text(tracksStr)
                        .font(.system(size: 11).bold())
                        .foregroundColor(Color.primaryAccent)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(Color.textSecondary)
            }
        }
        .glassCardStyle()
    }
}

// MARK: - Hackathon Detail View
struct HackathonDetailView: View {
    let hackathon: Hackathon
    @EnvironmentObject var vm: AppViewModel
    @State private var showApplySheet = false
    @State private var showMentorTicketSheet = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // hero overview
                ZStack(alignment: .bottomLeading) {
                    RoundedRectangle(cornerRadius: 24)
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.primaryAccent.opacity(0.7), Color.surfaceVariant]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(height: 160)
                        .overlay(
                            RoundedRectangle(cornerRadius: 24)
                                .stroke(Color.white.opacity(0.15), lineWidth: 1)
                        )
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("MISSION FOCUS")
                            .font(.system(size: 10).weight(.black))
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.black.opacity(0.3))
                            .cornerRadius(6)
                        
                        Text(hackathon.title)
                            .font(.system(.title2, design: .rounded).bold())
                            .foregroundColor(.white)
                    }
                    .padding()
                }
                
                // Description card
                VStack(alignment: .leading, spacing: 10) {
                    Text("Problem Statement")
                        .font(.headline)
                        .foregroundColor(Color.textPrimary)
                    Text(hackathon.description)
                        .font(.subheadline)
                        .foregroundColor(Color.textSecondary)
                        .lineSpacing(4)
                }
                .glassCardStyle()
                
                // Apply Section
                VStack(alignment: .leading, spacing: 14) {
                    Text("Event Registration")
                        .font(.headline)
                        .foregroundColor(Color.textPrimary)
                    
                    HStack {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Approval Status")
                                .font(.subheadline)
                                .foregroundColor(Color.textSecondary)
                            StatusBadge(status: vm.selectedRegistration?.approvalStatus)
                        }
                        
                        Spacer()
                        
                        if vm.selectedRegistration == nil {
                            Button {
                                showApplySheet = true
                            } label: {
                                Text("Apply Now")
                                    .fontWeight(.bold)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                                    .background(Color.primaryAccent)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                            }
                        }
                    }
                    .padding()
                    .background(Color.surfaceVariant.opacity(0.4))
                    .cornerRadius(16)
                }
                
                // Announcements panel
                if !vm.selectedAnnouncements.isEmpty {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Broadcast Announcements")
                            .font(.headline)
                            .foregroundColor(Color.textPrimary)
                        
                        ForEach(vm.selectedAnnouncements) { broadcast in
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: "megaphone.fill")
                                    .foregroundColor(Color.primaryAccent)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(broadcast.message)
                                        .font(.subheadline)
                                        .foregroundColor(Color.textPrimary)
                                }
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.surfaceVariant.opacity(0.3))
                            .cornerRadius(12)
                        }
                    }
                }
                
                // Contextual Team Actions inside detail sheet if approved
                if vm.selectedRegistration?.approvalStatus == "Accepted" {
                    HackathonTeamSectionView(hackathonId: hackathon.id)
                }
            }
            .padding()
        }
        .matrixBackground()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if vm.selectedRegistration?.approvalStatus == "Accepted" {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showMentorTicketSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "lifepreserver.fill")
                            Text("Support")
                                .font(.footnote.bold())
                        }
                        .foregroundColor(Color.accentSecondary)
                    }
                }
            }
        }
        .sheet(isPresented: $showApplySheet) {
            HackathonApplicationView(hackathonId: hackathon.id)
                .environmentObject(vm)
        }
        .sheet(isPresented: $showMentorTicketSheet) {
            SubmitTicketView(hackathonId: hackathon.id)
                .environmentObject(vm)
        }
        .refreshable {
            await vm.loadSelectedHackathonDetails(id: hackathon.id)
        }
    }
}

// MARK: - Contextual Team Section View
struct HackathonTeamSectionView: View {
    let hackathonId: String
    @EnvironmentObject var vm: AppViewModel
    
    @State private var showCreateTeam = false
    @State private var showJoinTeam = false
    @State private var showSubmission = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Hacker Team Control")
                .font(.headline)
                .foregroundColor(Color.textPrimary)
            
            if let activeTeam = vm.selectedTeam {
                // Team is active
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "person.3.fill")
                            .foregroundColor(Color.accentSecondary)
                        Text(activeTeam.team.teamName)
                            .font(.title3.bold())
                            .foregroundColor(Color.textPrimary)
                    }
                    
                    Text("Invite Code: \(activeTeam.team.inviteCode)")
                        .font(.caption.bold())
                        .foregroundColor(Color.primaryAccent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.primaryAccent.opacity(0.12))
                        .cornerRadius(6)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Team Members:")
                            .font(.subheadline.bold())
                            .foregroundColor(Color.textSecondary)
                        
                        ForEach(activeTeam.members) { member in
                            HStack {
                                Image(systemName: "person.crop.circle.fill")
                                    .foregroundColor(Color.textSecondary)
                                Text(member.name)
                                    .font(.subheadline)
                                    .foregroundColor(Color.textPrimary)
                                Spacer()
                                if member.role != nil {
                                    Text(member.role ?? "")
                                        .font(.caption.bold())
                                        .foregroundColor(Color.textSecondary)
                                }
                            }
                        }
                    }
                    .padding(.top, 6)
                    
                    Divider().background(Color.white.opacity(0.1))
                    
                    // Submission Status
                    HStack {
                        if activeTeam.team.isSubmitted {
                            Label("Project Submitted", systemImage: "checkmark.circle.fill")
                                .foregroundColor(Color.accentSecondary)
                                .font(.subheadline.bold())
                        } else {
                            Label("Submission Pending", systemImage: "clock.fill")
                                .foregroundColor(.orange)
                                .font(.subheadline.bold())
                            Spacer()
                            Button("Submit Repository") {
                                showSubmission = true
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Color.primaryAccent)
                        }
                    }
                }
                .glassCardStyle()
            } else {
                // No Team yet
                VStack(spacing: 16) {
                    Text("Assemble your squad to start compiling submissions.")
                        .font(.subheadline)
                        .foregroundColor(Color.textSecondary)
                        .multilineTextAlignment(.center)
                    
                    HStack(spacing: 12) {
                        Button {
                            showCreateTeam = true
                        } label: {
                            Text("Create Team")
                                .font(.subheadline.bold())
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.primaryAccent)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                        
                        Button {
                            showJoinTeam = true
                        } label: {
                            Text("Join Team")
                                .font(.subheadline.bold())
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.surfaceVariant)
                                .foregroundColor(Color.textPrimary)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                )
                        }
                    }
                }
                .glassCardStyle()
            }
        }
        .sheet(isPresented: $showCreateTeam) {
            CreateTeamView(hackathonId: hackathonId)
                .environmentObject(vm)
        }
        .sheet(isPresented: $showJoinTeam) {
            JoinTeamView(hackathonId: hackathonId)
                .environmentObject(vm)
        }
        .sheet(isPresented: $showSubmission) {
            ProjectSubmissionView(hackathonId: hackathonId)
                .environmentObject(vm)
        }
    }
}

// MARK: - Hackathon Application Sheet
struct HackathonApplicationView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var vm: AppViewModel
    let hackathonId: String
    
    @State private var github = ""
    @State private var linkedin = ""
    @State private var skills = ""
    @State private var teamPreference = "JoinTeam"
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Developer Profiles") {
                    TextField("GitHub Profile URL", text: $github)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.none)
                    
                    TextField("LinkedIn Profile URL", text: $linkedin)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.none)
                }
                
                Section("Core Skills") {
                    TextField("Skills (comma-separated, e.g. iOS, Swift)", text: $skills)
                        .autocorrectionDisabled()
                }
                
                Section("Team Formation Preference") {
                    Picker("Preference", selection: $teamPreference) {
                        Text("Looking for a Team").tag("JoinTeam")
                        Text("Creating a Team").tag("CreateTeam")
                        Text("Competing Solo").tag("Solo")
                    }
                    .pickerStyle(.menu)
                }
                
                if let errorMessage {
                    Section {
                        Text(errorMessage).foregroundColor(.red).bold()
                    }
                }
            }
            .navigationTitle("Hacker Application")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isSubmitting ? "Submitting..." : "Apply") {
                        Task { await submitApplication() }
                    }
                    .disabled(isSubmitting || github.isEmpty || linkedin.isEmpty)
                }
            }
        }
    }
    
    private func submitApplication() async {
        isSubmitting = true
        defer { isSubmitting = false }
        errorMessage = nil
        do {
            let parsedSkills = skills.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
            try await NetworkManager.shared.applyToHackathon(
                hackathonId: hackathonId,
                requestBody: HackathonApplicationRequest(
                    githubUrl: github,
                    linkedinUrl: linkedin,
                    skills: parsedSkills,
                    teamPreference: teamPreference
                )
            )
            await vm.refreshSelectedHackathon()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Create Team View
struct CreateTeamView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var vm: AppViewModel
    let hackathonId: String
    
    @State private var teamName = ""
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            Form {
                TextField("Team Name", text: $teamName)
                    .autocorrectionDisabled()
                
                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red).font(.footnote)
                }
            }
            .navigationTitle("Initialize Team")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isLoading ? "Creating..." : "Create") {
                        Task { await performCreate() }
                    }
                    .disabled(teamName.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
                }
            }
        }
    }
    
    private func performCreate() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            try await NetworkManager.shared.createTeam(hackathonId: hackathonId, teamName: teamName)
            await vm.refreshSelectedHackathon()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Join Team View
struct JoinTeamView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var vm: AppViewModel
    let hackathonId: String
    
    @State private var inviteCode = ""
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            Form {
                TextField("Invite Code (e.g. AB-1234)", text: $inviteCode)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)
                
                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red).font(.footnote)
                }
            }
            .navigationTitle("Join Hacker Team")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isLoading ? "Joining..." : "Join") {
                        Task { await performJoin() }
                    }
                    .disabled(inviteCode.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
                }
            }
        }
    }
    
    private func performJoin() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            try await NetworkManager.shared.joinTeam(hackathonId: hackathonId, inviteCode: inviteCode)
            await vm.refreshSelectedHackathon()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Project Submission View
struct ProjectSubmissionView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var vm: AppViewModel
    let hackathonId: String
    
    @State private var repositoryURL = ""
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            Form {
                TextField("Repository URL (GitHub/GitLab)", text: $repositoryURL)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.none)
                
                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red).font(.footnote)
                }
            }
            .navigationTitle("Submit Repository")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isLoading ? "Submitting..." : "Submit") {
                        Task { await performSubmit() }
                    }
                    .disabled(repositoryURL.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
                }
            }
        }
    }
    
    private func performSubmit() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            try await NetworkManager.shared.submitProject(hackathonId: hackathonId, repositoryURL: repositoryURL)
            await vm.refreshSelectedHackathon()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Submit Support Ticket View
struct SubmitTicketView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var vm: AppViewModel
    let hackathonId: String
    
    @State private var description = ""
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Mentoring Assistance Request") {
                    TextEditor(text: $description)
                        .frame(height: 120)
                        .overlay(
                            Group {
                                if description.isEmpty {
                                    Text("Describe your technical issue details...")
                                        .foregroundColor(Color.textSecondary)
                                        .padding(.leading, 5)
                                        .padding(.top, 8)
                                }
                            },
                            alignment: .topLeading
                        )
                }
                
                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red).font(.footnote)
                }
            }
            .navigationTitle("Request Technical Support")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isLoading ? "Routing..." : "Request") {
                        Task { await performRequest() }
                    }
                    .disabled(description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)
                }
            }
        }
    }
    
    private func performRequest() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            try await NetworkManager.shared.submitSupportTicket(hackathonId: hackathonId, description: description)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Team View (Tab 2)
struct TeamView: View {
    @EnvironmentObject var vm: AppViewModel
    
    var body: some View {
        NavigationStack {
            VStack {
                if let _ = vm.selectedHackathon {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            if vm.selectedRegistration?.approvalStatus == "Accepted" {
                                HackathonTeamSectionView(hackathonId: vm.selectedHackathon!.id)
                            } else {
                                EmptyStateView(
                                    title: "Access Restricted",
                                    systemImage: "lock.fill",
                                    message: "You must be approved for the hackathon to manage teams."
                                )
                            }
                        }
                        .padding()
                    }
                } else {
                    EmptyStateView(
                        title: "No Active Context",
                        systemImage: "person.3.fill",
                        message: "Go to the Hackathons tab and select an event to view or configure team status."
                    )
                }
            }
            .matrixBackground()
            .navigationTitle("Team Workspace")
        }
    }
}

// MARK: - Profile View (Tab 3)
struct ProfileView: View {
    @EnvironmentObject var vm: AppViewModel
    
    @State private var bio = ""
    @State private var github = ""
    @State private var linkedin = ""
    @State private var skills = ""
    @State private var showSuccessMessage = false
    
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 8) {
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 64))
                                .foregroundColor(Color.primaryAccent)
                            
                            Text(vm.currentProfile?.name ?? "Hacker")
                                .font(.title2.bold())
                                .foregroundColor(Color.textPrimary)
                            
                            Text(vm.currentProfile?.email ?? "")
                                .font(.caption)
                                .foregroundColor(Color.textSecondary)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                .listRowBackground(Color.surface.opacity(0.3))
                
                Section("Hacker Info & Bio") {
                    TextField("Tell us about yourself...", text: $bio)
                        .foregroundStyle(Color.textPrimary)
                }
                .listRowBackground(Color.surface.opacity(0.3))
                
                Section("Social Channels") {
                    HStack {
                        Image(systemName: "link")
                            .foregroundColor(Color.textSecondary)
                        TextField("GitHub Profile URL", text: $github)
                            .foregroundColor(Color.textPrimary)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.none)
                    }
                    
                    HStack {
                        Image(systemName: "link")
                            .foregroundColor(Color.textSecondary)
                        TextField("LinkedIn Profile URL", text: $linkedin)
                            .foregroundColor(Color.textPrimary)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.none)
                    }
                }
                .listRowBackground(Color.surface.opacity(0.3))
                
                Section("Skills (comma-separated)") {
                    TextField("e.g. iOS, Swift, Go", text: $skills)
                        .foregroundColor(Color.textPrimary)
                        .autocorrectionDisabled()
                }
                .listRowBackground(Color.surface.opacity(0.3))
                
                Section {
                    Button(role: .destructive) {
                        vm.logout()
                    } label: {
                        HStack {
                            Image(systemName: "power")
                            Text("Wipe Session / Sign Out")
                                .fontWeight(.bold)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .listRowBackground(Color.red.opacity(0.1))
            }
            .scrollContentBackground(.hidden)
            .matrixBackground()
            .navigationTitle("Hacker Portfolio")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task {
                            let parsedSkills = skills.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
                            await vm.saveProfile(bio: bio, github: github, linkedin: linkedin, skills: parsedSkills)
                            showSuccessMessage = true
                        }
                    } label: {
                        Text("Save")
                            .fontWeight(.bold)
                            .foregroundColor(Color.accentSecondary)
                    }
                }
            }
            .alert("Portfolio Updated", isPresented: $showSuccessMessage) {
                Button("OK") {}
            } message: {
                Text("Your hacker profile changes have been successfully saved to the backend server.")
            }
            .onAppear {
                // Populate inputs from VM profile on load
                if let profile = vm.currentProfile {
                    bio = profile.bio ?? ""
                    github = profile.githubUrl ?? ""
                    linkedin = profile.linkedinUrl ?? ""
                    skills = profile.skills?.joined(separator: ", ") ?? ""
                }
            }
        }
    }
}

// MARK: - Shared UI Sub-components
struct DashboardMetricCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 38, height: 38)
                    Image(systemName: icon)
                        .foregroundColor(color)
                        .font(.footnote)
                }
                Spacer()
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(value)
                    .font(.system(.title, design: .rounded).bold())
                    .foregroundColor(Color.textPrimary)
                Text(title)
                    .font(.caption)
                    .foregroundColor(Color.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCardStyle()
    }
}

struct ChecklistItem: View {
    let title: String
    let isDone: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                .foregroundColor(isDone ? Color.accentSecondary : Color.textSecondary)
                .font(.title3)
            
            Text(title)
                .font(.subheadline)
                .foregroundColor(isDone ? Color.textPrimary : Color.textSecondary)
            
            Spacer()
        }
        .padding()
        .background(Color.surfaceVariant.opacity(0.3))
        .cornerRadius(12)
    }
}

struct StatusBadge: View {
    let status: String?
    
    private var displayStatus: String { status ?? "Not Applied" }
    
    private var badgeColor: Color {
        switch displayStatus {
        case "Accepted": return Color.accentSecondary
        case "Pending": return .orange
        case "Rejected": return .red
        default: return Color.primaryAccent
        }
    }
    
    var body: some View {
        Text(displayStatus)
            .font(.caption.bold())
            .foregroundColor(badgeColor)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(badgeColor.opacity(0.15))
            .clipShape(Capsule())
    }
}

struct EmptyStateView: View {
    let title: String
    let systemImage: String
    let message: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: systemImage)
                .font(.system(size: 44))
                .foregroundColor(Color.textSecondary)
            
            Text(title)
                .font(.headline)
                .foregroundColor(Color.textPrimary)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(Color.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .glassCardStyle()
        .padding()
    }
}
