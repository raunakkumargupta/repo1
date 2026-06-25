import SwiftUI

// MARK: - AI Chatbot Floating Widget + Chat View
// A floating button (bottom-right corner) that opens a Groq-powered AI assistant.
// Present on all tabs. No CometChat dependency — calls backend directly.

struct AIChatBotWidget: View {
    @State private var isOpen = false
    
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            // Floating button
            Button {
                withAnimation(.spring(response: 0.3)) {
                    isOpen = true
                }
            } label: {
                ZStack {
                    Circle()
                        .fill(LinearGradient(
                            colors: [Color(hex: "0EA5E9"), Color(hex: "14B8A6")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 56, height: 56)
                        .shadow(color: Color(hex: "0EA5E9").opacity(0.4), radius: 8, x: 0, y: 4)
                    
                    Image(systemName: "sparkles")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
            .padding(.trailing, 20)
            .padding(.bottom, 20)
        }
        .sheet(isPresented: $isOpen) {
            AIChatView()
        }
    }
}

// MARK: - Chat Message Model
struct ChatMessage: Identifiable {
    let id = UUID()
    let role: String // "user" or "assistant"
    let content: String
    let timestamp: Date
}

// MARK: - AI Chat View
struct AIChatView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var messages: [ChatMessage] = [
        ChatMessage(role: "assistant", content: "Hey! 👋 I'm Matrix AI Assistant. Ask me anything about the hackathon — schedules, coding help, team formation tips, or just chat!", timestamp: Date())
    ]
    @State private var inputText = ""
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Messages list
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(messages) { msg in
                                ChatBubble(message: msg)
                                    .id(msg.id)
                            }
                            if isLoading {
                                HStack {
                                    TypingIndicator()
                                    Spacer()
                                }
                                .padding(.horizontal)
                                .id("loading")
                            }
                        }
                        .padding(.vertical, 12)
                    }
                    .onChange(of: messages.count) { _ in
                        withAnimation {
                            if let lastID = messages.last?.id {
                                proxy.scrollTo(lastID, anchor: .bottom)
                            }
                        }
                    }
                }
                
                Divider()
                
                // Input bar
                HStack(spacing: 12) {
                    TextField("Ask me anything...", text: $inputText)
                        .textFieldStyle(.plain)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color(.systemGray6))
                        .cornerRadius(20)
                    
                    Button {
                        sendMessage()
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(inputText.isEmpty ? .gray : Color(hex: "0EA5E9"))
                    }
                    .disabled(inputText.isEmpty || isLoading)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
            .navigationTitle("Matrix AI Assistant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
    
    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        
        let userMsg = ChatMessage(role: "user", content: text, timestamp: Date())
        messages.append(userMsg)
        inputText = ""
        isLoading = true
        
        Task {
            let reply = await callChatbotAPI(message: text)
            await MainActor.run {
                isLoading = false
                messages.append(ChatMessage(role: "assistant", content: reply, timestamp: Date()))
            }
        }
    }
    
    private func callChatbotAPI(message: String) async -> String {
        do {
            return try await NetworkManager.shared.queryChatbot(message: message)
        } catch {
            return "I'm having trouble connecting right now. Please try again."
        }
    }
}

// MARK: - Chat Bubble View
struct ChatBubble: View {
    let message: ChatMessage
    
    var isUser: Bool { message.role == "user" }
    
    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 60) }
            
            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.body)
                    .foregroundColor(isUser ? .white : .primary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        isUser
                            ? AnyShapeStyle(LinearGradient(colors: [Color(hex: "0EA5E9"), Color(hex: "0284C7")], startPoint: .topLeading, endPoint: .bottomTrailing))
                            : AnyShapeStyle(Color(.systemGray6))
                    )
                    .cornerRadius(18)
            }
            
            if !isUser { Spacer(minLength: 60) }
        }
        .padding(.horizontal)
    }
}

// MARK: - Typing Indicator
struct TypingIndicator: View {
    @State private var dotScale: [CGFloat] = [0.5, 0.5, 0.5]
    
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .fill(Color.gray)
                    .frame(width: 8, height: 8)
                    .scaleEffect(dotScale[i])
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
        .cornerRadius(18)
        .padding(.horizontal)
        .onAppear {
            for i in 0..<3 {
                withAnimation(.easeInOut(duration: 0.5).repeatForever().delay(Double(i) * 0.15)) {
                    dotScale[i] = 1.0
                }
            }
        }
    }
}
