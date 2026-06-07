import SwiftUI

extension Color {
    static let theme = ColorTheme()
}

struct ColorTheme {
    // Light Mode Nordic Slate / Dark Mode Gunmetal Obsidian mappings
    let background = Color("Background") // Add to Assets: Light #FFFFFF / Dark #0B0F19
    let surface = Color("Surface")       // Add to Assets: Light #F1F5F9 / Dark #1E293B
    let textPrimary = Color("TextPrimary") // Add to Assets: Light #0F172A / Dark #F1F5F9
    let primaryAccent = Color("PrimaryAccent") // Add to Assets: Light #1E3A8A / Dark #3B82F6
    let destructive = Color("Destructive") // Add to Assets: Light #DC2626 / Dark #EF4444
}

// Note: Ensure you create Color Sets in your Assets.xcassets named exactly as above
// and configure their Any Appearance (Light) and Dark Appearance hex codes.
