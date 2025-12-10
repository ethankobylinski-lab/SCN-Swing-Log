import SwiftUI

import SwiftUI

struct RootView: View {
    @EnvironmentObject var appSession: AppSessionViewModel
    
    var body: some View {
        Group {
            if appSession.isLoading {
                ProgressView("Loading...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.background)
            } else if let user = appSession.currentUser {
                if user.role == .player {
                    PlayerTabView()
                } else if user.role == .coach {
                    CoachTabView()
                } else {
                    LoginView()
                }
            } else {
                LoginView()
            }
        }
    }
}

