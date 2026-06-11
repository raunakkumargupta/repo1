import SwiftUI

enum AppTheme: String, CaseIterable, Identifiable, Codable {
    case norseObsidian = "Norse Obsidian"
    case cyberpunkNeon = "Cyberpunk Neon"
    case classicMatrix = "Classic Matrix"
    case deepOceanic = "Deep Oceanic"
    case royalAmethyst = "Royal Amethyst"
    case appleClean = "Apple Clean"
    
    var id: String { rawValue }
    
    var background: Color {
        switch self {
        case .norseObsidian: return Color(hex: "050B1A")
        case .cyberpunkNeon: return Color(hex: "0B0813")
        case .classicMatrix: return Color(hex: "030502")
        case .deepOceanic: return Color(hex: "021526")
        case .royalAmethyst: return Color(hex: "0E0516")
        case .appleClean: return Color(hex: "F2F2F7")
        }
    }
    
    var backgroundEnd: Color {
        switch self {
        case .norseObsidian: return Color(hex: "0B1325")
        case .cyberpunkNeon: return Color(hex: "1A0B2E")
        case .classicMatrix: return Color(hex: "0A1208")
        case .deepOceanic: return Color(hex: "092635")
        case .royalAmethyst: return Color(hex: "1F0F3D")
        case .appleClean: return Color(hex: "FFFFFF")
        }
    }
    
    var surface: Color {
        switch self {
        case .norseObsidian: return Color(hex: "0F1A36")
        case .cyberpunkNeon: return Color(hex: "1E1233")
        case .classicMatrix: return Color(hex: "0D1A0A")
        case .deepOceanic: return Color(hex: "113946")
        case .royalAmethyst: return Color(hex: "241442")
        case .appleClean: return Color(hex: "FFFFFF")
        }
    }
    
    var surfaceVariant: Color {
        switch self {
        case .norseObsidian: return Color(hex: "102644")
        case .cyberpunkNeon: return Color(hex: "2A1B44")
        case .classicMatrix: return Color(hex: "142B10")
        case .deepOceanic: return Color(hex: "1B4D5C")
        case .royalAmethyst: return Color(hex: "341E5C")
        case .appleClean: return Color(hex: "E5E5EA")
        }
    }
    
    var primaryAccent: Color {
        switch self {
        case .norseObsidian: return Color(hex: "0EA5E9")
        case .cyberpunkNeon: return Color(hex: "FF007F")
        case .classicMatrix: return Color(hex: "39FF14")
        case .deepOceanic: return Color(hex: "00ADB5")
        case .royalAmethyst: return Color(hex: "A855F7")
        case .appleClean: return Color(hex: "007AFF")
        }
    }
    
    var accentSecondary: Color {
        switch self {
        case .norseObsidian: return Color(hex: "14B8A6")
        case .cyberpunkNeon: return Color(hex: "00F0FF")
        case .classicMatrix: return Color(hex: "00FF66")
        case .deepOceanic: return Color(hex: "38BDF8")
        case .royalAmethyst: return Color(hex: "F472B6")
        case .appleClean: return Color(hex: "5856D6")
        }
    }
    
    var textPrimary: Color {
        switch self {
        case .norseObsidian: return Color(hex: "EAF2FF")
        case .cyberpunkNeon: return Color(hex: "FDE8FF")
        case .classicMatrix: return Color(hex: "EEFFEE")
        case .deepOceanic: return Color(hex: "E0F4FF")
        case .royalAmethyst: return Color(hex: "F9F5FF")
        case .appleClean: return Color(hex: "000000")
        }
    }
    
    var onPrimary: Color {
        switch self {
        case .classicMatrix: return Color(hex: "030502") // dark text for high contrast on neon green
        case .cyberpunkNeon: return Color(hex: "FFFFFF")
        case .norseObsidian: return Color(hex: "FFFFFF")
        case .deepOceanic: return Color(hex: "FFFFFF")
        case .royalAmethyst: return Color(hex: "FFFFFF")
        case .appleClean: return Color(hex: "FFFFFF")
        }
    }
    
    var textSecondary: Color {
        switch self {
        case .norseObsidian: return Color(hex: "A5B8D5")
        case .cyberpunkNeon: return Color(hex: "C3A3D8")
        case .classicMatrix: return Color(hex: "88CC88")
        case .deepOceanic: return Color(hex: "A6C6D8")
        case .royalAmethyst: return Color(hex: "C2A5DB")
        case .appleClean: return Color(hex: "8E8E93")
        }
    }
}

extension Color {
    static let background = Color(hex: "050B1A")
    static let surface = Color(hex: "0F1A36")
    static let surfaceVariant = Color(hex: "102644")
    static let textPrimary = Color(hex: "EAF2FF")
    static let textSecondary = Color(hex: "A5B8D5")
    static let primaryAccent = Color(hex: "0EA5E9")
    static let accentSecondary = Color(hex: "14B8A6")

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        self.init(
            red: Double((int >> 16) & 0xff)/255,
            green: Double((int >> 8) & 0xff)/255,
            blue: Double(int & 0xff)/255
        )
    }
}

struct GlassCard: ViewModifier {
    let theme: AppTheme
    
    func body(content: Content) -> some View {
        content
            .padding()
            .background(theme.surface.opacity(0.6))
            .background(.ultraThinMaterial)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(theme.textPrimary.opacity(0.1), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .shadow(color: Color.black.opacity(theme == .appleClean ? 0.05 : 0.2), radius: 10, x: 0, y: 5)
    }
}

struct MatrixBackgroundModifier: ViewModifier {
    let theme: AppTheme
    
    func body(content: Content) -> some View {
        ZStack {
            // Base linear gradient
            LinearGradient(
                gradient: Gradient(colors: [theme.background, theme.backgroundEnd]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            // Subtle, digital grid overlay
            GeometryReader { geo in
                Path { path in
                    let step = 35.0
                    // Draw vertical grid lines
                    for x in stride(from: 0.0, to: geo.size.width, by: step) {
                        path.move(to: CGPoint(x: x, y: 0))
                        path.addLine(to: CGPoint(x: x, y: geo.size.height))
                    }
                    // Draw horizontal grid lines
                    for y in stride(from: 0.0, to: geo.size.height, by: step) {
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: geo.size.width, y: y))
                    }
                }
                .stroke(theme.primaryAccent.opacity(0.04), lineWidth: 1)
            }
            .ignoresSafeArea()
            
            // Glowing neon ambient bubbles
            VStack {
                HStack {
                    Circle()
                        .fill(theme.primaryAccent.opacity(0.08))
                        .frame(width: 320, height: 320)
                        .blur(radius: 80)
                        .offset(x: -60, y: -60)
                    Spacer()
                }
                Spacer()
                HStack {
                    Spacer()
                    Circle()
                        .fill(theme.accentSecondary.opacity(0.06))
                        .frame(width: 280, height: 280)
                        .blur(radius: 70)
                        .offset(x: 60, y: 60)
                }
            }
            .ignoresSafeArea()
            
            content
        }
    }
}

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.25, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

extension View {
    func glassCardStyle(theme: AppTheme) -> some View {
        self.modifier(GlassCard(theme: theme))
    }
    
    func glassCardStyle() -> some View {
        self.modifier(GlassCard(theme: .norseObsidian))
    }
    
    func matrixBackground(theme: AppTheme) -> some View {
        self.modifier(MatrixBackgroundModifier(theme: theme))
    }
    
    func matrixBackground() -> some View {
        self.matrixBackground(theme: .norseObsidian)
    }
}
