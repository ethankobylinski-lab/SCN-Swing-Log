import Foundation
import Combine
import SwiftUI

enum AppState {
    case loading
    case unauthenticated
    case authenticated(User)
}

@MainActor
class AppViewModel: ObservableObject {
    @Published var appState: AppState = .loading
    @Published var currentUser: User?
    
    private var cancellables = Set<AnyCancellable>()
    private let authService = AuthService.shared
    
    // Computed property for easy access in views
    var userRole: UserRole {
        currentUser?.role ?? .player
    }
    
    init() {
        setupSubscriptions()
    }
    
    private func setupSubscriptions() {
        // Subscribe to auth service changes
        authService.$currentUser
            .combineLatest(authService.$isLoading)
            .sink { [weak self] user, isLoading in
                self?.handleAuthChange(user: user, isLoading: isLoading)
            }
            .store(in: &cancellables)
    }
    
    private func handleAuthChange(user: User?, isLoading: Bool) {
        if isLoading {
            appState = .loading
        } else if let user = user {
            currentUser = user
            appState = .authenticated(user)
        } else {
            currentUser = nil
            appState = .unauthenticated
        }
    }
    
    // Pass-through methods
    func signOut() async {
        await authService.signOut()
    }
}
