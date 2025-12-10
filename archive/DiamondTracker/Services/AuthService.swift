import Foundation
import SwiftUI
import Supabase

@MainActor
class AuthService: ObservableObject {
    static let shared = AuthService()
    
    @Published var currentUser: User?
    @Published var isLoading = true
    @Published var isAuthenticated = false
    
    private let apiClient = APIClient.shared
    
    private init() {
        Task {
            await checkSession()
        }
    }
    
    func checkSession() async {
        do {
            let session = try await apiClient.supabase.auth.session
            if let session = session {
                await loadUserProfile(userId: session.user.id.uuidString)
            } else {
                isLoading = false
            }
        } catch {
            // No active session - user needs to sign in
            isLoading = false
        }
    }
    
    func loadUserProfile(userId: String) async {
        do {
            let response: [User] = try await apiClient.supabase
                .from("users")
                .select()
                .eq("id", value: userId)
                .execute()
                .value
            
            if let user = response.first {
                self.currentUser = user
                self.isAuthenticated = true
            }
        } catch {
            print("Error loading user profile: \(error)")
        }
        isLoading = false
    }
    
    func signIn(email: String, password: String) async throws {
        let response = try await apiClient.supabase.auth.signIn(
            email: email,
            password: password
        )
        await loadUserProfile(userId: response.user.id.uuidString)
    }
    
    func signUp(email: String, password: String) async throws {
        let response = try await apiClient.supabase.auth.signUp(
            email: email,
            password: password
        )
        if let user = response.user {
            await loadUserProfile(userId: user.id.uuidString)
        }
    }
    
    func signOut() async throws {
        try await apiClient.supabase.auth.signOut()
        currentUser = nil
        isAuthenticated = false
    }
}

