import SwiftUI

@main
struct BaseballJournalApp: App {
    @StateObject private var authService = AuthService.shared
    
    var body: some Scene {
        WindowGroup {
            Group {
                if authService.isLoading {
                    // Loading state
                    ZStack {
                        AppColors.background.ignoresSafeArea()
                        VStack(spacing: AppSpacing.md) {
                            Image(systemName: "baseball.fill")
                                .font(.system(size: 48))
                                .foregroundColor(AppColors.primary)
                            ProgressView()
                        }
                    }
                } else if authService.isAuthenticated {
                    // Main app
                    MainTabView()
                        .environmentObject(authService)
                } else {
                    // Login
                    LoginView()
                }
            }
        }
    }
}
