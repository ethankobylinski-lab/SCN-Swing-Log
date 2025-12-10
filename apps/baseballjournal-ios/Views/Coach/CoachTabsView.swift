import SwiftUI

struct CoachTabsView: View {
    @State private var selectedTab: Tab = .today
    
    enum Tab: String, CaseIterable {
        case today = "Today"
        case team = "Dashboard"
        case roster = "Roster"
        case programs = "Programs"
        case profile = "Profile"
        
        var icon: String {
            switch self {
            case .today: return "sun.max.fill"
            case .team: return "chart.line.uptrend.xyaxis"
            case .roster: return "person.3.fill"
            case .programs: return "list.clipboard.fill"
            case .profile: return "person.fill"
            }
        }
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // 1. Today
            CoachHomeView()
                .tabItem {
                    Label(Tab.today.rawValue, systemImage: Tab.today.icon)
                }
                .tag(Tab.today)
            
            // 2. Team Dashboard
            TeamAnalyticsView()
                .tabItem {
                    Label(Tab.team.rawValue, systemImage: Tab.team.icon)
                }
                .tag(Tab.team)
            
            // 3. Roster
            RosterView()
                .tabItem {
                    Label(Tab.roster.rawValue, systemImage: Tab.roster.icon)
                }
                .tag(Tab.roster)
            
            // 4. Programs & Goals
            Text("Programs & Goals")
                .tabItem {
                    Label(Tab.programs.rawValue, systemImage: Tab.programs.icon)
                }
                .tag(Tab.programs)
            
            // 5. Profile
            ProfileView() // Reuse ProfileView or CoachProfileView
                .tabItem {
                    Label(Tab.profile.rawValue, systemImage: Tab.profile.icon)
                }
                .tag(Tab.profile)
        }
        .tint(AppColors.primary)
    }
}
