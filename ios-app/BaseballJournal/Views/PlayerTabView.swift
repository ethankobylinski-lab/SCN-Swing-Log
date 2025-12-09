import SwiftUI

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

