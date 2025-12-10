import Foundation
import SwiftUI

@MainActor
class HittingRecordingViewModel: ObservableObject {
    @Published var sessionName: String = ""
    @Published var selectedDrillType: DrillType?
    @Published var currentSet: SetResult
    @Published var sets: [SetResult] = []
    @Published var notes: String = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isSessionSaved = false
    
    private let sessionService = SessionService.shared
    private let playerId: String
    private let teamId: String?
    
    init(playerId: String, teamId: String?) {
        self.playerId = playerId
        self.teamId = teamId
        self.currentSet = SetResult(
            setNumber: 1,
            repsAttempted: 0,
            repsExecuted: 0,
            hardHits: 0,
            strikeouts: 0,
            drillType: nil,
            notes: nil
        )
    }
    
    func addSet() {
        if currentSet.repsAttempted > 0 {
            sets.append(currentSet)
            currentSet = SetResult(
                setNumber: sets.count + 1,
                repsAttempted: 0,
                repsExecuted: 0,
                hardHits: 0,
                strikeouts: 0,
                drillType: selectedDrillType,
                notes: nil
            )
        }
    }
    
    func removeSet(at index: Int) {
        guard index < sets.count else { return }
        sets.remove(at: index)
        // Renumber sets
        for i in 0..<sets.count {
            sets[i].setNumber = i + 1
        }
        currentSet.setNumber = sets.count + 1
    }
    
    func saveSession() async {
        guard !sessionName.isEmpty else {
            errorMessage = "Please enter a session name"
            return
        }
        
        guard !sets.isEmpty || currentSet.repsAttempted > 0 else {
            errorMessage = "Please log at least one set"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        var finalSets = sets
        if currentSet.repsAttempted > 0 {
            finalSets.append(currentSet)
        }
        
        do {
            let savedSession = try await sessionService.createHittingSession(
                playerId: playerId,
                teamId: teamId,
                name: sessionName,
                drillId: nil,
                sets: finalSets,
                feedback: nil,
                reflection: notes.isEmpty ? nil : notes
            )
            
            // Session saved successfully
            isSessionSaved = true
            print("Session saved: \(savedSession.id)")
        } catch {
            errorMessage = "Failed to save session: \(error.localizedDescription)"
            print("Error saving session: \(error)")
        }
        
        isLoading = false
    }
    
    var totalReps: Int {
        let setReps = sets.reduce(0) { $0 + $1.repsAttempted }
        return setReps + currentSet.repsAttempted
    }
    
    var totalExecuted: Int {
        let setExec = sets.reduce(0) { $0 + $1.repsExecuted }
        return setExec + currentSet.repsExecuted
    }
    
    var executionPercentage: Int {
        guard totalReps > 0 else { return 0 }
        return Int(round(Double(totalExecuted) / Double(totalReps) * 100))
    }
}

