import Foundation
import SwiftUI
import Supabase

// MARK: - Combined Session (for unified display)
struct CombinedSession: Identifiable {
    let id: UUID
    let name: String
    let date: Date
    let isHitting: Bool
    let primaryStat: String
    let secondaryStat: String
    
    var typeLabel: String {
        isHitting ? "Hitting" : "Pitching"
    }
    
    var formattedDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var recentHittingSessions: [Session] = []
    @Published var recentPitchingSessions: [PitchSession] = []
    @Published var hittingSessionsThisWeek: Int = 0
    @Published var pitchingSessionsThisWeek: Int = 0
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let client = SupabaseClientProvider.shared.client
    
    var userName: String {
        let fullName = AuthService.shared.currentUser?.name ?? "Player"
        return fullName.components(separatedBy: " ").first ?? fullName
    }
    
    var totalSessionsThisWeek: Int {
        hittingSessionsThisWeek + pitchingSessionsThisWeek
    }
    
    var combinedSessions: [CombinedSession] {
        let hitting = recentHittingSessions.map { session in
            CombinedSession(
                id: session.id,
                name: session.name,
                date: session.date,
                isHitting: true,
                primaryStat: "\(Int(session.executionPercentage))%",
                secondaryStat: "\(session.totalRepsAttempted) reps"
            )
        }
        
        let pitching = recentPitchingSessions.map { session in
            CombinedSession(
                id: session.id,
                name: session.sessionName,
                date: session.date,
                isHitting: false,
                primaryStat: "\(Int(session.strikePercentage))%",
                secondaryStat: "\(session.totalPitches) pitches"
            )
        }
        
        return (hitting + pitching).sorted { $0.date > $1.date }
    }
    
    func loadData() async {
        guard let userId = AuthService.shared.userId else { return }
        
        isLoading = true
        errorMessage = nil
        
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadHittingSessions(for: userId) }
            group.addTask { await self.loadPitchingSessions(for: userId) }
        }
        
        isLoading = false
    }
    
    private func loadHittingSessions(for userId: UUID) async {
        do {
            let sessions: [Session] = try await client
                .from("sessions")
                .select()
                .eq("player_id", value: userId.uuidString)
                .order("date", ascending: false)
                .limit(10)
                .execute()
                .value
            
            recentHittingSessions = sessions
            
            let oneWeekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
            hittingSessionsThisWeek = sessions.filter { $0.date >= oneWeekAgo }.count
        } catch {
            print("Error loading hitting sessions: \(error)")
            errorMessage = "Failed to load hitting sessions"
        }
    }
    
    private func loadPitchingSessions(for userId: UUID) async {
        do {
            let sessions: [PitchSession] = try await client
                .from("pitch_sessions")
                .select()
                .eq("pitcher_id", value: userId.uuidString)
                .order("date", ascending: false)
                .limit(10)
                .execute()
                .value
            
            recentPitchingSessions = sessions
            
            let oneWeekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
            pitchingSessionsThisWeek = sessions.filter { $0.date >= oneWeekAgo }.count
        } catch {
            print("Error loading pitching sessions: \(error)")
        }
    }
}
