import Foundation
import SwiftUI

@MainActor
class PlayerPitchingViewModel: ObservableObject {
    @Published var sessions: [PitchSession] = []
    @Published var activeGoals: [PersonalGoal] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    // Analytics
    @Published var overallStrikePct: Int = 0
    @Published var accuracyPct: Int = 0
    @Published var totalPitches: Int = 0
    
    private let sessionService = SessionService.shared
    private let goalService = GoalService.shared
    
    func loadData(pitcherId: String, teamId: String?) async {
        isLoading = true
        errorMessage = nil
        
        do {
            async let sessionsResult = sessionService.getPitchingSessions(pitcherId: pitcherId, teamId: teamId)
            async let goalsResult = goalService.getPersonalGoals(playerId: pitcherId)
            
            let (sessionsData, goalsData) = try await (sessionsResult, goalsResult)
            
            sessions = sessionsData
            activeGoals = goalsData.filter { $0.metric == .strikePct || $0.metric == .command || $0.metric == .totalPitches }
            
            calculateAnalytics()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    private func calculateAnalytics() {
        totalPitches = sessions.reduce(0) { $0 + $1.totalPitches }
        
        var totalStrikes = 0
        var totalAccuracy = 0.0
        var sessionCount = 0
        
        for session in sessions {
            if let analytics = session.analytics {
                totalStrikes += Int(round(analytics.strikePct / 100.0 * Double(session.totalPitches)))
                totalAccuracy += analytics.accuracyHitRate
                sessionCount += 1
            }
        }
        
        if totalPitches > 0 {
            overallStrikePct = Int(round(Double(totalStrikes) / Double(totalPitches) * 100))
        }
        
        if sessionCount > 0 {
            accuracyPct = Int(round(totalAccuracy / Double(sessionCount)))
        }
    }
}

