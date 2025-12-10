import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authService: AuthService
    
    var body: some View {
        Group {
            if let user = authService.currentUser {
                if user.role == .player {
                    PlayerTabView()
                } else if user.role == .coach {
                    CoachTabView()
                } else {
                    // Fallback - should not happen
                    Text("Unknown role")
                }
            } else {
                LoginView()
            }
        }
    }
}

struct PlayerTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            PlayerDashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "house.fill")
                }
                .tag(0)
            
            PlayerHittingView()
                .tabItem {
                    Label("Hitting", systemImage: "figure.baseball")
                }
                .tag(1)
            
            PlayerPitchingView()
                .tabItem {
                    Label("Pitching", systemImage: "target")
                }
                .tag(2)
            
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.crop.circle")
                }
                .tag(3)
        }
    }
}

struct CoachTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            CoachDashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "person.3.fill")
                }
                .tag(0)
            
            CoachPlayersView()
                .tabItem {
                    Label("Players", systemImage: "person.2")
                }
                .tag(1)
            
            CoachTeamsView()
                .tabItem {
                    Label("Teams", systemImage: "gearshape")
                }
                .tag(2)
        }
    }
}

