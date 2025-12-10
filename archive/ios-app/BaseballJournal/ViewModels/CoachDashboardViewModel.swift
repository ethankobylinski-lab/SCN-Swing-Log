import Foundation
import SwiftUI

@MainActor
class CoachDashboardViewModel: ObservableObject {
    @Published var teams: [Team] = []
    @Published var players: [User] = []
    @Published var teamGoals: [TeamGoal] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let teamService = TeamService.shared
    private let goalService = GoalService.shared
    
    func loadData(userId: String, teamId: String?) async {
        isLoading = true
        errorMessage = nil
        
        do {
            async let teamsResult = teamService.getTeams(userId: userId, role: .coach)
            async let goalsResult: [TeamGoal] = {
                if let teamId = teamId {
                    return try await goalService.getTeamGoals(teamId: teamId)
                }
                return []
            }()
            
            let (teamsData, goalsData) = try await (teamsResult, goalsResult)
            
            teams = teamsData
            teamGoals = goalsData
            
            if let firstTeam = teams.first {
                let playersData = try await teamService.getPlayers(teamId: firstTeam.id)
                players = playersData
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}

