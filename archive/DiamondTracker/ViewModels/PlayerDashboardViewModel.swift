import Foundation
import SwiftUI

@MainActor
class PlayerDashboardViewModel: ObservableObject {
    @Published var hittingSessionsThisWeek: [Session] = []
    @Published var pitchingSessionsThisWeek: [PitchSession] = []
    @Published var activeGoals: [PersonalGoal] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let sessionService = SessionService.shared
    private let goalService = GoalService.shared
    
    func loadData(playerId: String, teamId: String?) async {
        isLoading = true
        errorMessage = nil
        
        do {
            async let hittingSessions = sessionService.getHittingSessions(playerId: playerId, teamId: teamId)
            async let pitchingSessions = sessionService.getPitchingSessions(pitcherId: playerId, teamId: teamId)
            async let goals = goalService.getPersonalGoals(playerId: playerId)
            
            let (hitting, pitching, goalsResult) = try await (hittingSessions, pitchingSessions, goals)
            
            // Filter to this week
            let calendar = Calendar.current
            let now = Date()
            let weekAgo = calendar.date(byAdding: .day, value: -7, to: now) ?? now
            
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            
            hittingSessionsThisWeek = hitting.filter { session in
                if let date = formatter.date(from: session.date) {
                    return date >= weekAgo
                }
                return false
            }
            
            pitchingSessionsThisWeek = pitching.filter { session in
                if let date = formatter.date(from: session.sessionStartTime) {
                    return date >= weekAgo
                }
                return false
            }
            
            activeGoals = goalsResult
        } catch {
            errorMessage = "Failed to load data: \(error.localizedDescription)"
            print("Error loading dashboard data: \(error)")
        }
        
        isLoading = false
    }
}

