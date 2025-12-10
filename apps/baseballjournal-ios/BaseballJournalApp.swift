import SwiftUI

@main
struct BaseballJournalApp: App {
    @StateObject private var appViewModel = AppViewModel()
    
    var body: some Scene {
        WindowGroup {
            Group {
                switch appViewModel.appState {
                case .loading:
                    ZStack {
                        AppColors.background.ignoresSafeArea()
                        VStack(spacing: AppSpacing.md) {
                            Image(systemName: "baseball.fill")
                                .font(.system(size: 48))
                                .foregroundColor(AppColors.primary)
                            ProgressView()
                        }
                    }
                case .unauthenticated:
                    LoginView()
                        .environmentObject(appViewModel) // Pass ViewModel if needed or AuthService
                case .authenticated:
                    if appViewModel.userRole == .coach {
                        CoachTabsView()
                            .environmentObject(appViewModel)
                    } else {
                        PlayerTabsView()
                            .environmentObject(appViewModel)
                    }
                }
            }
            .animation(.easeInOut, value: appViewModel.appState != .loading)
        }
    }
}
