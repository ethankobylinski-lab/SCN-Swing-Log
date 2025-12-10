import SwiftUI

struct PlayerTabsView: View {
    @State private var selectedTab: Tab = .home
    
    enum Tab: String, CaseIterable {
        case home = "Home"
        case log = "Log"
        case analytics = "Analytics"
        case history = "History"
        case profile = "Profile"
        
        var icon: String {
            switch self {
            case .home: return "house.fill"
            case .log: return "plus.circle.fill" // Or list.bullet.clipboard.fill
            case .analytics: return "chart.bar.xaxis"
            case .history: return "clock.fill"
            case .profile: return "person.fill"
            }
        }
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // 1. Home
            DashboardView() // Existing view
                .tabItem {
                    Label(Tab.home.rawValue, systemImage: Tab.home.icon)
                }
                .tag(Tab.home)
            
            // 2. Log
            LogLandingView()
                .tabItem {
                    Label(Tab.log.rawValue, systemImage: Tab.log.icon)
                }
                .tag(Tab.log)
            
            // 3. Analytics
            PlayerAnalyticsView()
                .tabItem {
                    Label(Tab.analytics.rawValue, systemImage: Tab.analytics.icon)
                }
                .tag(Tab.analytics)
            
            // 4. History
            HistoryView()
                .tabItem {
                    Label(Tab.history.rawValue, systemImage: Tab.history.icon)
                }
                .tag(Tab.history)
            
            // 5. Profile
            ProfileView() // Existing view
                .tabItem {
                    Label(Tab.profile.rawValue, systemImage: Tab.profile.icon)
                }
                .tag(Tab.profile)
        }
        .tint(AppColors.primary)
    }
}
