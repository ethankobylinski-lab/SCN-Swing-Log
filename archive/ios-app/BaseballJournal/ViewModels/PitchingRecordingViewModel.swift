import Foundation
import SwiftUI

@MainActor
class PitchingRecordingViewModel: ObservableObject {
    @Published var sessionName: String = ""
    @Published var sessionType: PitchSessionType = .mix
    @Published var gameSituationEnabled: Bool = false
    @Published var notes: String = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isSessionSaved = false
    @Published var currentSessionId: String?
    
    // Pitch recording state
    @Published var batterSide: String = "R"
    @Published var balls: Int = 0
    @Published var strikes: Int = 0
    @Published var outs: Int = 0
    @Published var runnersOn: RunnersOn = RunnersOn(on1b: false, on2b: false, on3b: false)
    @Published var selectedPitchTypeId: String = ""
    @Published var targetZone: ZoneId = .z22
    @Published var actualZone: ZoneId = .z22
    
    @Published var pitchRecords: [PitchRecord] = []
    
    private let sessionService = SessionService.shared
    private let pitcherId: String
    private let teamId: String
    
    init(pitcherId: String, teamId: String) {
        self.pitcherId = pitcherId
        self.teamId = teamId
    }
    
    func startSession() async {
        guard !sessionName.isEmpty else {
            errorMessage = "Please enter a session name"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let session = try await sessionService.createPitchSession(
                pitcherId: pitcherId,
                teamId: teamId,
                sessionName: sessionName,
                sessionType: sessionType,
                gameSituationEnabled: gameSituationEnabled,
                pitchGoals: []
            )
            
            currentSessionId = session.id
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func recordPitch(
        pitchTypeId: String,
        targetZone: ZoneId,
        actualZone: ZoneId,
        outcome: PitchOutcome,
        velocityMph: Double? = nil
    ) async {
        guard let sessionId = currentSessionId else {
            errorMessage = "Session not started"
            return
        }
        
        let index = pitchRecords.count + 1
        
        do {
            try await sessionService.recordPitch(
                sessionId: sessionId,
                index: index,
                batterSide: batterSide,
                ballsBefore: balls,
                strikesBefore: strikes,
                runnersOn: runnersOn,
                outs: outs,
                pitchTypeId: pitchTypeId,
                targetZone: targetZone,
                targetXNorm: nil,
                targetYNorm: nil,
                actualZone: actualZone,
                actualXNorm: nil,
                actualYNorm: nil,
                velocityMph: velocityMph,
                outcome: outcome,
                inPlayQuality: nil
            )
            
            // Create local record for UI (temporary until we fetch from server)
            let record = PitchRecord(
                id: UUID().uuidString,
                sessionId: sessionId,
                index: index,
                batterSide: batterSide,
                ballsBefore: balls,
                strikesBefore: strikes,
                runnersOn: runnersOn,
                outs: outs,
                pitchTypeId: pitchTypeId,
                targetZone: targetZone,
                targetXNorm: nil,
                targetYNorm: nil,
                actualZone: actualZone,
                actualXNorm: nil,
                actualYNorm: nil,
                velocityMph: velocityMph,
                outcome: outcome,
                inPlayQuality: nil,
                missDistanceInches: nil,
                createdAt: ISO8601DateFormatter().string(from: Date())
            )
            
            pitchRecords.append(record)
            
            // Update count based on outcome
            if outcome == .calledStrike || outcome == .swingingStrike {
                strikes += 1
            } else if outcome == .ball {
                balls += 1
            }
            
            // Reset count if needed (simplified - in real app might want to track full count)
            if strikes >= 3 || balls >= 4 {
                balls = 0
                strikes = 0
            }
        } catch {
            errorMessage = "Failed to record pitch: \(error.localizedDescription)"
            print("Error recording pitch: \(error)")
        }
    }
    
    func finalizeSession() async {
        guard let sessionId = currentSessionId else {
            errorMessage = "Session not started"
            return
        }
        
        guard totalPitches > 0 else {
            errorMessage = "Please record at least one pitch"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let finalizedSession = try await sessionService.finalizePitchSession(
                sessionId: sessionId,
                notes: notes.isEmpty ? nil : notes
            )
            
            // Session finalized successfully
            isSessionSaved = true
            print("Session finalized: \(finalizedSession.id)")
        } catch {
            errorMessage = "Failed to finalize session: \(error.localizedDescription)"
            print("Error finalizing session: \(error)")
        }
        
        isLoading = false
    }
    
    var strikePercentage: Int {
        guard !pitchRecords.isEmpty else { return 0 }
        let strikes = pitchRecords.filter { $0.outcome == .calledStrike || $0.outcome == .swingingStrike }.count
        return Int(round(Double(strikes) / Double(pitchRecords.count) * 100))
    }
    
    var totalPitches: Int {
        return pitchRecords.count
    }
}

