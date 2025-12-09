import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authService: AuthService
    
    var body: some View {
        Group {
            if authService.isLoading {
                ProgressView("Loading...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.background)
            } else if authService.currentUser != nil {
                MainTabView()
            } else {
                LoginView()
            }
        }
    }
}

