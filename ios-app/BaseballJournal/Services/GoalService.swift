import Foundation
import Supabase

class GoalService {
    static let shared = GoalService()
    private let client = SupabaseClientProvider.shared.client
    
    private init() {}
    
    func getPersonalGoals(playerId: String) async throws -> [PersonalGoal] {
        let response: [PersonalGoal] = try await client
            .from("personal_goals")
            .select()
            .eq("player_id", value: playerId)
            .eq("status", value: GoalStatus.active.rawValue)
            .order("target_date", ascending: true)
            .execute()
            .value
        
        return response
    }
    
    func getTeamGoals(teamId: String) async throws -> [TeamGoal] {
        let response: [TeamGoal] = try await client
            .from("team_goals")
            .select()
            .eq("team_id", value: teamId)
            .eq("status", value: GoalStatus.active.rawValue)
            .order("target_date", ascending: true)
            .execute()
            .value
        
        return response
    }
}

