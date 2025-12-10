import Foundation
import SwiftUI

@MainActor
class PlayerHittingViewModel: ObservableObject {
    @Published var sessions: [Session] = []
    @Published var activeGoals: [PersonalGoal] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Analytics
    @Published var overallExecutionPct: Int = 0
    @Published var hardHitPct: Int = 0
    @Published var contactPct: Int = 0
    @Published var twoStrikeBattlePct: Int = 0
    @Published var totalReps: Int = 0
    
    private let sessionService = SessionService.shared
    private let goalService = GoalService.shared
    
    func loadData(playerId: String, teamId: String?) async {
        isLoading = true
        errorMessage = nil
        
        do {
            async let sessionsResult = sessionService.getHittingSessions(playerId: playerId, teamId: teamId)
            async let goalsResult = goalService.getPersonalGoals(playerId: playerId)
            
            let (sessionsData, goalsData) = try await (sessionsResult, goalsResult)
            
            sessions = sessionsData
            activeGoals = goalsData.filter { $0.metric == .executionPct || $0.metric == .hardHitPct || $0.metric == .totalReps }
            
            calculateAnalytics()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    private func calculateAnalytics() {
        let allSets = sessions.flatMap { $0.sets }
        
        overallExecutionPct = AnalyticsHelpers.calculateExecutionPercentage(allSets)
        hardHitPct = AnalyticsHelpers.calculateHardHitPercentage(allSets)
        contactPct = AnalyticsHelpers.calculateContactPercentage(allSets)
        twoStrikeBattlePct = AnalyticsHelpers.calculate2StrikeBattlePercentage(allSets)
        totalReps = allSets.reduce(0) { $0 + $1.repsAttempted }
    }
}

