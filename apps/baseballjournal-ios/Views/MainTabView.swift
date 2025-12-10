import SwiftUI

struct MainTabView: View {
    @State private var selectedTab: Tab = .dashboard
    
    enum Tab: String, CaseIterable {
        case dashboard = "Dashboard"
        case hitting = "Hitting"
        case pitching = "Pitching"
        case log = "Log"
        case profile = "Profile"
        
        var icon: String {
            switch self {
            case .dashboard: return "house.fill"
            case .hitting: return "baseball.fill"
            case .pitching: return "target"
            case .log: return "list.bullet.clipboard.fill"
            case .profile: return "person.fill"
            }
        }
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label(Tab.dashboard.rawValue, systemImage: Tab.dashboard.icon)
                }
                .tag(Tab.dashboard)
            
            HittingView()
                .tabItem {
                    Label(Tab.hitting.rawValue, systemImage: Tab.hitting.icon)
                }
                .tag(Tab.hitting)
            
            PitchingView()
                .tabItem {
                    Label(Tab.pitching.rawValue, systemImage: Tab.pitching.icon)
                }
                .tag(Tab.pitching)
            
            LogView()
                .tabItem {
                    Label(Tab.log.rawValue, systemImage: Tab.log.icon)
                }
                .tag(Tab.log)
            
            ProfileView()
                .tabItem {
                    Label(Tab.profile.rawValue, systemImage: Tab.profile.icon)
                }
                .tag(Tab.profile)
        }
        .tint(AppColors.primary)
    }
}

#Preview {
    MainTabView()
}
