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
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(vm.activeTheme.primaryAccent.opacity(0.15))
                        .frame(width: 60, height: 60)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(vm.activeTheme.primaryAccent.opacity(0.4), lineWidth: 1.5)
                        )
                    
                    Image("AppLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 40, height: 40)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                
                Text("Join Matrix")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(vm.activeTheme.textPrimary)
                
                Text("Register your hacker portfolio and join events.")
                    .font(.subheadline)
                    .foregroundColor(vm.activeTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            VStack(spacing: 16) {
                TextField("Full Name", text: $name)
                    .autocorrectionDisabled()
                    .padding()
                    .background(vm.activeTheme.surfaceVariant.opacity(0.5))
                    .cornerRadius(12)
                    .foregroundColor(vm.activeTheme.textPrimary)
                
                TextField("Email Address", text: $email)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.none)
                    .padding()
                    .background(vm.activeTheme.surfaceVariant.opacity(0.5))
                    .cornerRadius(12)
                    .foregroundColor(vm.activeTheme.textPrimary)
                
                // Password field
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        if showPassword {
                            TextField("Password", text: $password)
                        } else {
                            SecureField("Password", text: $password)
                        }
                        Button { showPassword.toggle() } label: {
                            Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                .foregroundColor(vm.activeTheme.textSecondary)
                                .font(.footnote)
                        }
                    }
                    .padding()
                    .background(vm.activeTheme.surfaceVariant.opacity(0.5))
                    .cornerRadius(12)
                    .foregroundColor(vm.activeTheme.textPrimary)

                    // Password strength checklist
                    if !password.isEmpty {
                        let rules: [(label: String, passed: Bool)] = [
                            ("8+ characters", password.count >= 8),
                            ("Uppercase (A–Z)", password.range(of: "[A-Z]", options: .regularExpression) != nil),
                            ("Lowercase (a–z)", password.range(of: "[a-z]", options: .regularExpression) != nil),
                            ("Number (0–9)",    password.range(of: "[0-9]", options: .regularExpression) != nil),
                            ("Special char (@#$%)", password.range(of: "[@#$%^&+=!?_\\-.*]", options: .regularExpression) != nil),
                        ]
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(rules, id: \.label) { rule in
                                HStack(spacing: 6) {
                                    Image(systemName: rule.passed ? "checkmark.circle.fill" : "xmark.circle.fill")
                                        .font(.caption2)
                                        .foregroundColor(rule.passed ? .green : .red.opacity(0.6))
                                    Text(rule.label)
                                        .font(.caption2)
                                        .foregroundColor(rule.passed ? .green : vm.activeTheme.textSecondary)
                                }
                            }
                        }
                        .padding(.horizontal, 4)
                    }
                }

                // Confirm Password field
                VStack(alignment: .leading, spacing: 4) {
                    SecureField("Confirm Password", text: $confirmPassword)
                        .padding()
                        .background(vm.activeTheme.surfaceVariant.opacity(0.5))
                        .cornerRadius(12)
                        .foregroundColor(vm.activeTheme.textPrimary)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(
                                    !confirmPassword.isEmpty
                                        ? (confirmPassword == password ? Color.green.opacity(0.6) : Color.red.opacity(0.5))
                                        : Color.clear,
                                    lineWidth: 1.5
                                )
                        )
                    if !confirmPassword.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: confirmPassword == password ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .font(.caption2)
                                .foregroundColor(confirmPassword == password ? .green : .red.opacity(0.7))
                            Text(confirmPassword == password ? "Passwords match" : "Passwords do not match")
                                .font(.caption2)
                                .foregroundColor(confirmPassword == password ? .green : .red.opacity(0.7))
                        }
                        .padding(.horizontal, 4)
                    }
                }

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
                    .background(vm.activeTheme.primaryAccent)
                    .foregroundColor(.white)
                    .cornerRadius(14)
                }
                .disabled(vm.isLoading)
            }
            .glassCardStyle(theme: vm.activeTheme)
            
            Button {
                screen = .login
            } label: {
                Text("Already registered? Sign In")
                    .font(.footnote.weight(.semibold))
                    .foregroundColor(vm.activeTheme.primaryAccent)
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
                    .foregroundStyle(vm.activeTheme.textPrimary)
                
                Text("Enter your email address and we'll send reset instructions.")
                    .font(.subheadline)
                    .foregroundColor(vm.activeTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            VStack(spacing: 20) {
                TextField("Email Address", text: $email)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.none)
                    .padding()
                    .background(vm.activeTheme.surfaceVariant.opacity(0.5))
                    .cornerRadius(12)
                    .foregroundColor(vm.activeTheme.textPrimary)
                
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
                    .background(vm.activeTheme.primaryAccent)
                    .foregroundColor(.white)
                    .cornerRadius(14)
                }
            }
            .glassCardStyle(theme: vm.activeTheme)
            
            Button {
                screen = .login
            } label: {
                Text("Back to Sign In")
                    .font(.footnote.weight(.semibold))
                    .foregroundColor(vm.activeTheme.primaryAccent)
            }
        }
        .padding(.horizontal, 24)
    }
}

// MARK: - Main Dashboard
struct DashboardView: View {
    @EnvironmentObject var vm: AppViewModel
    @State private var selectedTab: Int = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeDashboardView(selectedTab: $selectedTab)
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(0)
            
            HackathonsView()
                .tabItem { Label("Hackathons", systemImage: "trophy.fill") }
                .tag(1)
            
            TeamView()
                .tabItem { Label("Team", systemImage: "person.3.fill") }
                .tag(2)
            
            CometChatConversationsView()
                .tabItem { Label("Chat", systemImage: "message.fill") }
                .tag(3)
            
            ProfileView()
                .tabItem { Label("Profile", systemImage: "person.crop.circle.fill") }
                .tag(4)
        }
        .tint(vm.activeTheme.primaryAccent)
    }
}

// MARK: - Home Dashboard View
struct HomeDashboardView: View {
    @EnvironmentObject var vm: AppViewModel
    @Binding var selectedTab: Int
    @State private var showNotifications = false
    
    private var profileCompletion: Double {
        var score = 0.0
        guard let profile = vm.currentProfile else { return 0 }
        if !(profile.bio ?? "").isEmpty { score += 1 }
        if !(profile.githubUrl ?? "").isEmpty { score += 1 }
        if !(profile.linkedinUrl ?? "").isEmpty { score += 1 }
        if !(profile.resumeUrl ?? "").isEmpty { score += 1 }
        if !(profile.phoneNumber ?? "").isEmpty { score += 1 }
        if !(profile.city ?? "").isEmpty { score += 1 }
        return score / 6.0
    }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 20) {
                    // Header Area
                    HStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Welcome Back")
                                .font(.system(.title2, design: .rounded).weight(.bold))
                                .foregroundColor(vm.activeTheme.textSecondary)
                            
                            Text(vm.currentUser?.name ?? "Hacker")
                                .font(.system(.largeTitle, design: .rounded).weight(.black))
                                .foregroundColor(vm.activeTheme.textPrimary)
                        }
                        
                        Spacer()
                        
                        // Avatar Initials
                        ZStack {
                            Circle()
                                .fill(vm.activeTheme.primaryAccent.opacity(0.15))
                                .frame(width: 50, height: 50)
                                .overlay(
                                    Circle()
                                        .stroke(vm.activeTheme.primaryAccent, lineWidth: 1.5)
                                )
                            Text(String(vm.currentUser?.name.prefix(2) ?? "HA").uppercased())
                                .font(.system(.subheadline, design: .rounded).bold())
                                .foregroundColor(vm.activeTheme.textPrimary)
                        }
                    }
                    .padding(.top, 10)
                    
                    // Profile Completion Ring Card
                    HStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Profile Completion")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                            Text("Sync details to stand out to team organizers.")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.85))
                        }
                        
                        Spacer()
                        
                        ZStack {
                            Circle()
                                .stroke(Color.white.opacity(0.2), lineWidth: 6)
                            Circle()
                                .trim(from: 0, to: profileCompletion)
                                .stroke(
                                    LinearGradient(
                                        colors: [Color.white, Color.white.opacity(0.6)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    style: StrokeStyle(lineWidth: 6, lineCap: .round)
                                )
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
                            gradient: Gradient(colors: [vm.activeTheme.primaryAccent, vm.activeTheme.accentSecondary]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(20)
                    .shadow(color: vm.activeTheme.primaryAccent.opacity(0.35), radius: 12, x: 0, y: 6)

                    // Quick Stats grid
                    let acceptedCount = vm.totalRegistrationStats.accepted
                    let pendingCount = vm.totalRegistrationStats.pending
                    let totalCount = vm.totalRegistrationStats.total
                    
                    VStack(alignment: .leading, spacing: 10) {
                        Text("My Statistics")
                            .font(.system(.headline, design: .rounded).bold())
                            .foregroundColor(vm.activeTheme.textPrimary)
                        
                        HStack(spacing: 12) {
                            DashboardMetricCard(
                                title: "Total Apps",
                                value: "\(totalCount)",
                                icon: "doc.text.fill",
                                color: vm.activeTheme.primaryAccent,
                                theme: vm.activeTheme
                            )
                            DashboardMetricCard(
                                title: "Approved",
                                value: "\(acceptedCount)",
                                icon: "checkmark.circle.fill",
                                color: Color(hex: "10B981"),
                                theme: vm.activeTheme
                            )
                            DashboardMetricCard(
                                title: "Pending",
                                value: "\(pendingCount)",
                                icon: "clock.fill",
                                color: Color(hex: "F59E0B"),
                                theme: vm.activeTheme
                            )
                        }
                    }
                    
                    // Quick Actions
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Quick Actions")
                            .font(.system(.headline, design: .rounded).bold())
                            .foregroundColor(vm.activeTheme.textPrimary)
                        
                        HStack(spacing: 16) {
                            Button {
                                selectedTab = 1 // Switch to Hackathons tab
                            } label: {
                                VStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(vm.activeTheme.primaryAccent.opacity(0.15))
                                            .frame(width: 48, height: 48)
                                        Image(systemName: "magnifyingglass")
                                            .font(.title3.bold())
                                            .foregroundColor(vm.activeTheme.primaryAccent)
                                    }
                                    Text("Explore")
                                        .font(.subheadline.bold())
                                        .foregroundColor(vm.activeTheme.textPrimary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .glassCardStyle(theme: vm.activeTheme)
                            }
                            .buttonStyle(ScaleButtonStyle())
                            
                            Button {
                                withAnimation {
                                    proxy.scrollTo("MyApplications", anchor: .top)
                                }
                            } label: {
                                VStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(vm.activeTheme.accentSecondary.opacity(0.15))
                                            .frame(width: 48, height: 48)
                                        Image(systemName: "list.clipboard.fill")
                                            .font(.title3.bold())
                                            .foregroundColor(vm.activeTheme.accentSecondary)
                                    }
                                    Text("My Apps")
                                        .font(.subheadline.bold())
                                        .foregroundColor(vm.activeTheme.textPrimary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .glassCardStyle(theme: vm.activeTheme)
                            }
                            .buttonStyle(ScaleButtonStyle())
                        }
                    }
                    
                    // My Applications List
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Text("My Hackathons")
                                .font(.system(.headline, design: .rounded).bold())
                                .foregroundColor(vm.activeTheme.textPrimary)
                            Spacer()
                        }
                        .id("MyApplications")
                        
                        if vm.allRegistrations.isEmpty {
                            VStack(spacing: 12) {
                                Image(systemName: "doc.plaintext.fill")
                                    .font(.system(size: 36))
                                    .foregroundColor(vm.activeTheme.textSecondary)
                                Text("No registrations found.")
                                    .font(.subheadline.bold())
                                    .foregroundColor(vm.activeTheme.textPrimary)
                                Text("You haven't applied to any hackathons yet. Visit the Discover tab to get started.")
                                    .font(.caption)
                                    .foregroundColor(vm.activeTheme.textSecondary)
                                    .multilineTextAlignment(.center)
                            }
                            .padding()
                            .frame(maxWidth: .infinity)
                            .glassCardStyle(theme: vm.activeTheme)
                        } else {
                            ForEach(vm.allRegistrations) { reg in
                                let matchedHack = vm.hackathons.first(where: { $0.id == reg.hackathonId })
                                NavigationLink(destination: HackathonDetailView(hackathon: matchedHack ?? Hackathon(id: reg.hackathonId, title: matchedHack?.title ?? "Hackathon Event", description: matchedHack?.description ?? "", coverImage: nil, tracks: nil, startDate: nil, endDate: nil, registrationStatus: nil, problemStatement: nil, prizes: nil, schedule: nil, sponsors: nil, minTeamSize: nil, maxTeamSize: nil, registrationFee: nil, rounds: nil)).onAppear {
                                    if let h = matchedHack {
                                        vm.selectedHackathon = h
                                    }
                                }) {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text(matchedHack?.title ?? "Hackathon")
                                                .font(.headline)
                                                .foregroundColor(vm.activeTheme.textPrimary)
                                                .multilineTextAlignment(.leading)
                                            
                                            Text("Preference: \(reg.teamPreference)")
                                                .font(.caption)
                                                .foregroundColor(vm.activeTheme.textSecondary)
                                        }
                                        
                                        Spacer()
                                        
                                        StatusBadge(status: reg.approvalStatus)
                                        
                                        Image(systemName: "chevron.right")
                                            .foregroundColor(vm.activeTheme.textSecondary)
                                            .font(.footnote)
                                    }
                                    .padding(.vertical, 4)
                                }
                                .buttonStyle(PlainButtonStyle())
                                .glassCardStyle(theme: vm.activeTheme)
                            }
                            
                            // Load More button
                            if vm.myHackathonsHasMore {
                                Button {
                                    Task { await vm.loadMoreHackathons() }
                                } label: {
                                    HStack(spacing: 8) {
                                        if vm.isLoadingMoreHackathons {
                                            ProgressView()
                                                .tint(vm.activeTheme.primaryAccent)
                                        }
                                        Text(vm.isLoadingMoreHackathons ? "Loading..." : "Load More")
                                            .font(.subheadline.bold())
                                            .foregroundColor(vm.activeTheme.primaryAccent)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .glassCardStyle(theme: vm.activeTheme)
                                }
                                .disabled(vm.isLoadingMoreHackathons)
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    }

                    // Journey checklist
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Matrix Launch Checklist")
                            .font(.system(.headline, design: .rounded).bold())
                            .foregroundColor(vm.activeTheme.textPrimary)
                        
                        VStack(spacing: 12) {
                            ChecklistItem(title: "Complete Profile Data", isDone: profileCompletion > 0.8, theme: vm.activeTheme)
                            ChecklistItem(title: "Choose Hackathon", isDone: vm.selectedHackathon != nil, theme: vm.activeTheme)
                            ChecklistItem(title: "Assemble Hacker Team", isDone: vm.selectedTeam != nil, theme: vm.activeTheme)
                        }
                    }
                }
                .padding()
            }
            } // Close ScrollViewReader
            .matrixBackground(theme: vm.activeTheme)
            .navigationTitle("Command Matrix")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showNotifications = true
                    } label: {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: "bell.fill")
                                .font(.title3)
                                .foregroundColor(vm.activeTheme.textPrimary)
                            
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
                NotificationCenterView().environmentObject(vm)
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
    @State private var searchText = ""
    
    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    // Search Bar
                    HStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(vm.activeTheme.textSecondary)
                        TextField("Search hackathons...", text: $searchText)
                            .foregroundColor(vm.activeTheme.textPrimary)
                            .tint(vm.activeTheme.primaryAccent)
                        if !searchText.isEmpty {
                            Button { searchText = "" } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(vm.activeTheme.textSecondary)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(vm.activeTheme.surface.opacity(0.7))
                    .background(.ultraThinMaterial)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(vm.activeTheme.primaryAccent.opacity(0.15), lineWidth: 1)
                    )
                    .padding(.top, 4)
                    
                    if vm.isLoading && vm.exploreHackathons.isEmpty {
                        VStack(spacing: 16) {
                            ForEach(0..<3, id: \.self) { _ in
                                RoundedRectangle(cornerRadius: 24)
                                    .fill(vm.activeTheme.surface.opacity(0.4))
                                    .frame(height: 220)
                                    .overlay(ProgressView().tint(vm.activeTheme.primaryAccent))
                            }
                        }
                    } else if vm.exploreHackathons.isEmpty {
                        VStack(spacing: 20) {
                            ZStack {
                                Circle()
                                    .fill(vm.activeTheme.primaryAccent.opacity(0.1))
                                    .frame(width: 90, height: 90)
                                Image(systemName: searchText.isEmpty ? "trophy.slash" : "magnifyingglass")
                                    .font(.system(size: 36))
                                    .foregroundColor(vm.activeTheme.primaryAccent)
                            }
                            Text(searchText.isEmpty ? "No Events Available" : "No Results")
                                .font(.title3.bold())
                                .foregroundColor(vm.activeTheme.textPrimary)
                            Text(searchText.isEmpty
                                 ? "Check back later for upcoming hackathons."
                                 : "Try a different search term.")
                                .font(.subheadline)
                                .foregroundColor(vm.activeTheme.textSecondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(40)
                    } else {
                        LazyVStack(spacing: 20) {
                            ForEach(vm.exploreHackathons) { hack in
                                NavigationLink(destination: HackathonDetailView(hackathon: hack).onAppear {
                                    vm.selectedHackathon = hack
                                }) {
                                    HackathonRowCard(hackathon: hack)
                                }
                                .buttonStyle(ScaleButtonStyle())
                                .onAppear {
                                    // Trigger load more when reaching the last 3 items
                                    if hack.id == vm.exploreHackathons.suffix(3).first?.id {
                                        Task { await vm.loadMoreExploreHackathons() }
                                    }
                                }
                            }
                        }
                        
                        // Loading indicator at the bottom
                        if vm.isLoadingMoreExplore {
                            HStack(spacing: 10) {
                                ProgressView()
                                    .tint(vm.activeTheme.primaryAccent)
                                Text("Loading more...")
                                    .font(.subheadline)
                                    .foregroundColor(vm.activeTheme.textSecondary)
                            }
                            .padding(.vertical, 16)
                            .frame(maxWidth: .infinity, alignment: .center)
                        } else if !vm.exploreHasMore && vm.exploreHackathons.count > 0 {
                            Text("You've reached the end")
                                .font(.caption)
                                .foregroundColor(vm.activeTheme.textSecondary)
                                .padding(.vertical, 16)
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .matrixBackground(theme: vm.activeTheme)
            .navigationTitle("Discover Events")
            .refreshable {
                vm.exploreCurrentPage = 1
                vm.exploreHackathons = []
                await vm.loadExploreHackathons()
            }
            .task {
                if vm.exploreHackathons.isEmpty {
                    await vm.loadExploreHackathons()
                }
            }
            .onChange(of: searchText) { newValue in
                vm.updateExploreSearch(newValue)
            }
        }
    }
}

struct HackathonRowCard: View {
    let hackathon: Hackathon
    @EnvironmentObject var vm: AppViewModel
    
    private var cardAccentPair: (Color, Color) {
        let pairs: [(Color, Color)] = [
            (vm.activeTheme.primaryAccent, vm.activeTheme.accentSecondary),
            (vm.activeTheme.accentSecondary, vm.activeTheme.primaryAccent),
            (vm.activeTheme.primaryAccent, vm.activeTheme.primaryAccent.opacity(0.5)),
        ]
        return pairs[abs(hackathon.id.hashValue) % pairs.count]
    }
    
    private func shortDate(_ s: String?) -> String {
        guard let s else { return "TBD" }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: s) {
            let f = DateFormatter(); f.dateFormat = "MMM d"
            return f.string(from: d)
        }
        return String(s.prefix(10))
    }
    
    private var isApplied: Bool {
        vm.allRegistrations.contains(where: { $0.hackathonId == hackathon.id })
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            
            // Hero Banner
            ZStack(alignment: .bottomLeading) {
                LinearGradient(
                    gradient: Gradient(stops: [
                        .init(color: cardAccentPair.0.opacity(0.88), location: 0),
                        .init(color: cardAccentPair.1.opacity(0.6), location: 0.65),
                        .init(color: vm.activeTheme.surface.opacity(0.2), location: 1),
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .frame(height: 148)
                
                // Decorative orbs
                Circle()
                    .fill(Color.white.opacity(0.07))
                    .frame(width: 130, height: 130)
                    .offset(x: 210, y: -30)
                Circle()
                    .fill(Color.white.opacity(0.04))
                    .frame(width: 80, height: 80)
                    .offset(x: 150, y: 30)
                
                // Bottom scrim for readability
                LinearGradient(
                    colors: [.clear, Color.black.opacity(0.5)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 148)
                
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 5) {
                            Circle()
                                .fill(isApplied ? Color.green : Color.white.opacity(0.8))
                                .frame(width: 5, height: 5)
                            Text(isApplied ? "APPLIED" : "OPEN")
                                .font(.system(size: 9, weight: .black))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.3))
                        .cornerRadius(20)
                        
                        Text(hackathon.title)
                            .font(.system(.title3, design: .rounded).weight(.black))
                            .foregroundColor(.white)
                            .lineLimit(2)
                            .shadow(color: .black.opacity(0.4), radius: 3)
                    }
                    
                    Spacer()
                    
                    ZStack {
                        Circle()
                            .fill(Color.white.opacity(0.2))
                            .frame(width: 36, height: 36)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                .padding(14)
            }
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .clipped()
            
            // Body
            VStack(alignment: .leading, spacing: 12) {
                Text(hackathon.description)
                    .font(.subheadline)
                    .foregroundColor(vm.activeTheme.textSecondary)
                    .lineLimit(2)
                    .lineSpacing(3)
                
                // Meta chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        if hackathon.startDate != nil || hackathon.endDate != nil {
                            MetaChip(
                                icon: "calendar",
                                text: "\(shortDate(hackathon.startDate)) → \(shortDate(hackathon.endDate))",
                                theme: vm.activeTheme
                            )
                        }
                        if let mn = hackathon.minTeamSize, let mx = hackathon.maxTeamSize {
                            MetaChip(icon: "person.2.fill", text: "\(mn)-\(mx) members", theme: vm.activeTheme)
                        }
                        let feeText = (hackathon.registrationFee?.isEmpty ?? true) ? "Free Entry" : hackathon.registrationFee!
                        let feeIcon = (hackathon.registrationFee?.isEmpty ?? true) ? "gift.fill" : "creditcard.fill"
                        MetaChip(icon: feeIcon, text: feeText, theme: vm.activeTheme)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(vm.activeTheme.surface.opacity(vm.activeTheme.isLight ? 0.9 : 0.5))
        }
        .background(vm.activeTheme.surface.opacity(vm.activeTheme.isLight ? 0.9 : 0.5))
        .cornerRadius(24)
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(
                    vm.activeTheme.isLight
                        ? vm.activeTheme.primaryAccent.opacity(0.15)
                        : Color.white.opacity(0.07),
                    lineWidth: 1
                )
        )
        .shadow(
            color: vm.activeTheme.primaryAccent.opacity(vm.activeTheme.isLight ? 0.12 : 0.18),
            radius: 16, x: 0, y: 8
        )
    }
}

// MARK: - Meta Chip
struct MetaChip: View {
    let icon: String
    let text: String
    let theme: AppTheme
    
    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(theme.primaryAccent)
            Text(text)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(theme.textSecondary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(theme.primaryAccent.opacity(0.1))
        .cornerRadius(20)
        .overlay(Capsule().stroke(theme.primaryAccent.opacity(0.2), lineWidth: 1))
    }
}

// MARK: - Hackathon Detail View (Premium)
struct HackathonDetailView: View {
    let hackathon: Hackathon
    @EnvironmentObject var vm: AppViewModel
    @State private var showApplySheet = false
    @State private var showMentorTicketSheet = false
    
    private var registrationStatus: String {
        vm.selectedRegistration?.approvalStatus ?? "Not Applied"
    }
    
    private var isApproved: Bool {
        vm.selectedRegistration?.approvalStatus.lowercased() == "accepted"
    }
    
    private func formattedDate(_ dateStr: String?) -> String {
        guard let dateStr = dateStr else { return "TBD" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: dateStr) {
            let display = DateFormatter()
            display.dateStyle = .medium
            return display.string(from: date)
        }
        return String(dateStr.prefix(10))
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                
                // ── HERO HEADER ─────────────────────────────────────
                ZStack(alignment: .bottom) {
                    LinearGradient(
                        gradient: Gradient(stops: [
                            .init(color: vm.activeTheme.primaryAccent.opacity(0.92), location: 0),
                            .init(color: vm.activeTheme.accentSecondary.opacity(0.65), location: 0.55),
                            .init(color: vm.activeTheme.background, location: 1)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(height: 250)
                    
                    // Decorative orbs
                    Circle()
                        .fill(Color.white.opacity(0.06))
                        .frame(width: 220, height: 220)
                        .offset(x: 110, y: -70)
                    Circle()
                        .fill(Color.white.opacity(0.04))
                        .frame(width: 130, height: 130)
                        .offset(x: -90, y: -20)
                    
                    VStack(alignment: .leading, spacing: 12) {
                        // Status pill
                        HStack(spacing: 6) {
                            Circle()
                                .fill(isApproved ? Color.green : (vm.selectedRegistration != nil ? Color.orange : Color.white.opacity(0.6)))
                                .frame(width: 6, height: 6)
                            Text(registrationStatus.uppercased())
                                .font(.system(size: 10, weight: .black))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.black.opacity(0.25))
                        .cornerRadius(20)
                        
                        Text(hackathon.title)
                            .font(.system(.title, design: .rounded).weight(.black))
                            .foregroundColor(.white)
                            .lineLimit(3)
                            .shadow(color: .black.opacity(0.3), radius: 4)
                        
                        // Date range
                        if hackathon.startDate != nil || hackathon.endDate != nil {
                            HStack(spacing: 8) {
                                Label(formattedDate(hackathon.startDate), systemImage: "calendar")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.9))
                                Text("→")
                                    .foregroundColor(.white.opacity(0.6))
                                Label(formattedDate(hackathon.endDate), systemImage: "flag.checkered")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(.white.opacity(0.9))
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 28)
                }
                
                // ── BODY ─────────────────────────────────────────────
                VStack(alignment: .leading, spacing: 20) {
                    
                    // Meta info strip
                    HStack(spacing: 0) {
                        MetaInfoCell(
                            icon: "person.2.fill",
                            label: "Team Size",
                            value: hackathon.minTeamSize != nil && hackathon.maxTeamSize != nil
                                ? "\(hackathon.minTeamSize!)–\(hackathon.maxTeamSize!)"
                                : "Open",
                            theme: vm.activeTheme
                        )
                        Divider().frame(height: 36)
                            .background(vm.activeTheme.surfaceVariant)
                        MetaInfoCell(
                            icon: "creditcard.fill",
                            label: "Entry Fee",
                            value: (hackathon.registrationFee?.isEmpty ?? true) ? "Free" : hackathon.registrationFee!,
                            theme: vm.activeTheme
                        )
                        Divider().frame(height: 36)
                            .background(vm.activeTheme.surfaceVariant)
                        MetaInfoCell(
                            icon: "square.grid.2x2.fill",
                            label: "Tracks",
                            value: (hackathon.tracks?.isEmpty ?? true) ? "—" : "Multiple",
                            theme: vm.activeTheme
                        )
                    }
                    .padding(.vertical, 12)
                    .glassCardStyle(theme: vm.activeTheme)
                    
                    // Apply / Status CTA
                    if vm.selectedRegistration == nil {
                        Button { showApplySheet = true } label: {
                            HStack(spacing: 14) {
                                ZStack {
                                    Circle()
                                        .fill(Color.white.opacity(0.2))
                                        .frame(width: 46, height: 46)
                                    Image(systemName: "arrow.right.circle.fill")
                                        .font(.title2)
                                        .foregroundColor(.white)
                                }
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Apply Now")
                                        .font(.headline.bold())
                                        .foregroundColor(.white)
                                    Text("Tap to submit your application")
                                        .font(.caption)
                                        .foregroundColor(.white.opacity(0.8))
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.white.opacity(0.7))
                            }
                            .padding()
                            .background(
                                LinearGradient(
                                    colors: [vm.activeTheme.primaryAccent, vm.activeTheme.accentSecondary],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(18)
                            .shadow(color: vm.activeTheme.primaryAccent.opacity(0.4), radius: 14, x: 0, y: 7)
                        }
                        .buttonStyle(ScaleButtonStyle())
                    } else {
                        HStack(spacing: 14) {
                            ZStack {
                                Circle()
                                    .fill(isApproved ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
                                    .frame(width: 48, height: 48)
                                Image(systemName: isApproved ? "checkmark.seal.fill" : "clock.badge.fill")
                                    .font(.title2)
                                    .foregroundColor(isApproved ? .green : .orange)
                            }
                            VStack(alignment: .leading, spacing: 4) {
                                Text(isApproved ? "You're In! 🎉" : "Application Under Review")
                                    .font(.headline.bold())
                                    .foregroundColor(vm.activeTheme.textPrimary)
                                Text(isApproved
                                     ? "Congratulations — see team options below."
                                     : "Status: \(registrationStatus)")
                                    .font(.caption)
                                    .foregroundColor(vm.activeTheme.textSecondary)
                            }
                            Spacer()
                            StatusBadge(status: vm.selectedRegistration?.approvalStatus)
                        }
                        .padding()
                        .glassCardStyle(theme: vm.activeTheme)
                    }
                    
                    // Announcements
                    if !vm.selectedAnnouncements.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionHeader(title: "Announcements", icon: "megaphone.fill", theme: vm.activeTheme)
                            ForEach(vm.selectedAnnouncements) { broadcast in
                                HStack(alignment: .top, spacing: 12) {
                                    Circle()
                                        .fill(vm.activeTheme.primaryAccent.opacity(0.15))
                                        .frame(width: 36, height: 36)
                                        .overlay(
                                            Image(systemName: "megaphone.fill")
                                                .font(.caption.bold())
                                                .foregroundColor(vm.activeTheme.primaryAccent)
                                        )
                                    Text(broadcast.message)
                                        .font(.subheadline)
                                        .foregroundColor(vm.activeTheme.textPrimary)
                                        .lineSpacing(3)
                                }
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(vm.activeTheme.primaryAccent.opacity(0.07))
                                .cornerRadius(14)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(vm.activeTheme.primaryAccent.opacity(0.15), lineWidth: 1)
                                )
                            }
                        }
                    }
                    
                    // Rich detail sections (only shown when data exists)
                    RichHackathonSection(title: "About", icon: "info.circle.fill", content: hackathon.description, theme: vm.activeTheme)
                    RichHackathonSection(title: "Problem Statement", icon: "lightbulb.fill", content: hackathon.problemStatement, theme: vm.activeTheme)
                    RichHackathonSection(title: "Tracks & Categories", icon: "square.grid.2x2.fill", content: hackathon.tracks, theme: vm.activeTheme)
                    RichHackathonSection(title: "Prizes & Rewards", icon: "trophy.fill", content: hackathon.prizes, theme: vm.activeTheme)
                    RichHackathonSection(title: "Event Schedule", icon: "calendar.badge.clock", content: hackathon.schedule, theme: vm.activeTheme)
                    RichHackathonSection(title: "Rounds", icon: "arrow.triangle.2.circlepath.circle.fill", content: hackathon.rounds, theme: vm.activeTheme)
                    RichHackathonSection(title: "Sponsors & Partners", icon: "star.circle.fill", content: hackathon.sponsors, theme: vm.activeTheme)
                    
                    // Team workspace (approved only)
                    if isApproved {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionHeader(title: "Team Workspace", icon: "person.3.fill", theme: vm.activeTheme)
                            HackathonTeamSectionView(hackathonId: hackathon.id)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 20)
                .padding(.bottom, 48)
            }
        }
        .ignoresSafeArea(edges: .top)
        .matrixBackground(theme: vm.activeTheme)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if isApproved, let teamId = vm.selectedTeam?.team.id {
                    Button { showMentorTicketSheet = true } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "lifepreserver.fill")
                            Text("Support")
                                .font(.footnote.bold())
                        }
                        .foregroundColor(vm.activeTheme.accentSecondary)
                    }
                }
            }
        }
        .sheet(isPresented: $showApplySheet) {
            HackathonApplicationView(hackathonId: hackathon.id)
                .environmentObject(vm)
                .preferredColorScheme(vm.activeTheme.isLight ? .light : .dark)
        }
        .sheet(isPresented: $showMentorTicketSheet) {
            if let teamId = vm.selectedTeam?.team.id {
                SubmitTicketView(hackathonId: hackathon.id, teamId: teamId)
                    .environmentObject(vm)
                    .preferredColorScheme(vm.activeTheme.isLight ? .light : .dark)
            }
        }
        .refreshable {
            await vm.loadSelectedHackathonDetails(id: hackathon.id)
        }
        .task {
            await vm.loadSelectedHackathonDetails(id: hackathon.id)
        }
    }
}

// MARK: - Hackathon Detail Section Component
struct HackathonDetailSection: View {
    let title: String
    let content: String?
    let theme: AppTheme
    
    var body: some View {
        if let content = content, !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(theme.textPrimary)
                Text(content)
                    .font(.subheadline)
                    .foregroundColor(theme.textSecondary)
                    .lineSpacing(4)
            }
            .glassCardStyle(theme: theme)
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
    
    // Leader state
    @State private var inviteEmail = ""
    @State private var isInviting = false
    @State private var inviteError: String?
    
    // Non-leader state
    @State private var teamSearchText = ""
    @State private var requestedTeamIds: Set<String> = []

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Hacker Team Control")
                .font(.headline)
                .foregroundColor(vm.activeTheme.textPrimary)
            
            if let activeTeam = vm.selectedTeam {
                // USER IS IN A TEAM
                let isLeader = vm.currentUser?.id != nil && vm.currentUser?.id == activeTeam.team.leaderId
                
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Image(systemName: "person.3.fill")
                            .foregroundColor(vm.activeTheme.accentSecondary)
                        Text(activeTeam.team.teamName)
                            .font(.title3.bold())
                            .foregroundColor(vm.activeTheme.textPrimary)
                    }
                    
                    Text("Invite Code: \(activeTeam.team.inviteCode)")
                        .font(.caption.bold())
                        .foregroundColor(vm.activeTheme.primaryAccent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(vm.activeTheme.primaryAccent.opacity(0.12))
                        .cornerRadius(6)
                    
                    // Team Members
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Team Members:")
                            .font(.subheadline.bold())
                            .foregroundColor(vm.activeTheme.textSecondary)
                        
                        ForEach(activeTeam.members) { member in
                            HStack {
                                Image(systemName: "person.crop.circle.fill")
                                    .foregroundColor(vm.activeTheme.textSecondary)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(member.name)
                                        .font(.subheadline.bold())
                                        .foregroundColor(vm.activeTheme.textPrimary)
                                    Text(member.email)
                                        .font(.caption)
                                        .foregroundColor(vm.activeTheme.textSecondary)
                                }
                                Spacer()
                                
                                if member.id == activeTeam.team.leaderId {
                                    Text("Leader ★")
                                        .font(.caption.bold())
                                        .foregroundColor(vm.activeTheme.accentSecondary)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 3)
                                        .background(vm.activeTheme.accentSecondary.opacity(0.15))
                                        .cornerRadius(4)
                                } else if isLeader {
                                    Button(role: .destructive) {
                                        Task {
                                            await vm.removeMember(memberId: member.id)
                                        }
                                    } label: {
                                        Text("Remove")
                                            .font(.caption.bold())
                                            .foregroundColor(.red)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(Color.red.opacity(0.1))
                                            .cornerRadius(6)
                                    }
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    
                    Divider().background(Color.white.opacity(0.1))
                    
                    // Leader Invite Form
                    if isLeader {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Invite New Member")
                                .font(.subheadline.bold())
                                .foregroundColor(vm.activeTheme.textSecondary)
                            
                            HStack {
                                TextField("hacker@email.com", text: $inviteEmail)
                                    .keyboardType(.emailAddress)
                                    .autocorrectionDisabled()
                                    .textInputAutocapitalization(.none)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 10)
                                    .background(vm.activeTheme.surfaceVariant.opacity(0.5))
                                    .cornerRadius(8)
                                    .foregroundColor(vm.activeTheme.textPrimary)
                                
                                Button {
                                    Task {
                                        isInviting = true
                                        inviteError = nil
                                        do {
                                            try await vm.inviteUser(email: inviteEmail)
                                            inviteEmail = ""
                                        } catch {
                                            inviteError = error.localizedDescription
                                        }
                                        isInviting = false
                                    }
                                } label: {
                                    if isInviting {
                                        ProgressView().tint(.white)
                                    } else {
                                        Text("Invite")
                                            .fontWeight(.bold)
                                    }
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(vm.activeTheme.primaryAccent)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                                .disabled(inviteEmail.isEmpty || isInviting)
                            }
                            
                            if let inviteError {
                                Text(inviteError)
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                        }
                        
                        Divider().background(Color.white.opacity(0.1))
                        
                        // Leader Incoming Join Requests
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Incoming Join Requests")
                                .font(.subheadline.bold())
                                .foregroundColor(vm.activeTheme.textSecondary)
                            
                            if vm.incomingTeamRequests.isEmpty {
                                Text("No pending join requests.")
                                    .font(.caption)
                                    .foregroundColor(vm.activeTheme.textSecondary)
                            } else {
                                ForEach(vm.incomingTeamRequests) { req in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(req.userName ?? "Hacker")
                                                .font(.subheadline.bold())
                                                .foregroundColor(vm.activeTheme.textPrimary)
                                            Text(req.userEmail ?? "")
                                                .font(.caption)
                                                .foregroundColor(vm.activeTheme.textSecondary)
                                        }
                                        Spacer()
                                        
                                        HStack(spacing: 8) {
                                            Button("Accept") {
                                                Task {
                                                    await vm.respondToRequest(requestId: req.id, accept: true)
                                                }
                                            }
                                            .font(.caption.bold())
                                            .foregroundColor(.white)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 6)
                                            .background(vm.activeTheme.accentSecondary)
                                            .cornerRadius(6)
                                            
                                            Button("Decline") {
                                                Task {
                                                    await vm.respondToRequest(requestId: req.id, accept: false)
                                                }
                                            }
                                            .font(.caption.bold())
                                            .foregroundColor(.red)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 6)
                                            .background(Color.red.opacity(0.1))
                                            .cornerRadius(6)
                                        }
                                    }
                                    .padding(.vertical, 4)
                                }
                            }
                        }
                        
                        Divider().background(Color.white.opacity(0.1))
                    }
                    
                    // Project Submission Status
                    HStack {
                        if activeTeam.team.isSubmitted {
                            Label("Project Submitted", systemImage: "checkmark.circle.fill")
                                .foregroundColor(vm.activeTheme.accentSecondary)
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
                            .tint(vm.activeTheme.primaryAccent)
                        }
                    }
                }
                .glassCardStyle(theme: vm.activeTheme)
                
            } else {
                // USER HAS NO TEAM
                VStack(spacing: 16) {
                    Text("Assemble your squad to start compiling submissions.")
                        .font(.subheadline)
                        .foregroundColor(vm.activeTheme.textSecondary)
                        .multilineTextAlignment(.center)
                    
                    HStack(spacing: 12) {
                        Button {
                            showCreateTeam = true
                        } label: {
                            Text("Create Team")
                                .font(.subheadline.bold())
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(vm.activeTheme.primaryAccent)
                                .foregroundColor(vm.activeTheme.onPrimary)
                                .cornerRadius(12)
                        }
                        
                        Button {
                            showJoinTeam = true
                        } label: {
                            Text("Join Team")
                                .font(.subheadline.bold())
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(vm.activeTheme.surfaceVariant)
                                .foregroundColor(vm.activeTheme.textPrimary)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                )
                        }
                    }
                }
                .glassCardStyle(theme: vm.activeTheme)
                
                // My Outgoing Invitations Section
                if !vm.myIncomingInvitations.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Incoming Team Invitations")
                            .font(.subheadline.bold())
                            .foregroundColor(vm.activeTheme.textSecondary)
                        
                        ForEach(vm.myIncomingInvitations) { inv in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(inv.teamName)
                                        .font(.subheadline.bold())
                                        .foregroundColor(vm.activeTheme.textPrimary)
                                    Text("Invited you to join")
                                        .font(.caption)
                                        .foregroundColor(vm.activeTheme.textSecondary)
                                }
                                Spacer()
                                
                                HStack(spacing: 8) {
                                    Button("Accept") {
                                        Task {
                                            await vm.respondToInvitation(invitationId: inv.id, accept: true)
                                        }
                                    }
                                    .font(.caption.bold())
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(vm.activeTheme.accentSecondary)
                                    .cornerRadius(6)
                                    
                                    Button("Decline") {
                                        Task {
                                            await vm.respondToInvitation(invitationId: inv.id, accept: false)
                                        }
                                    }
                                    .font(.caption.bold())
                                    .foregroundColor(.red)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(Color.red.opacity(0.1))
                                    .cornerRadius(6)
                                }
                            }
                            .padding()
                            .glassCardStyle(theme: vm.activeTheme)
                        }
                    }
                    .padding(.top, 10)
                }
                
                // Outgoing Sent Requests Section
                if !vm.myOutgoingRequests.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("My Sent Join Requests")
                            .font(.subheadline.bold())
                            .foregroundColor(vm.activeTheme.textSecondary)
                        
                        ForEach(vm.myOutgoingRequests) { req in
                            HStack {
                                Text("Requested: \(req.teamName ?? "Team")")
                                    .font(.subheadline.bold())
                                    .foregroundColor(vm.activeTheme.textPrimary)
                                Spacer()
                                StatusBadge(status: req.status)
                            }
                            .padding()
                            .glassCardStyle(theme: vm.activeTheme)
                        }
                    }
                    .padding(.top, 10)
                }
                
                // Browse Open Teams Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Browse Open Public Teams")
                        .font(.subheadline.bold())
                        .foregroundColor(vm.activeTheme.textSecondary)
                    
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(vm.activeTheme.textSecondary)
                        TextField("Search teams by name...", text: $teamSearchText)
                            .foregroundColor(vm.activeTheme.textPrimary)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.none)
                    }
                    .padding()
                    .background(vm.activeTheme.surfaceVariant.opacity(0.5))
                    .cornerRadius(12)
                    
                    if vm.publicTeams.isEmpty {
                        Text(teamSearchText.isEmpty ? "No open teams registered yet. Be the first to create one!" : "No matching open teams found.")
                            .font(.caption)
                            .foregroundColor(vm.activeTheme.textSecondary)
                            .padding(.top, 4)
                    } else {
                        ForEach(vm.publicTeams) { team in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(team.teamName)
                                        .font(.headline)
                                        .foregroundColor(vm.activeTheme.textPrimary)
                                    Text("Code: \(team.inviteCode)")
                                        .font(.caption)
                                        .foregroundColor(vm.activeTheme.textSecondary)
                                }
                                Spacer()
                                
                                let isRequested = requestedTeamIds.contains(team.id) || vm.myOutgoingRequests.contains(where: { $0.teamId == team.id })
                                
                                Button {
                                    Task {
                                        requestedTeamIds.insert(team.id)
                                        await vm.requestToJoin(teamId: team.id)
                                    }
                                } label: {
                                    Text(isRequested ? "Requested" : "Join Request")
                                        .font(.caption.bold())
                                        .foregroundColor(isRequested ? Color.white : vm.activeTheme.onPrimary)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(isRequested ? Color.gray : vm.activeTheme.primaryAccent)
                                .cornerRadius(8)
                                .disabled(isRequested)
                            }
                            .padding()
                            .glassCardStyle(theme: vm.activeTheme)
                        }
                        
                        // Pagination Footer Controls for Public Teams
                        if vm.publicTeamsCurrentPage > 1 || vm.publicTeamsHasMore {
                            HStack(spacing: 20) {
                                Button {
                                    if vm.publicTeamsCurrentPage > 1 {
                                        vm.publicTeamsCurrentPage -= 1
                                        Task { await vm.loadPublicTeams() }
                                    }
                                } label: {
                                    HStack {
                                        Image(systemName: "chevron.left")
                                        Text("Previous")
                                    }
                                    .font(.caption.bold())
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(vm.publicTeamsCurrentPage > 1 ? vm.activeTheme.primaryAccent : vm.activeTheme.surfaceVariant.opacity(0.3))
                                    .foregroundColor(vm.publicTeamsCurrentPage > 1 ? vm.activeTheme.onPrimary : vm.activeTheme.textSecondary)
                                    .cornerRadius(8)
                                }
                                .disabled(vm.publicTeamsCurrentPage <= 1)
                                
                                Text("Page \(vm.publicTeamsCurrentPage)")
                                    .font(.caption.bold())
                                    .foregroundColor(vm.activeTheme.textPrimary)
                                
                                Button {
                                    if vm.publicTeamsHasMore {
                                        vm.publicTeamsCurrentPage += 1
                                        Task { await vm.loadPublicTeams() }
                                    }
                                } label: {
                                    HStack {
                                        Text("Next")
                                        Image(systemName: "chevron.right")
                                    }
                                    .font(.caption.bold())
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(vm.publicTeamsHasMore ? vm.activeTheme.primaryAccent : vm.activeTheme.surfaceVariant.opacity(0.3))
                                    .foregroundColor(vm.publicTeamsHasMore ? vm.activeTheme.onPrimary : vm.activeTheme.textSecondary)
                                    .cornerRadius(8)
                                }
                                .disabled(!vm.publicTeamsHasMore)
                            }
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }
                }
                .padding(.top, 10)
                .onChange(of: teamSearchText) { newValue in
                    vm.updateTeamSearch(newValue)
                }
            }
        }
        .sheet(isPresented: $showCreateTeam) {
            CreateTeamView(hackathonId: hackathonId)
                .environmentObject(vm)
                .preferredColorScheme(vm.activeTheme.isLight ? .light : .dark)
        }
        .sheet(isPresented: $showJoinTeam) {
            JoinTeamView(hackathonId: hackathonId)
                .environmentObject(vm)
                .preferredColorScheme(vm.activeTheme.isLight ? .light : .dark)
        }
        .sheet(isPresented: $showSubmission) {
            ProjectSubmissionView(hackathonId: hackathonId)
                .environmentObject(vm)
                .preferredColorScheme(vm.activeTheme.isLight ? .light : .dark)
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
    @State private var resume = ""
    @State private var skills = ""
    @State private var teamPreference = "Looking for Team"
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    
    var isProfileComplete: Bool {
        guard let p = vm.currentProfile else { return false }
        let hasBio = !(p.bio ?? "").trimmingCharacters(in: .whitespaces).isEmpty
        let hasGithub = !(p.githubUrl ?? "").trimmingCharacters(in: .whitespaces).isEmpty
        let hasResume = !(p.resumeUrl ?? "").trimmingCharacters(in: .whitespaces).isEmpty
        let hasSkills = !(p.skills ?? "").trimmingCharacters(in: .whitespaces).isEmpty
        return hasBio && hasGithub && hasResume && hasSkills
    }

    var body: some View {
        NavigationStack {
            Group {
                if !isProfileComplete {
                    EmptyStateView(
                        title: "Incomplete Profile",
                        systemImage: "person.crop.circle.badge.exclamationmark",
                        message: "Your profile is incomplete. Please ensure you have added your Bio, GitHub, Resume, and Skills before applying.",
                        theme: vm.activeTheme
                    )
                } else {
                    Form {
                        Section("Developer Profiles") {
                            TextField("GitHub Profile URL", text: $github)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.none)
                            
                            TextField("LinkedIn Profile URL", text: $linkedin)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.none)
                                
                            TextField("Resume URL", text: $resume)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.none)
                        }
                        .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                        
                        Section("Core Skills") {
                            TextField("Skills (comma-separated)", text: $skills)
                                .autocorrectionDisabled()
                        }
                        .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                        
                        Section(header: Text("Team Formation Preference"), footer: Text("You can override your default team preference for this specific hackathon.")) {
                            Picker("Preference", selection: $teamPreference) {
                                Text("Looking for a Team").tag("Looking for Team")
                                Text("Has a Team").tag("Has Team")
                                Text("Competing Solo").tag("Solo")
                            }
                        }
                        .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                        
                        if let errorMessage {
                            Section {
                                Text(errorMessage).foregroundColor(.red).bold()
                            }
                            .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                        }
                    }
                    .scrollContentBackground(.hidden)
                    .background(vm.activeTheme.background.ignoresSafeArea())
                }
            }
            .navigationTitle("Hacker Application")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(vm.activeTheme.primaryAccent)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if isProfileComplete {
                        Button(isSubmitting ? "Submitting..." : "Apply") {
                            Task { await submitApplication() }
                        }
                        .foregroundColor(vm.activeTheme.accentSecondary)
                        .fontWeight(.bold)
                        .disabled(isSubmitting || github.isEmpty || resume.isEmpty)
                    }
                }
            }
            .onAppear {
                if let p = vm.currentProfile {
                    github = p.githubUrl ?? ""
                    linkedin = p.linkedinUrl ?? ""
                    resume = p.resumeUrl ?? ""
                    skills = p.skills ?? ""
                    let pref = p.defaultTeamPreference ?? ""
                    let validTags = ["Looking for Team", "Has Team", "Solo"]
                    if validTags.contains(pref) {
                        teamPreference = pref
                    } else if pref == "JoinTeam" || pref == "Looking for a Team" {
                        teamPreference = "Looking for Team"
                    } else if pref == "CreateTeam" || pref == "Creating a Team" {
                        teamPreference = "Has Team"
                    } else {
                        teamPreference = "Looking for Team"
                    }
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
                    teamPreference: teamPreference,
                    resumeUrl: resume
                )
            )
            await vm.refreshSelectedHackathon()
            await vm.loadHackathons()
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
            .scrollContentBackground(.hidden)
            .background(vm.activeTheme.background.ignoresSafeArea())
            .navigationTitle("Initialize Team")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(vm.activeTheme.primaryAccent)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isLoading ? "Creating..." : "Create") {
                        Task { await performCreate() }
                    }
                    .foregroundColor(vm.activeTheme.accentSecondary)
                    .fontWeight(.bold)
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
            .scrollContentBackground(.hidden)
            .background(vm.activeTheme.background.ignoresSafeArea())
            .navigationTitle("Join Hacker Team")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(vm.activeTheme.primaryAccent)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isLoading ? "Joining..." : "Join") {
                        Task { await performJoin() }
                    }
                    .foregroundColor(vm.activeTheme.accentSecondary)
                    .fontWeight(.bold)
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
            .scrollContentBackground(.hidden)
            .background(vm.activeTheme.background.ignoresSafeArea())
            .navigationTitle("Submit Repository")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(vm.activeTheme.primaryAccent)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isLoading ? "Submitting..." : "Submit") {
                        Task { await performSubmit() }
                    }
                    .foregroundColor(vm.activeTheme.accentSecondary)
                    .fontWeight(.bold)
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
    let teamId: String
    
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
                                        .foregroundColor(vm.activeTheme.textSecondary)
                                        .padding(.leading, 5)
                                        .padding(.top, 8)
                                }
                            },
                            alignment: .topLeading
                        )
                }
                .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                
                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red).font(.footnote)
                }
            }
            .scrollContentBackground(.hidden)
            .background(vm.activeTheme.background.ignoresSafeArea())
            .navigationTitle("Request Support")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(vm.activeTheme.primaryAccent)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isLoading ? "Routing..." : "Request") {
                        Task { await performRequest() }
                    }
                    .foregroundColor(vm.activeTheme.accentSecondary)
                    .fontWeight(.bold)
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
            try await NetworkManager.shared.submitSupportTicket(hackathonId: hackathonId, teamId: teamId, description: description)
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
                if let hack = vm.selectedHackathon {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            if vm.selectedRegistration?.approvalStatus == "Accepted" {
                                HackathonTeamSectionView(hackathonId: hack.id)
                            } else {
                                EmptyStateView(
                                    title: "Access Restricted",
                                    systemImage: "lock.fill",
                                    message: "You must be approved for the hackathon to manage teams.",
                                    theme: vm.activeTheme
                                )
                            }
                        }
                        .padding()
                    }
                } else {
                    EmptyStateView(
                        title: "No Active Context",
                        systemImage: "person.3.fill",
                        message: "Go to the Hackathons tab and select an event to view or configure team status.",
                        theme: vm.activeTheme
                    )
                }
            }
            .matrixBackground(theme: vm.activeTheme)
            .navigationTitle("Team Workspace")
        }
    }
}

// MARK: - Profile View (Tab 3)
struct ProfileView: View {
    @EnvironmentObject var vm: AppViewModel
    @State private var showEditSheet = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header Card
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(vm.activeTheme.primaryAccent.opacity(0.15))
                                .frame(width: 80, height: 80)
                                .overlay(
                                    Circle()
                                        .stroke(vm.activeTheme.primaryAccent, lineWidth: 2)
                                )
                            Text(String(vm.currentUser?.name.prefix(2) ?? "H").uppercased())
                                .font(.system(size: 28, weight: .black, design: .rounded))
                                .foregroundColor(vm.activeTheme.textPrimary)
                        }
                        
                        Text(vm.currentUser?.name ?? "Hacker Name")
                            .font(.title2.bold())
                            .foregroundColor(vm.activeTheme.textPrimary)
                        
                        Text(vm.currentUser?.email ?? "email@address.com")
                            .font(.subheadline)
                            .foregroundColor(vm.activeTheme.textSecondary)
                        
                        if let role = vm.currentUser?.role {
                            Text(role.uppercased())
                                .font(.system(size: 10, weight: .black))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(vm.activeTheme.primaryAccent.opacity(0.2))
                                .foregroundColor(vm.activeTheme.primaryAccent)
                                .cornerRadius(6)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .glassCardStyle(theme: vm.activeTheme)
                    
                    // Glassy Bio Card (if not empty)
                    if let bio = vm.currentProfile?.bio, !bio.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "quote.opening")
                                    .foregroundColor(vm.activeTheme.primaryAccent)
                                    .font(.footnote)
                                Text("BIO")
                                    .font(.system(size: 11, weight: .black))
                                    .foregroundColor(vm.activeTheme.textSecondary)
                            }
                            Text(bio)
                                .font(.subheadline)
                                .foregroundColor(vm.activeTheme.textPrimary)
                                .lineSpacing(3)
                                .italic()
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .glassCardStyle(theme: vm.activeTheme)
                    }
                    
                    // Premium Interface Customization Theme Selector
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Interface Theme", systemImage: "paintpalette.fill")
                            .font(.headline)
                            .foregroundColor(vm.activeTheme.textPrimary)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(AppTheme.allCases) { themeOption in
                                    Button {
                                        withAnimation {
                                            vm.activeTheme = themeOption
                                        }
                                    } label: {
                                        VStack(alignment: .leading, spacing: 10) {
                                            HStack {
                                                Circle()
                                                    .fill(themeOption.primaryAccent)
                                                    .frame(width: 14, height: 14)
                                                Circle()
                                                    .fill(themeOption.accentSecondary)
                                                    .frame(width: 14, height: 14)
                                                Spacer()
                                                if vm.activeTheme == themeOption {
                                                    Image(systemName: "checkmark.circle.fill")
                                                        .foregroundColor(themeOption.accentSecondary)
                                                        .font(.caption)
                                                }
                                            }
                                            
                                            Text(themeOption.rawValue)
                                                .font(.caption.bold())
                                                .foregroundColor(themeOption.textPrimary)
                                        }
                                        .frame(width: 110, height: 60)
                                        .padding()
                                        .background(themeOption.background.opacity(0.8))
                                        .cornerRadius(16)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 16)
                                                .stroke(vm.activeTheme == themeOption ? themeOption.primaryAccent : Color.white.opacity(0.12), lineWidth: 2)
                                        )
                                    }
                                    .buttonStyle(ScaleButtonStyle())
                                }
                            }
                        }
                    }
                    
                    // Detailed Hacker Portfolio display
                    VStack(alignment: .leading, spacing: 16) {
                        ProfileInfoSection(title: "Personal & Logistics", theme: vm.activeTheme) {
                            ProfileInfoRow(icon: "person.fill", label: "Gender", value: vm.currentProfile?.gender)
                            ProfileInfoRow(icon: "tshirt.fill", label: "T-Shirt Size", value: vm.currentProfile?.tshirtSize)
                            ProfileInfoRow(icon: "phone.fill", label: "Phone", value: vm.currentProfile?.phoneNumber)
                            ProfileInfoRow(icon: "mappin.circle.fill", label: "City", value: vm.currentProfile?.city)
                        }
                        
                        ProfileInfoSection(title: "Emergency Contacts", theme: vm.activeTheme) {
                            ProfileInfoRow(icon: "phone.bubble.left.fill", label: "Contact Name", value: vm.currentProfile?.emergencyContactName)
                            ProfileInfoRow(icon: "phone.circle.fill", label: "Contact Phone", value: vm.currentProfile?.emergencyContactNumber)
                        }
                        
                        ProfileInfoSection(title: "Education & Institution", theme: vm.activeTheme) {
                            if vm.currentProfile?.hasFormalEducation == true {
                                ProfileInfoRow(icon: "building.columns.fill", label: "Institution", value: vm.currentProfile?.institution)
                                ProfileInfoRow(icon: "academicclass.fill", label: "Degree", value: vm.currentProfile?.degreeType)
                                ProfileInfoRow(icon: "book.fill", label: "Field", value: vm.currentProfile?.fieldOfStudy)
                                let yearStr = vm.currentProfile?.gradYear != nil && vm.currentProfile!.gradYear! > 0 ? String(vm.currentProfile!.gradYear!) : ""
                                ProfileInfoRow(icon: "calendar", label: "Graduation", value: "\(vm.currentProfile?.gradMonth ?? "") \(yearStr)")
                            } else {
                                ProfileInfoRow(icon: "xmark.circle.fill", label: "Formal Education", value: "No formal education")
                            }
                        }
                        
                        ProfileInfoSection(title: "Preferences & Dietary", theme: vm.activeTheme) {
                            ProfileInfoRow(icon: "fork.knife", label: "Dietary Pref", value: vm.currentProfile?.dietaryPreference)
                            ProfileInfoRow(icon: "medical.tape", label: "Allergies", value: vm.currentProfile?.allergies)
                        }
                        
                        ProfileInfoSection(title: "Portfolios & CV", theme: vm.activeTheme) {
                            ProfileInfoRow(icon: "link", label: "GitHub", value: vm.currentProfile?.githubUrl, isLink: true)
                            ProfileInfoRow(icon: "link", label: "LinkedIn", value: vm.currentProfile?.linkedinUrl, isLink: true)
                            ProfileInfoRow(icon: "doc.text.fill", label: "Resume", value: vm.currentProfile?.resumeUrl, isLink: true)
                            ProfileInfoRow(icon: "cpu", label: "Skills", value: vm.currentProfile?.skills)
                        }
                    }
                    
                    Button(role: .destructive) {
                        vm.logout()
                    } label: {
                        HStack {
                            Image(systemName: "power")
                            Text("Sign Out / Wipe Session")
                                .fontWeight(.bold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red.opacity(0.12))
                        .foregroundColor(.red)
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.red.opacity(0.2), lineWidth: 1)
                        )
                    }
                    .buttonStyle(ScaleButtonStyle())
                    .padding(.top, 10)
                }
                .padding()
            }
            .matrixBackground(theme: vm.activeTheme)
            .navigationTitle("Hacker Portfolio")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showEditSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "pencil")
                            Text("Edit")
                                .fontWeight(.bold)
                        }
                        .foregroundColor(vm.activeTheme.accentSecondary)
                    }
                    .buttonStyle(ScaleButtonStyle())
                }
            }
            .sheet(isPresented: $showEditSheet) {
                EditProfileView()
                    .environmentObject(vm)
                    .preferredColorScheme(vm.activeTheme == .appleClean ? .light : .dark)
            }
        }
    }
}

// MARK: - Edit Profile Sheet View
struct EditProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var vm: AppViewModel
    
    @State private var bio = ""
    @State private var city = ""
    @State private var gender = "Male"
    @State private var tshirtSize = "M"
    @State private var phoneNumber = ""
    @State private var emergencyContactName = ""
    @State private var emergencyContactNumber = ""
    
    @State private var hasFormalEducation = true
    @State private var institution = ""
    @State private var degreeType = "Bachelors"
    @State private var fieldOfStudy = ""
    @State private var gradYearStr = ""
    @State private var gradMonth = "May"
    
    @State private var dietaryPreference = "No Restrictions"
    @State private var allergies = ""
    @State private var githubUrl = ""
    @State private var linkedinUrl = ""
    @State private var resumeUrl = ""
    @State private var skills = ""
    
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    let genders = ["Male", "Female", "Non-Binary", "Prefer not to say"]
    let tshirtSizes = ["S", "M", "L", "XL", "XXL"]
    let degrees = ["High School", "Bachelors", "Masters", "PhD"]
    let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    let dietaryPreferences = ["No Restrictions", "Vegetarian", "Non-Vegetarian", "Vegan", "Jain", "Halal"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Personal Details") {
                    TextField("Tell us about yourself...", text: $bio)
                    TextField("City", text: $city)
                    TextField("Phone Number", text: $phoneNumber)
                        .keyboardType(.phonePad)
                    
                    Picker("Gender", selection: $gender) {
                        ForEach(genders, id: \.self) { g in Text(g).tag(g) }
                    }
                    
                    Picker("T-Shirt Size", selection: $tshirtSize) {
                        ForEach(tshirtSizes, id: \.self) { s in Text(s).tag(s) }
                    }
                }
                .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                
                Section("Emergency Contacts") {
                    TextField("Contact Name", text: $emergencyContactName)
                    TextField("Contact Phone", text: $emergencyContactNumber)
                        .keyboardType(.phonePad)
                }
                .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                
                Section {
                    Toggle("Has Formal Education", isOn: $hasFormalEducation)
                    
                    if hasFormalEducation {
                        TextField("School / University Name", text: $institution)
                        
                        Picker("Degree", selection: $degreeType) {
                            ForEach(degrees, id: \.self) { d in Text(d).tag(d) }
                        }
                        
                        TextField("Field of Study", text: $fieldOfStudy)
                        TextField("Graduation Year", text: $gradYearStr)
                            .keyboardType(.numberPad)
                        
                        Picker("Graduation Month", selection: $gradMonth) {
                            ForEach(months, id: \.self) { m in Text(m).tag(m) }
                        }
                    }
                } header: {
                    Text("Academic Background")
                }
                .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                
                Section("Hackathon Preferences") {
                    Picker("Dietary Preference", selection: $dietaryPreference) {
                        ForEach(dietaryPreferences, id: \.self) { d in Text(d).tag(d) }
                    }
                    
                    TextField("Allergies / Restrictions", text: $allergies)
                }
                .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                
                Section("Socials & Portfolios") {
                    TextField("GitHub Profile URL", text: $githubUrl)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.none)
                    
                    TextField("LinkedIn Profile URL", text: $linkedinUrl)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.none)
                    
                    TextField("Resume Link (PDF URL)", text: $resumeUrl)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.none)
                    
                    TextField("Skills (comma-separated, e.g. iOS, Go)", text: $skills)
                        .autocorrectionDisabled()
                }
                .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                
                if let errorMessage {
                    Section {
                        Text(errorMessage).foregroundColor(.red).bold()
                    }
                    .listRowBackground(vm.activeTheme.surface.opacity(0.4))
                }
            }
            .scrollContentBackground(.hidden)
            .background(vm.activeTheme.background.ignoresSafeArea())
            .navigationTitle("Update Portfolio")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(vm.activeTheme.primaryAccent)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(isSaving ? "Saving..." : "Save") {
                        Task { await performSave() }
                    }
                    .foregroundColor(vm.activeTheme.accentSecondary)
                    .fontWeight(.bold)
                    .disabled(isSaving)
                }
            }
            .onAppear {
                if let p = vm.currentProfile {
                    bio = p.bio ?? ""
                    city = p.city ?? ""
                    gender = p.gender ?? "Male"
                    tshirtSize = p.tshirtSize ?? "M"
                    phoneNumber = p.phoneNumber ?? ""
                    emergencyContactName = p.emergencyContactName ?? ""
                    emergencyContactNumber = p.emergencyContactNumber ?? ""
                    
                    hasFormalEducation = p.hasFormalEducation
                    institution = p.institution ?? ""
                    degreeType = p.degreeType ?? "Bachelors"
                    fieldOfStudy = p.fieldOfStudy ?? ""
                    gradYearStr = p.gradYear != nil && p.gradYear! > 0 ? String(p.gradYear!) : ""
                    gradMonth = p.gradMonth ?? "May"
                    
                    dietaryPreference = p.dietaryPreference ?? "No Restrictions"
                    allergies = p.allergies ?? ""
                    githubUrl = p.githubUrl ?? ""
                    linkedinUrl = p.linkedinUrl ?? ""
                    resumeUrl = p.resumeUrl ?? ""
                    skills = p.skills ?? ""
                }
            }
        }
    }
    
    private func performSave() async {
        isSaving = true
        defer { isSaving = false }
        errorMessage = nil
        
        let gradYear = Int(gradYearStr) ?? 0
        
        let updateRequest = HackerProfile(
            userId: vm.currentProfile?.userId,
            gender: gender,
            tshirtSize: tshirtSize,
            city: city,
            phoneNumber: phoneNumber,
            emergencyContactName: emergencyContactName,
            emergencyContactNumber: emergencyContactNumber,
            bio: bio,
            readmeMd: vm.currentProfile?.readmeMd,
            hasFormalEducation: hasFormalEducation,
            degreeType: hasFormalEducation ? degreeType : "",
            institution: hasFormalEducation ? institution : "",
            fieldOfStudy: hasFormalEducation ? fieldOfStudy : "",
            gradYear: hasFormalEducation ? gradYear : 0,
            gradMonth: hasFormalEducation ? gradMonth : "",
            dietaryPreference: dietaryPreference,
            allergies: allergies,
            githubUrl: githubUrl,
            linkedinUrl: linkedinUrl,
            resumeUrl: resumeUrl,
            skills: skills,
            defaultTeamPreference: vm.currentProfile?.defaultTeamPreference,
            industry: vm.currentProfile?.industry,
            yearsOfExperience: vm.currentProfile?.yearsOfExperience,
            mentorExpertise: vm.currentProfile?.mentorExpertise
        )
        
        do {
            await vm.saveProfile(profile: updateRequest)
            if vm.authError == nil {
                dismiss()
            } else {
                errorMessage = vm.authError
            }
        }
    }
}

// MARK: - Shared UI Sub-components
struct ProfileInfoSection<Content: View>: View {
    let title: String
    let theme: AppTheme
    let content: Content
    
    init(title: String, theme: AppTheme, @ViewBuilder content: () -> Content) {
        self.title = title
        self.theme = theme
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.subheadline.bold())
                .foregroundColor(theme.textSecondary)
                .padding(.leading, 4)
            
            VStack(spacing: 12) {
                content
            }
            .glassCardStyle(theme: theme)
        }
    }
}

struct ProfileInfoRow: View {
    let icon: String
    let label: String
    let value: String?
    var isLink: Bool = false
    @EnvironmentObject var vm: AppViewModel
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(vm.activeTheme.textSecondary)
                .frame(width: 20)
            
            Text(label)
                .foregroundColor(vm.activeTheme.textSecondary)
                .font(.subheadline)
            
            Spacer()
            
            let displayVal = (value ?? "").isEmpty ? "—" : value!
            if isLink && displayVal != "—" {
                Link(destination: URL(string: displayVal.hasPrefix("http") ? displayVal : "https://\(displayVal)") ?? URL(string: "https://google.com")!) {
                    HStack(spacing: 4) {
                        Text(displayVal)
                            .lineLimit(1)
                            .truncationMode(.middle)
                        Image(systemName: "arrow.up.right.square")
                            .font(.caption)
                    }
                    .font(.subheadline.bold())
                    .foregroundColor(Color(hex: "0EA5E9"))
                }
            } else {
                Text(displayVal)
                    .foregroundColor(vm.activeTheme.textPrimary)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
        }
        .padding(.vertical, 2)
    }
}


// MARK: - Meta Info Cell
struct MetaInfoCell: View {
    let icon: String
    let label: String
    let value: String
    let theme: AppTheme
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(theme.primaryAccent)
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundColor(theme.textPrimary)
                .lineLimit(1)
            Text(label)
                .font(.system(size: 10))
                .foregroundColor(theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Dashboard Metric Card
struct DashboardMetricCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    let theme: AppTheme
    
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
                    .font(.system(.title2, design: .rounded).bold())
                    .foregroundColor(theme.textPrimary)
                Text(title)
                    .font(.system(size: 10))
                    .foregroundColor(theme.textSecondary)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCardStyle(theme: theme)
    }
}

// MARK: - Section Header
struct SectionHeader: View {
    let title: String
    let icon: String
    let theme: AppTheme
    
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundColor(theme.primaryAccent)
            Text(title)
                .font(.system(.headline, design: .rounded).bold())
                .foregroundColor(theme.textPrimary)
        }
    }
}

// MARK: - Rich Hackathon Section Component
struct RichHackathonSection: View {
    let title: String
    let icon: String
    let content: String?
    let theme: AppTheme
    
    var body: some View {
        if let content = content, !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader(title: title, icon: icon, theme: theme)
                
                if content.hasPrefix("[") && content.hasSuffix("]"),
                   let data = content.data(using: .utf8),
                   let array = try? JSONDecoder().decode([String].self, from: data) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(array, id: \.self) { item in
                                Text(item)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(theme.primaryAccent)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(theme.primaryAccent.opacity(0.12))
                                    .cornerRadius(8)
                            }
                        }
                    }
                } else {
                    Text(content)
                        .font(.subheadline)
                        .foregroundColor(theme.textSecondary)
                        .lineSpacing(5)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.surface.opacity(0.5))
            .cornerRadius(18)
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(theme.primaryAccent.opacity(0.12), lineWidth: 1)
            )
        }
    }
}

struct ChecklistItem: View {
    let title: String
    let isDone: Bool
    let theme: AppTheme
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                .foregroundColor(isDone ? theme.accentSecondary : theme.textSecondary)
                .font(.title3)
            
            Text(title)
                .font(.subheadline)
                .foregroundColor(isDone ? theme.textPrimary : theme.textSecondary)
            
            Spacer()
        }
        .padding()
        .background(theme.surfaceVariant.opacity(0.3))
        .cornerRadius(12)
    }
}

struct StatusBadge: View {
    let status: String?
    
    private var displayStatus: String { status ?? "Not Applied" }
    
    private var badgeColor: Color {
        switch displayStatus.lowercased() {
        case "accepted": return Color(hex: "10B981")
        case "pending": return .orange
        case "rejected": return .red
        default: return Color(hex: "0EA5E9")
        }
    }
    
    var body: some View {
        Text(displayStatus.uppercased())
            .font(.system(size: 10).bold())
            .foregroundColor(badgeColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(badgeColor.opacity(0.15))
            .clipShape(Capsule())
    }
}

struct EmptyStateView: View {
    let title: String
    let systemImage: String
    let message: String
    let theme: AppTheme
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: systemImage)
                .font(.system(size: 44))
                .foregroundColor(theme.textSecondary)
            
            Text(title)
                .font(.headline)
                .foregroundColor(theme.textPrimary)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .glassCardStyle(theme: theme)
        .padding()
    }
}
