import SwiftUI

@main
struct DiamondTrackerApp: App {
    @StateObject private var authService = AuthService.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
                .preferredColorScheme(.light) // Match web app
        }
    }
}

