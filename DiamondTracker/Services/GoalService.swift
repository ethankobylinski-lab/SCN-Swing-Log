import Foundation
import Supabase

class GoalService {
    static let shared = GoalService()
    private let apiClient = APIClient.shared
    
    private init() {}
    
    func getPersonalGoals(playerId: String) async throws -> [PersonalGoal] {
        let response: [PersonalGoal] = try await apiClient.supabase
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
        let response: [TeamGoal] = try await apiClient.supabase
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

