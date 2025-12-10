import Foundation
import Combine

/// SessionManager handles the currently active session (hitting or pitching)
/// and persists it to disk to prevent data loss.
@MainActor
class SessionManager: ObservableObject {
    static let shared = SessionManager()
    
    // Polymorphic storage for current session
    // We store the structured object.
    @Published var currentHittingSession: Session?
    @Published var currentPitchingSession: PitchSession?
    
    var isSessionActive: Bool {
        currentHittingSession != nil || currentPitchingSession != nil
    }
    
    private let fileManager = FileManager.default
    private let hittingFilename = "draft_hitting_session.json"
    private let pitchingFilename = "draft_pitching_session.json"
    
    private init() {
        // Attempt to restore sessions on launch
        restoreSessions()
    }
    
    // MARK: - Start Session
    
    func startHittingSession(player: User, drill: Drill? = nil) {
        guard !isSessionActive else { return }
        
        let newSession = Session(
            playerId: player.id,
            teamId: player.primaryTeamId,
            name: drill?.name ?? "Hitting Session",
            date: Date()
        )
        // If it's a drill session, set drillId
        var session = newSession
        if let drill = drill {
            session.drillId = drill.id
        }
        
        currentHittingSession = session
        saveToDisk()
    }
    
    func startPitchingSession(player: User, teamId: UUID, type: PitchSessionType) {
        guard !isSessionActive else { return }
        
        let newSession = PitchSession(
            pitcherId: player.id,
            teamId: teamId,
            sessionName: "\(type.displayName) Session",
            sessionType: type
        )
        
        currentPitchingSession = newSession
        saveToDisk()
    }
    
    // MARK: - Update Session
    
    func updateHittingSession(_ session: Session) {
        currentHittingSession = session
        saveToDisk()
    }
    
    func updatePitchingSession(_ session: PitchSession) {
        currentPitchingSession = session
        saveToDisk()
    }
    
    // MARK: - End & Discard
    
    func endCurrentSession() async throws {
        if let hitting = currentHittingSession {
            try await DataService.shared.saveHittingSession(hitting)
            currentHittingSession = nil
        } else if let pitching = currentPitchingSession {
            try await DataService.shared.savePitchingSession(pitching)
            currentPitchingSession = nil
        }
        
        clearDisk()
    }
    
    func discardSession() {
        currentHittingSession = nil
        currentPitchingSession = nil
        clearDisk()
    }
    
    // MARK: - Persistence
    
    private func getDocumentsDirectory() -> URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    
    private func saveToDisk() {
        let docs = getDocumentsDirectory()
        
        if let hitting = currentHittingSession {
            do {
                let data = try JSONEncoder().encode(hitting)
                let url = docs.appendingPathComponent(hittingFilename)
                try data.write(to: url)
            } catch {
                print("Failed to save hitting session: \(error)")
            }
        }
        
        if let pitching = currentPitchingSession {
            do {
                let data = try JSONEncoder().encode(pitching)
                let url = docs.appendingPathComponent(pitchingFilename)
                try data.write(to: url)
            } catch {
                print("Failed to save pitching session: \(error)")
            }
        }
    }
    
    private func restoreSessions() {
        let docs = getDocumentsDirectory()
        
        // Try hitting
        let hittingUrl = docs.appendingPathComponent(hittingFilename)
        if fileManager.fileExists(atPath: hittingUrl.path) {
            do {
                let data = try Data(contentsOf: hittingUrl)
                let session = try JSONDecoder().decode(Session.self, from: data)
                self.currentHittingSession = session
            } catch {
                print("Failed to restore hitting session: \(error)")
            }
        }
        
        // Try pitching
        let pitchingUrl = docs.appendingPathComponent(pitchingFilename)
        if fileManager.fileExists(atPath: pitchingUrl.path) {
            do {
                let data = try Data(contentsOf: pitchingUrl)
                let session = try JSONDecoder().decode(PitchSession.self, from: data)
                self.currentPitchingSession = session
            } catch {
                print("Failed to restore pitching session: \(error)")
            }
        }
    }
    
    private func clearDisk() {
        let docs = getDocumentsDirectory()
        let hittingUrl = docs.appendingPathComponent(hittingFilename)
        let pitchingUrl = docs.appendingPathComponent(pitchingFilename)
        
        try? fileManager.removeItem(at: hittingUrl)
        try? fileManager.removeItem(at: pitchingUrl)
    }
}
