import Foundation
import Supabase

class SessionService {
    static let shared = SessionService()
    private let client = SupabaseClientProvider.shared.client
    
    private init() {}
    
    func getHittingSessions(playerId: String, teamId: String? = nil) async throws -> [Session] {
        var query = client
            .from("sessions")
            .select()
            .eq("player_id", value: playerId)
        
        if let teamId = teamId {
            query = query.eq("team_id", value: teamId)
        }
        
        let response: [Session] = try await query
            .order("date", ascending: false)
            .execute()
            .value
        
        return response
    }
    
    func getPitchingSessions(pitcherId: String, teamId: String? = nil) async throws -> [PitchSession] {
        var query = client
            .from("pitch_sessions")
            .select()
            .eq("pitcher_id", value: pitcherId)
        
        if let teamId = teamId {
            query = query.eq("team_id", value: teamId)
        }
        
        let response: [PitchSession] = try await query
            .order("session_start_time", ascending: false)
            .execute()
            .value
        
        return response.filter { $0.totalPitches > 0 }
    }
    
    func getSession(id: String) async throws -> Session? {
        let response: [Session] = try await client
            .from("sessions")
            .select()
            .eq("id", value: id)
            .execute()
            .value
        
        return response.first
    }
    
    func getPitchSession(id: String) async throws -> PitchSession? {
        let response: [PitchSession] = try await client
            .from("pitch_sessions")
            .select()
            .eq("id", value: id)
            .execute()
            .value
        
        return response.first
    }
    
    // MARK: - Create/Update Sessions
    
    func createHittingSession(
        playerId: String,
        teamId: String?,
        name: String,
        drillId: String?,
        sets: [SetResult],
        feedback: String?,
        reflection: String?
    ) async throws -> Session {
        let timestamp = ISO8601DateFormatter().string(from: Date())
        
        // Encode sets to JSON array for Supabase JSONB column
        // Supabase expects JSONB as a JSON array, so we encode the sets array directly
        let encoder = JSONEncoder()
        let setsData = try encoder.encode(sets)
        let setsJson = try JSONSerialization.jsonObject(with: setsData)
        
        // Create payload with sets as AnyCodable (will be encoded as JSONB)
        struct SessionPayload: Codable {
            let playerId: String
            let teamId: String?
            let drillId: String?
            let name: String
            let sets: AnyCodable
            let feedback: String?
            let reflection: String?
            let date: String
            let type: String
            let createdAt: String
            let updatedAt: String
            
            enum CodingKeys: String, CodingKey {
                case playerId = "player_id"
                case teamId = "team_id"
                case drillId = "drill_id"
                case name
                case sets
                case feedback
                case reflection
                case date
                case type
                case createdAt = "created_at"
                case updatedAt = "updated_at"
            }
        }
        
        let payload = SessionPayload(
            playerId: playerId,
            teamId: teamId,
            drillId: drillId,
            name: name,
            sets: AnyCodable(setsJson),
            feedback: feedback,
            reflection: reflection,
            date: timestamp,
            type: "hitting",
            createdAt: timestamp,
            updatedAt: timestamp
        )
        
        let response: Session = try await client
            .from("sessions")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value
        
        return response
    }
    
    func updateHittingSession(
        sessionId: String,
        name: String?,
        sets: [SetResult]?,
        feedback: String?,
        reflection: String?
    ) async throws -> Session {
        struct UpdatePayload: Codable {
            var name: String?
            var sets: [AnyCodable]?
            var feedback: String?
            var reflection: String?
            var updatedAt: String
            
            enum CodingKeys: String, CodingKey {
                case name
                case sets
                case feedback
                case reflection
                case updatedAt = "updated_at"
            }
        }
        
        var setsCodable: AnyCodable? = nil
        if let sets = sets {
            let setsJson = try JSONEncoder().encode(sets)
            let setsAny = try JSONSerialization.jsonObject(with: setsJson)
            setsCodable = AnyCodable(setsAny)
        }
        
        struct UpdatePayload: Codable {
            var name: String?
            var sets: AnyCodable?
            var feedback: String?
            var reflection: String?
            var updatedAt: String
            
            enum CodingKeys: String, CodingKey {
                case name
                case sets
                case feedback
                case reflection
                case updatedAt = "updated_at"
            }
        }
        
        let payload = UpdatePayload(
            name: name,
            sets: setsCodable,
            feedback: feedback,
            reflection: reflection,
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )
        
        let response: Session = try await client
            .from("sessions")
            .update(payload)
            .eq("id", value: sessionId)
            .select()
            .single()
            .execute()
            .value
        
        return response
    }
    
    func createPitchSession(
        pitcherId: String,
        teamId: String,
        sessionName: String,
        sessionType: PitchSessionType,
        gameSituationEnabled: Bool = false,
        pitchGoals: [PitchGoal] = []
    ) async throws -> PitchSession {
        let timestamp = ISO8601DateFormatter().string(from: Date())
        
        // Encode pitchGoals to JSON array for Supabase JSONB column
        let goalsJson = try JSONEncoder().encode(pitchGoals)
        let goalsAny = try JSONSerialization.jsonObject(with: goalsJson)
        
        struct PitchSessionPayload: Codable {
            let pitcherId: String
            let teamId: String
            let sessionName: String
            let sessionType: String
            let gameSituationEnabled: Bool
            let pitchGoals: AnyCodable
            let totalPitches: Int
            let sessionStartTime: String
            let status: String
            let createdAt: String
            let updatedAt: String
            
            enum CodingKeys: String, CodingKey {
                case pitcherId = "pitcher_id"
                case teamId = "team_id"
                case sessionName = "session_name"
                case sessionType = "session_type"
                case gameSituationEnabled = "game_situation_enabled"
                case pitchGoals = "pitch_goals"
                case totalPitches = "total_pitches"
                case sessionStartTime = "session_start_time"
                case status
                case createdAt = "created_at"
                case updatedAt = "updated_at"
            }
        }
        
        let payload = PitchSessionPayload(
            pitcherId: pitcherId,
            teamId: teamId,
            sessionName: sessionName,
            sessionType: sessionType.rawValue,
            gameSituationEnabled: gameSituationEnabled,
            pitchGoals: AnyCodable(goalsAny),
            totalPitches: 0,
            sessionStartTime: timestamp,
            status: "in_progress",
            createdAt: timestamp,
            updatedAt: timestamp
        )
        
        let response: PitchSession = try await client
            .from("pitch_sessions")
            .insert(payload)
            .select()
            .single()
            .execute()
            .value
        
        return response
    }
    
    func finalizePitchSession(sessionId: String, notes: String?) async throws -> PitchSession {
        struct FinalizePayload: Codable {
            let sessionEndTime: String
            let status: String
            let updatedAt: String
            
            enum CodingKeys: String, CodingKey {
                case sessionEndTime = "session_end_time"
                case status
                case updatedAt = "updated_at"
            }
        }
        
        let timestamp = ISO8601DateFormatter().string(from: Date())
        let payload = FinalizePayload(
            sessionEndTime: timestamp,
            status: "completed",
            updatedAt: timestamp
        )
        
        let response: PitchSession = try await client
            .from("pitch_sessions")
            .update(payload)
            .eq("id", value: sessionId)
            .select()
            .single()
            .execute()
            .value
        
        return response
    }
    
    func recordPitch(
        sessionId: String,
        index: Int,
        batterSide: String,
        ballsBefore: Int,
        strikesBefore: Int,
        runnersOn: RunnersOn,
        outs: Int,
        pitchTypeId: String,
        targetZone: ZoneId,
        targetXNorm: Double?,
        targetYNorm: Double?,
        actualZone: ZoneId,
        actualXNorm: Double?,
        actualYNorm: Double?,
        velocityMph: Double?,
        outcome: PitchOutcome,
        inPlayQuality: String?
    ) async throws {
        struct RPCParams: Codable {
            let pSessionId: String
            let pIndex: Int
            let pBatterSide: String
            let pBallsBefore: Int
            let pStrikesBefore: Int
            let pRunnersOn: [String: Bool]
            let pOuts: Int
            let pPitchTypeId: String
            let pTargetZone: String
            let pTargetXNorm: Double?
            let pTargetYNorm: Double?
            let pActualZone: String
            let pActualXNorm: Double?
            let pActualYNorm: Double?
            let pVelocityMph: Double?
            let pOutcome: String
            let pInPlayQuality: String?
            
            enum CodingKeys: String, CodingKey {
                case pSessionId = "p_session_id"
                case pIndex = "p_index"
                case pBatterSide = "p_batter_side"
                case pBallsBefore = "p_balls_before"
                case pStrikesBefore = "p_strikes_before"
                case pRunnersOn = "p_runners_on"
                case pOuts = "p_outs"
                case pPitchTypeId = "p_pitch_type_id"
                case pTargetZone = "p_target_zone"
                case pTargetXNorm = "p_target_x_norm"
                case pTargetYNorm = "p_target_y_norm"
                case pActualZone = "p_actual_zone"
                case pActualXNorm = "p_actual_x_norm"
                case pActualYNorm = "p_actual_y_norm"
                case pVelocityMph = "p_velocity_mph"
                case pOutcome = "p_outcome"
                case pInPlayQuality = "p_in_play_quality"
            }
        }
        
        let runnersOnJson = try JSONEncoder().encode(runnersOn)
        let runnersOnDict = try JSONSerialization.jsonObject(with: runnersOnJson) as? [String: Bool] ?? [:]
        
        let params = RPCParams(
            pSessionId: sessionId,
            pIndex: index,
            pBatterSide: batterSide,
            pBallsBefore: ballsBefore,
            pStrikesBefore: strikesBefore,
            pRunnersOn: runnersOnDict,
            pOuts: outs,
            pPitchTypeId: pitchTypeId,
            pTargetZone: targetZone.rawValue,
            pTargetXNorm: targetXNorm,
            pTargetYNorm: targetYNorm,
            pActualZone: actualZone.rawValue,
            pActualXNorm: actualXNorm,
            pActualYNorm: actualYNorm,
            pVelocityMph: velocityMph,
            pOutcome: outcome.rawValue,
            pInPlayQuality: inPlayQuality
        )
        
        // Use the RPC function for atomic pitch recording
        // Note: RPC syntax may vary - adjust based on your Supabase SDK version
        struct RPCResponse: Codable {
            let success: Bool?
            let id: String?
            let error: String?
        }
        
        let response: RPCResponse = try await client
            .rpc("record_pitch_atomic", params: params)
            .execute()
            .value
        
        if let error = response.error {
            throw NSError(domain: "SessionService", code: -1, userInfo: [NSLocalizedDescriptionKey: error])
        }
    }
}

