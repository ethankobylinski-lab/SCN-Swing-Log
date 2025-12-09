import SwiftUI

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

