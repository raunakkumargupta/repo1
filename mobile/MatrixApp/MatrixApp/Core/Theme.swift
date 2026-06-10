import SwiftUI

extension Color {
    static let background = Color(hex: "050B1A")
    static let surface = Color(hex: "0F1A36")
    static let surfaceVariant = Color(hex: "102644")
    static let textPrimary = Color(hex: "EAF2FF")
    static let textSecondary = Color(hex: "A5B8D5")
    static let primaryAccent = Color(hex: "0EA5E9")
    static let accentSecondary = Color(hex: "14B8A6")

    init(hex: String) { let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted); var int: UInt64 = 0; Scanner(string: hex).scanHexInt64(&int); self.init(red: Double((int >> 16) & 0xff)/255, green: Double((int >> 8) & 0xff)/255, blue: Double(int & 0xff)/255) }
}

struct GlassCard: ViewModifier { func body(content: Content) -> some View { content.padding().background(Color.surface.opacity(0.6)).background(.ultraThinMaterial).overlay(RoundedRectangle(cornerRadius: 20).stroke(.white.opacity(0.15))).clipShape(RoundedRectangle(cornerRadius: 20)) } }
