import SwiftUI

struct NotificationCenterView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var vm: AppViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if vm.selectedAnnouncements.isEmpty {
                        EmptyStateView(
                            title: "No Notifications",
                            systemImage: "bell.slash.fill",
                            message: "Official hackathon broadcasts and updates will appear here."
                        )
                    } else {
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Official Announcements")
                                .font(.headline)
                                .foregroundColor(Color.textPrimary)
                                .padding(.horizontal)
                                .padding(.top, 10)
                            
                            ForEach(vm.selectedAnnouncements) { announcement in
                                HStack(alignment: .top, spacing: 14) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.primaryAccent.opacity(0.15))
                                            .frame(width: 40, height: 40)
                                        Image(systemName: "megaphone.fill")
                                            .foregroundColor(Color.primaryAccent)
                                            .font(.footnote)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Event Update")
                                            .font(.subheadline.bold())
                                            .foregroundColor(Color.textPrimary)
                                        Text(announcement.message)
                                            .font(.footnote)
                                            .foregroundColor(Color.textSecondary)
                                            .lineSpacing(3)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .glassCardStyle()
                            }
                        }
                        .padding()
                    }
                }
            }
            .matrixBackground()
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable {
                if let id = vm.selectedHackathon?.id {
                    await vm.loadSelectedHackathonDetails(id: id)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(Color.primaryAccent)
                    .fontWeight(.bold)
                }
            }
        }
    }
}
