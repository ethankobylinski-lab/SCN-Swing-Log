import Foundation
import Supabase

/// DataService handles fetching and saving domain model data
class DataService {
    static let shared = DataService()
    
    private let client = SupabaseClientProvider.shared.client
    
    private init() {}
    
    // MARK: - Drills
    
    func fetchDrills(teamIds: [UUID]) async throws -> [Drill] {
        guard !teamIds.isEmpty else { return [] }
        
        // Supabase "in" filter expects comma-separated strings inside parentheses?
        // Or using .in("team_id", value: [ids])
        
        let teamIdStrings = teamIds.map { $0.uuidString }
        
        let drills: [Drill] = try await client
            .from("drills")
            .select()
            .in("team_id", value: teamIdStrings)
            .execute()
            .value
            
        return drills
    }
    
    // MARK: - Sessions (Hitting)
    
    func fetchHittingSessions(userId: UUID, limit: Int = 20) async throws -> [Session] {
        let sessions: [Session] = try await client
            .from("sessions")
            .select()
            .eq("player_id", value: userId.uuidString)
            .order("date", ascending: false)
            .limit(limit)
            .execute()
            .value
            
        return sessions
    }
    
    func saveHittingSession(_ session: Session) async throws {
        // Prepare insert payload
        let insert = SessionInsert(
            playerId: session.playerId,
            teamId: session.teamId,
            drillId: session.drillId,
            name: session.name,
            date: session.date,
            type: session.type,
            sets: session.sets,
            feedback: session.feedback,
            reflection: session.reflection
        )
        
        try await client
            .from("sessions")
            .insert(insert)
            .execute()
    }
    
    // MARK: - Pitching Sessions
    
    func fetchPitchingSessions(userId: UUID, limit: Int = 20) async throws -> [PitchSession] {
        let sessions: [PitchSession] = try await client
            .from("pitching_sessions")
            .select()
            .eq("pitcher_id", value: userId.uuidString)
            .order("date", ascending: false)
            .limit(limit)
            .execute() // Note: PitchSession typically has joined data, check schema if simple select works
            .value
        
        return sessions
    }
    
    func savePitchingSession(_ session: PitchSession) async throws {
        let insert = PitchSessionInsert(
            pitcherId: session.pitcherId,
            teamId: session.teamId,
            catcherId: session.catcherId,
            date: session.date,
            sessionName: session.sessionName,
            sessionType: session.sessionType,
            status: session.status,
            gameSituationEnabled: session.gameSituationEnabled,
            pitchGoals: session.pitchGoals,
            totalPitches: session.totalPitches,
            sessionStartTime: session.sessionStartTime ?? Date()
        )
            
        let response: PitchSession = try await client
            .from("pitching_sessions")
            .insert(insert)
            .select()
            .single()
            .execute()
            .value
            
        // Save Pitch Records
        if let records = session.pitchRecords, !records.isEmpty {
            // Need to map records to insert types if they differ, or just use Encodable
            // Assuming direct insert works if keys match
            
            // We need to set the sessionId on records
            var recordsToInsert = records
            for i in 0..<recordsToInsert.count {
                recordsToInsert[i].sessionId = response.id
            }
            
            try await client
                .from("pitch_records")
                .insert(recordsToInsert)
                .execute()
        }
    }
    
    // MARK: - Goals
    
    func fetchPersonalGoals(userId: UUID) async throws -> [PersonalGoal] {
        let goals: [PersonalGoal] = try await client
            .from("personal_goals")
            .select()
            .eq("player_id", value: userId.uuidString)
            .execute()
            .value
            
        return goals
    }
    
    func fetchTeamGoals(teamIds: [UUID]) async throws -> [TeamGoal] {
        guard !teamIds.isEmpty else { return [] }
        let teamIdStrings = teamIds.map { $0.uuidString }
        
        let goals: [TeamGoal] = try await client
            .from("team_goals")
            .select()
            .in("team_id", value: teamIdStrings)
            .execute()
            .value
            
        return goals
    }
    
    // MARK: - Roster
    
    func fetchRoster(teamId: UUID) async throws -> [User] {
        // Fetch users who have this teamId in their team_ids array
        // Supabase query: team_ids.cs.{teamId} (contains)
        
        let users: [User] = try await client
            .from("users")
            .select()
            .contains("team_ids", value: [teamId.uuidString])
            .execute()
            .value
            
        return users
    }
}
