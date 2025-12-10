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
    private let targetUserId: UUID?
    
    init(targetUserId: UUID? = nil) {
        self.targetUserId = targetUserId
    }
    
    var userName: String {
        // If targetUserId is set, we might need to fetch that user's name or pass it in.
        // For now, if it's nil, use current user.
        if let _ = targetUserId {
             return "Player" // Placeholder, or we fetch user details
        }
        let fullName = AuthService.shared.currentUser?.name ?? "Player"
        return fullName.components(separatedBy: " ").first ?? fullName
    }
    
    // ... existing properties ...
    
    func loadData() async {
        // Use targetUserId if available, else current user
        let userId = targetUserId ?? AuthService.shared.currentUser?.id
        guard let validId = userId else { return }
        
        // If viewing another user, we need their user object for Drills fetching (teamIds)
        // For now, let's fetch hitting/pitching stats which depend only on ID.
        // Drills/Goals might require more context.
        
        isLoading = true
        errorMessage = nil
        
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadHittingSessions(for: validId) }
            group.addTask { await self.loadPitchingSessions(for: validId) }
            if self.targetUserId == nil, let user = AuthService.shared.currentUser {
                // Only load personalized drills/goals for self for now, 
                // unless we verify we can see other's goals.
                group.addTask { await self.loadDrills(for: user) }
                group.addTask { await self.loadGoals(for: validId) }
            } else if let targetId = self.targetUserId {
                 // Load goals for target user
                 group.addTask { await self.loadGoals(for: targetId) }
                 // Drills? We need the User object to get teamIds.
                 // We can fetch the user first.
            }
        }
        
        isLoading = false
    }
    
    private func loadDrills(for user: User) async {
        do {
            let drills = try await DataService.shared.fetchDrills(teamIds: user.teamIds)
            // Filter drills? Maybe assigned to me? 
            // For now, show all team drills or implement assignment logic if specific table exists
            // DrillAssignment table logic? 
            // Let's just show all team drills for now as "Daily Drills"
            assignedDrills = drills
        } catch {
            print("Error loading drills: \(error)")
        }
    }
    
    private func loadGoals(for userId: UUID) async {
        do {
            let goals = try await DataService.shared.fetchPersonalGoals(userId: userId)
            activeGoals = goals.filter { $0.status == .active }
        } catch {
            print("Error loading goals: \(error)")
        }
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
