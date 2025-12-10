import Foundation
import Supabase

/// Singleton provider for Supabase client access
final class SupabaseClientProvider {
    static let shared = SupabaseClientProvider()
    
    let client: SupabaseClient
    
    private init() {
        client = SupabaseClient(
            supabaseURL: SupabaseConfig.url,
            supabaseKey: SupabaseConfig.anonKey
        )
    }
}

/// AuthService handles authentication state and operations
@MainActor
class AuthService: ObservableObject {
    static let shared = AuthService()
    
    @Published var currentUser: User?
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = true
    @Published var errorMessage: String?
    
    private let client = SupabaseClientProvider.shared.client
    
    private init() {
        Task {
            await checkSession()
        }
    }
    
    // MARK: - Session Management
    
    func checkSession() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let session = try await client.auth.session
            await loadUserProfile(userId: session.user.id)
            isAuthenticated = true
        } catch {
            // No session or session expired
            isAuthenticated = false
            currentUser = nil
        }
        
        isLoading = false
    }
    
    // MARK: - Sign In
    
    func signIn(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await client.auth.signIn(email: email, password: password)
            await loadUserProfile(userId: response.user.id)
            isAuthenticated = true
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            throw error
        }
    }
    
    // MARK: - Sign Up
    
    func signUp(email: String, password: String, name: String, role: UserRole, playerProfile: PlayerProfile? = nil) async throws {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await client.auth.signUp(email: email, password: password)
            
            guard let userId = response.user?.id else {
                throw AuthError.userNotFound
            }
            
            // Create user profile in the users table
            try await createUserProfile(
                userId: userId,
                email: email,
                name: name,
                role: role,
                playerProfile: playerProfile
            )
            
            await loadUserProfile(userId: userId)
            isAuthenticated = true
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            throw error
        }
    }
    
    // MARK: - Sign Out
    
    func signOut() async {
        do {
            try await client.auth.signOut()
            currentUser = nil
            isAuthenticated = false
        } catch {
            errorMessage = error.localizedDescription
        }
    }
    
    // MARK: - Profile Management
    
    private func loadUserProfile(userId: UUID) async {
        do {
            let response: User = try await client
                .from("users")
                .select()
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value
            
            currentUser = response
        } catch {
            print("Error loading user profile: \(error)")
            // Create a minimal user object from auth data
            currentUser = User(
                id: userId,
                name: "",
                role: .player,
                teamIds: [],
                isNew: true
            )
        }
    }
    
    private func createUserProfile(userId: UUID, email: String, name: String, role: UserRole, playerProfile: PlayerProfile?) async throws {
        struct UserInsert: Codable {
            let id: UUID
            let email: String
            let name: String
            let role: UserRole
            let team_ids: [UUID]
            let coach_team_ids: [UUID]
            let is_new: Bool
            let preferences: [String: String]
            let profile: PlayerProfile?
        }
        
        let insert = UserInsert(
            id: userId,
            email: email,
            name: name,
            role: role,
            team_ids: [],
            coach_team_ids: [],
            is_new: role == .coach, // Coaches need onboarding
            preferences: [:],
            profile: role == .player ? (playerProfile ?? PlayerProfile(gradYear: Calendar.current.component(.year, from: Date()), bats: .right, throws: .right)) : nil
        )
        
        try await client
            .from("users")
            .upsert(insert)
            .execute()
    }
    
    // MARK: - Get Current User ID
    
    var userId: UUID? {
        currentUser?.id
    }
    
    // MARK: - Team IDs
    
    var teamIds: [UUID] {
        currentUser?.teamIds ?? []
    }
    
    var primaryTeamId: UUID? {
        currentUser?.preferences?.defaultTeamId ?? currentUser?.teamIds.first
    }
}

// MARK: - Auth Errors

enum AuthError: LocalizedError {
    case userNotFound
    case invalidCredentials
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .userNotFound:
            return "User not found"
        case .invalidCredentials:
            return "Invalid email or password"
        case .networkError:
            return "Network error. Please try again."
        }
    }
}
