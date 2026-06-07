import SwiftUI

struct DashboardView: View {
    @Binding var isLoggedIn: Bool
    @State private var showTicketModal = false
    @State private var ticketDescription = ""
    @State private var isSubmitting = false
    @State private var alertMessage = ""
    @State private var showAlert = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.theme.background.edgesIgnoringSafeArea(.all)
                
                VStack(spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Participant Dashboard")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(Color.theme.textPrimary)
                        Text("Manage your team and requests")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Status: Active")
                            .fontWeight(.bold)
                            .foregroundColor(Color.theme.textPrimary)
                        Text("Your team is currently operating normally.")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.theme.surface)
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    Spacer()
                }
                .padding(.top, 20)
                
                // Floating Action Button
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button(action: {
                            ticketDescription = ""
                            showTicketModal = true
                        }) {
                            Image(systemName: "envelope.fill")
                                .font(.title.weight(.semibold))
                                .padding()
                                .background(Color.theme.primaryAccent)
                                .foregroundColor(.white)
                                .clipShape(Circle())
                                .shadow(radius: 4, x: 0, y: 4)
                        }
                        .padding()
                        // Native micro-interaction
                        .buttonStyle(ScaleButtonStyle())
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Logout") {
                        KeychainHelper.standard.delete(service: "matrix-jwt", account: "user")
                        isLoggedIn = false
                    }
                    .foregroundColor(Color.theme.destructive)
                }
            }
            // Native Alert with TextField (iOS 15+)
            .alert("Request Technical Mentor", isPresented: $showTicketModal) {
                TextField("e.g. My Redis container is failing", text: $ticketDescription)
                Button("Submit", action: submitTicket)
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("Describe your technical issue:")
            }
            .alert(isPresented: $showAlert) {
                Alert(title: Text("Notice"), message: Text(alertMessage), dismissButton: .default(Text("OK")))
            }
        }
    }
    
    func submitTicket() {
        guard !ticketDescription.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        
        let payload = ["description": ticketDescription]
        
        NetworkManager.shared.request(endpoint: "tickets", method: "POST", body: payload) { result in
            switch result {
            case .success(_):
                alertMessage = "Ticket submitted successfully!"
                showAlert = true
            case .failure(let error):
                alertMessage = "Failed to submit: \(error.localizedDescription)"
                showAlert = true
            }
        }
    }
}

// Custom ButtonStyle for press scaling effect
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.92 : 1)
            .animation(.easeInOut(duration: 0.2), value: configuration.isPressed)
    }
}
