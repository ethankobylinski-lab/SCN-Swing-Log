import Foundation
import SwiftUI
import Supabase

@MainActor
class HittingViewModel: ObservableObject {
    @Published var sessions: [Session] = []
    @Published var goals: [PersonalGoal] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var showLogSheet: Bool = false
    
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
            let response: [Session] = try await client
                .from("sessions")
                .select()
                .eq("player_id", value: userId.uuidString)
                .order("date", ascending: false)
                .execute()
                .value
            
            sessions = response
        } catch {
            print("Error loading hitting sessions: \(error)")
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
            
            // Filter for hitting-related goals
            goals = response.filter { $0.metric.isHittingGoal }
        } catch {
            print("Error loading goals: \(error)")
        }
    }
    
    func saveSession(_ session: SessionInsert) async throws {
        try await client
            .from("sessions")
            .insert(session)
            .execute()
        
        // Reload data after save
        await loadData()
    }
}
