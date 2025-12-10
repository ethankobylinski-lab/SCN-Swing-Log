import Foundation
import SwiftUI

@MainActor
class AppSessionViewModel: ObservableObject {
    static let shared = AppSessionViewModel()
    
    @Published var currentUser: User?
    @Published var isLoading = true
    @Published var isAuthenticated = false
    
    private let authService = AuthService.shared
    
    private init() {
        Task {
            await checkSession()
        }
    }
    
    func checkSession() async {
        isLoading = true
        
        // Check auth service state
        await authService.checkSession()
        
        if authService.isAuthenticated, let user = authService.currentUser {
            self.currentUser = user
            self.isAuthenticated = true
        } else {
            self.currentUser = nil
            self.isAuthenticated = false
        }
        
        isLoading = false
    }
    
    func signIn(email: String, password: String) async throws {
        try await authService.signIn(email: email, password: password)
        await checkSession()
    }
    
    func signUp(email: String, password: String) async throws {
        try await authService.signUp(email: email, password: password)
        await checkSession()
    }
    
    func signOut() async throws {
        try await authService.signOut()
        await checkSession()
    }
}
