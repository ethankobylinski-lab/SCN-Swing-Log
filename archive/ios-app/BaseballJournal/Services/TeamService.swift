import Foundation
import Supabase

class TeamService {
    static let shared = TeamService()
    private let client = SupabaseClientProvider.shared.client
    
    private init() {}
    
    func getTeams(userId: String, role: UserRole) async throws -> [Team] {
        if role == .coach {
            // Get teams where user is coach
            let response: [Team] = try await client
                .from("teams")
                .select()
                .eq("coach_id", value: userId)
                .execute()
                .value
            return response
        } else {
            // Get teams from user's team_ids array
            let userResponse: [User] = try await client
                .from("users")
                .select()
                .eq("id", value: userId)
                .execute()
                .value
            
            guard let user = userResponse.first, !user.teamIds.isEmpty else {
                return []
            }
            
            // Query teams by IDs - adjust syntax if needed for your Supabase SDK version
            let response: [Team] = try await client
                .from("teams")
                .select()
                .in("id", value: user.teamIds)
                .execute()
                .value
            
            return response
        }
    }
    
    func getPlayers(teamId: String) async throws -> [User] {
        // Query users where team_ids array contains the teamId
        // Note: Supabase array contains syntax may vary - adjust if needed
        let response: [User] = try await client
            .from("users")
            .select()
            .eq("role", value: UserRole.player.rawValue)
            .contains("team_ids", value: teamId)
            .execute()
            .value
        
        return response
    }
}

