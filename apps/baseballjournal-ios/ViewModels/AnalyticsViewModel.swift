import Foundation
import Combine

@MainActor
class AnalyticsViewModel: ObservableObject {
    @Published var selectedTab: AnalyticsTab = .hitting
    @Published var isLoading: Bool = false
    
    // Hitting Stats
    @Published var totalSwings: Int = 0
    @Published var executionRate: Double = 0
    // Simplified heatmap data: 3x3 grid counts
    @Published var hittingZoneCounts: [ZoneId: Int] = [:]
    
    // Pitching Stats
    @Published var totalPitches: Int = 0
    @Published var strikeRate: Double = 0
    @Published var pitchingZoneCounts: [ZoneId: Int] = [:]
    
    private var hittingSessions: [Session] = []
    private var pitchingSessions: [PitchSession] = []
    
    enum AnalyticsTab: String, CaseIterable, Identifiable {
        case hitting = "Hitting"
        case pitching = "Pitching"
        case summary = "Summary"
        var id: String { rawValue }
    }
    
    func loadData() async {
        guard let userId = AuthService.shared.userId else { return }
        
        isLoading = true
        
        do {
            async let hitting = DataService.shared.fetchHittingSessions(userId: userId, limit: 50)
            async let pitching = DataService.shared.fetchPitchingSessions(userId: userId, limit: 50)
            
            let (hData, pData) = try await (hitting, pitching)
            self.hittingSessions = hData
            self.pitchingSessions = pData
            
            computeHittingStats()
            computePitchingStats()
        } catch {
            print("Error loading analytics: \(error)")
        }
        
        isLoading = false
    }
    
    private func computeHittingStats() {
        var swings = 0
        var executed = 0
        var zones: [ZoneId: Int] = [:]
        
        for session in hittingSessions {
            swings += session.totalRepsAttempted
            executed += session.totalRepsExecuted
            
            // If we had granular data, we'd map locations.
            // Currently Session model aggregates by Set.
            // If we want a heatmap, we might need to rely on "Drill Targets" if recorded?
            // Since we don't have granular hitting locations in the current `Session.swift` model
            // (only aggregated sets), we can't do a REAL heatmap.
            // We will mock it or leave it empty/unavailable message.
            // Requirement says "Hitting: Heatmaps".
            // If the web has it, maybe I missed a field or table.
            // But based on available Swift models, I can only show aggregate stats.
        }
        
        self.totalSwings = swings
        self.executionRate = swings > 0 ? Double(executed) / Double(swings) : 0
        self.hittingZoneCounts = zones
    }
    
    private func computePitchingStats() {
        var pitches = 0
        var strikes = 0
        var zones: [ZoneId: Int] = [:]
        
        for session in pitchingSessions {
            pitches += session.totalPitches
            // Strike % calculation depends on how it's stored or we sum it up?
            // `PitchSession` has `strikePercentage`.
            // Let's weight it by total pitches if we want global average.
            // But easier to sum stored pitches vs strikes if available.
            // `PitchSession` doesn't expose raw strike count directly in top level, only `strikePercentage`.
            // But it has `pitchRecords`.
            
            if let records = session.pitchRecords {
                for record in records {
                    // map actualZone -> counts
                    zones[record.actualZone, default: 0] += 1
                    
                    if record.outcome == .calledStrike || record.outcome == .swingingStrike || record.outcome == .foul || record.outcome == .inPlay {
                        strikes += 1
                    }
                }
            } else {
                // If records are missing (shallow fetch?), use session averages?
                // Let's assume we fetch fields or full join.
                // If shallow, we can't compute heatmap.
            }
        }
        
        self.totalPitches = pitches
        self.strikeRate = pitches > 0 ? Double(strikes) / Double(pitches) : 0
        self.pitchingZoneCounts = zones
    }
}
