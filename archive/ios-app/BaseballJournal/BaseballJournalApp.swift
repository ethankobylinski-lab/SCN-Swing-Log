import SwiftUI

@main
struct BaseballJournalApp: App {
    @StateObject private var appSession = AppSessionViewModel()
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appSession)
                .preferredColorScheme(.light)
        }
    }
}

