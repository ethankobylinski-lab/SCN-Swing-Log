import Foundation
import SwiftUI
import Supabase

@MainActor
class PitchingViewModel: ObservableObject {
    @Published var sessions: [PitchSession] = []
    @Published var goals: [PersonalGoal] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let client = SupabaseClientProvider.shared.client
    
    func loadData() async {
        guard let userId = AuthService.shared.userId else { return }
        
        isLoading = true
        errorMessage = nil
        
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadSessions(for: userId) }
            group.addTask { await self.loadGoals(for: userId) }
        }
        
        isLoading = false
    }
    
    private func loadSessions(for userId: UUID) async {
        do {
            let response: [PitchSession] = try await client
                .from("pitch_sessions")
                .select()
                .eq("pitcher_id", value: userId.uuidString)
                .order("date", ascending: false)
                .execute()
                .value
            
            sessions = response
        } catch {
            print("Error loading pitch sessions: \(error)")
            errorMessage = "Failed to load sessions"
        }
    }
    
    private func loadGoals(for userId: UUID) async {
        do {
            let response: [PersonalGoal] = try await client
                .from("personal_goals")
                .select()
                .eq("player_id", value: userId.uuidString)
                .eq("status", value: "Active")
                .execute()
                .value
            
            // Filter for pitching-related goals
            goals = response.filter { $0.metric.isPitchingGoal }
        } catch {
            print("Error loading goals: \(error)")
        }
    }
    
    func saveSession(_ insert: PitchSessionInsert) async throws {
        try await client
            .from("pitch_sessions")
            .insert(insert)
            .execute()
        
        await loadData()
    }
}
