import SwiftUI

struct NotificationCenterView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var vm: AppViewModel

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                if vm.announcements.isEmpty {
                    EmptyStateCard(title: "No Notifications", icon: "bell.slash", message: "Announcements and updates will appear here.")
                } else {
                    MatrixCard {
                        SectionHeader(title: "Recent Notifications", subtitle: nil)
                        ForEach(Array(vm.announcements.prefix(10)), id: \.message) { announcement in
                            VStack(alignment: .leading, spacing: 4) {
                                Label("Announcement", systemImage: "megaphone.fill")
                                Text("Announcement").font(.headline)
                                Text(announcement.message).font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Notifications")
            .refreshable {
                await vm.loadAnnouncements()
                await vm.loadMyTeam()
                await vm.loadRegistrationStatus()
            }
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } } }
        }
    }
}
