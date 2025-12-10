import Foundation

struct AnalyticsHelpers {
    static func calculateExecutionPercentage(_ sets: [SetResult]) -> Int {
        let totalExecuted = sets.reduce(0) { $0 + $1.repsExecuted }
        let totalAttempted = sets.reduce(0) { $0 + $1.repsAttempted }
        if totalAttempted == 0 { return 0 }
        return Int(round(Double(totalExecuted) / Double(totalAttempted) * 100))
    }
    
    static func calculateHardHitPercentage(_ sets: [SetResult]) -> Int {
        let totalHardHits = sets.reduce(0) { $0 + $1.hardHits }
        let totalAttempted = sets.reduce(0) { $0 + $1.repsAttempted }
        if totalAttempted == 0 { return 0 }
        return Int(round(Double(totalHardHits) / Double(totalAttempted) * 100))
    }
    
    static func calculateContactPercentage(_ sets: [SetResult]) -> Int {
        let totalAttempted = sets.reduce(0) { $0 + $1.repsAttempted }
        let totalStrikeouts = sets.reduce(0) { $0 + $1.strikeouts }
        if totalAttempted == 0 { return 0 }
        let contacts = totalAttempted - totalStrikeouts
        return Int(round(Double(contacts) / Double(totalAttempted) * 100))
    }
    
    static func calculate2StrikeBattlePercentage(_ sets: [SetResult]) -> Int {
        let twoStrikeSets = sets.filter { set in
            set.countSituation == .behind || (set.strikesBefore ?? 2) >= 2
        }
        guard !twoStrikeSets.isEmpty else { return 0 }
        
        let totalAttempted = twoStrikeSets.reduce(0) { $0 + $1.repsAttempted }
        let totalExecuted = twoStrikeSets.reduce(0) { $0 + $1.repsExecuted }
        if totalAttempted == 0 { return 0 }
        return Int(round(Double(totalExecuted) / Double(totalAttempted) * 100))
    }
    
    static func getTotalReps(_ sessions: [Session]) -> Int {
        return sessions.flatMap { $0.sets }.reduce(0) { $0 + $1.repsAttempted }
    }
}

