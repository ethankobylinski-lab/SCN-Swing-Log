import Foundation

// MARK: - Pitch Session Type
enum PitchSessionType: String, Codable, CaseIterable {
    case command = "command"
    case velo = "velo"
    case mix = "mix"
    case recovery = "recovery"
    case flat = "flat"
    case live = "live"
    
    var displayName: String {
        switch self {
        case .command: return "Command"
        case .velo: return "Velo"
        case .mix: return "Mix"
        case .recovery: return "Recovery"
        case .flat: return "Flat Ground"
        case .live: return "Live"
        }
    }
}

// MARK: - Pitch Session Status
enum PitchSessionStatus: String, Codable {
    case inProgress = "in_progress"
    case completed = "completed"
    case emergencyReview = "emergency_review"
    case discarded = "discarded"
}

// MARK: - Zone ID
enum ZoneId: String, Codable {
    case z11 = "Z11"
    case z12 = "Z12"
    case z13 = "Z13"
    case z21 = "Z21"
    case z22 = "Z22"
    case z23 = "Z23"
    case z31 = "Z31"
    case z32 = "Z32"
    case z33 = "Z33"
    case edgeHigh = "EDGE_HIGH"
    case edgeLow = "EDGE_LOW"
    case edgeGlove = "EDGE_GLOVE"
    case edgeArm = "EDGE_ARM"
}

// MARK: - Pitch Outcome
enum PitchOutcome: String, Codable {
    case ball = "ball"
    case calledStrike = "called_strike"
    case swingingStrike = "swinging_strike"
    case foul = "foul"
    case inPlay = "in_play"
    case hbp = "hbp"
    
    var isStrike: Bool {
        switch self {
        case .calledStrike, .swingingStrike, .foul, .inPlay:
            return true
        case .ball, .hbp:
            return false
        }
    }
}

// MARK: - Pitch Record
struct PitchRecord: Identifiable, Codable, Hashable {
    let id: UUID
    var sessionId: UUID
    var index: Int
    var batterSide: String // "L" or "R"
    var ballsBefore: Int
    var strikesBefore: Int
    var runnersOn: RunnersOn
    var outs: Int
    var pitchTypeId: UUID
    var targetZone: ZoneId
    var actualZone: ZoneId
    var velocityMph: Double?
    var outcome: PitchOutcome
    var createdAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case sessionId = "session_id"
        case index
        case batterSide = "batter_side"
        case ballsBefore = "balls_before"
        case strikesBefore = "strikes_before"
        case runnersOn = "runners_on"
        case outs
        case pitchTypeId = "pitch_type_id"
        case targetZone = "target_zone"
        case actualZone = "actual_zone"
        case velocityMph = "velocity_mph"
        case outcome
        case createdAt = "created_at"
    }
}

// MARK: - Runners On
struct RunnersOn: Codable, Hashable {
    var on1b: Bool
    var on2b: Bool
    var on3b: Bool
    
    init(on1b: Bool = false, on2b: Bool = false, on3b: Bool = false) {
        self.on1b = on1b
        self.on2b = on2b
        self.on3b = on3b
    }
}

// MARK: - Pitch Goal
struct PitchGoal: Codable, Hashable {
    var pitchTypeId: UUID
    var repsGoal: Int?
    var strikeGoalPct: Double?
    
    enum CodingKeys: String, CodingKey {
        case pitchTypeId = "pitchTypeId"
        case repsGoal = "repsGoal"
        case strikeGoalPct = "strikeGoalPct"
    }
}

// MARK: - Pitch Session
struct PitchSession: Identifiable, Codable, Hashable {
    let id: UUID
    var pitcherId: UUID
    var teamId: UUID
    var catcherId: UUID?
    var date: Date
    var sessionName: String
    var sessionType: PitchSessionType
    var status: PitchSessionStatus
    var gameSituationEnabled: Bool
    var createdAt: Date?
    var updatedAt: Date?
    var pitchGoals: [PitchGoal]
    var totalPitches: Int
    var sessionStartTime: Date?
    var sessionEndTime: Date?
    var restHoursRequired: Double?
    var pitchRecords: [PitchRecord]?
    var analytics: PitchSessionAnalytics?
    
    enum CodingKeys: String, CodingKey {
        case id
        case pitcherId = "pitcher_id"
        case teamId = "team_id"
        case catcherId = "catcher_id"
        case date
        case sessionName = "session_name"
        case sessionType = "session_type"
        case status
        case gameSituationEnabled = "game_situation_enabled"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case pitchGoals = "pitch_goals"
        case totalPitches = "total_pitches"
        case sessionStartTime = "session_start_time"
        case sessionEndTime = "session_end_time"
        case restHoursRequired = "rest_hours_required"
        case pitchRecords = "pitch_records"
        case analytics
    }
    
    // Computed properties
    var strikeCount: Int {
        pitchRecords?.filter { $0.outcome.isStrike }.count ?? 0
    }
    
    var ballCount: Int {
        pitchRecords?.filter { !$0.outcome.isStrike }.count ?? 0
    }
    
    var strikePercentage: Double {
        guard totalPitches > 0 else { return 0 }
        return Double(strikeCount) / Double(totalPitches) * 100
    }
    
    init(id: UUID = UUID(), pitcherId: UUID, teamId: UUID, sessionName: String, sessionType: PitchSessionType) {
        self.id = id
        self.pitcherId = pitcherId
        self.teamId = teamId
        self.sessionName = sessionName
        self.sessionType = sessionType
        self.date = Date()
        self.status = .inProgress
        self.gameSituationEnabled = false
        self.pitchGoals = []
        self.totalPitches = 0
    }
}

// MARK: - Pitch Session Insert
struct PitchSessionInsert: Codable {
    let pitcherId: UUID
    let teamId: UUID
    let catcherId: UUID?
    let date: Date
    let sessionName: String
    let sessionType: PitchSessionType
    let status: PitchSessionStatus
    let gameSituationEnabled: Bool
    let pitchGoals: [PitchGoal]
    let totalPitches: Int
    let sessionStartTime: Date
    
    enum CodingKeys: String, CodingKey {
        case pitcherId = "pitcher_id"
        case teamId = "team_id"
        case catcherId = "catcher_id"
        case date
        case sessionName = "session_name"
        case sessionType = "session_type"
        case status
        case gameSituationEnabled = "game_situation_enabled"
        case pitchGoals = "pitch_goals"
        case totalPitches = "total_pitches"
        case sessionStartTime = "session_start_time"
    }
}

// MARK: - Pitch Session Analytics
struct PitchSessionAnalytics: Codable, Hashable {
    var strikePct: Double
    var accuracyHitRate: Double
    var accuracyProximityAvg: Double
    var pitchTypeMetrics: [PitchTypeMetrics]
    var missPattern: MissPattern
    var situational: SituationalMetrics
    var trend: TrendMetrics
    var commandScore: Double
    var insights: [String]
}

struct MissPattern: Codable, Hashable {
    var missUpPct: Double
    var missDownPct: Double
    var missArmSidePct: Double
    var missGloveSidePct: Double
    var avgMissDistance: Double
}

struct SituationalMetrics: Codable, Hashable {
    var firstPitchStrikePct: Double
    var behindInCountStrikePct: Double
    var behindInCountAccuracy: Double
}

struct TrendMetrics: Codable, Hashable {
    var earlyAccuracy: Double
    var lateAccuracy: Double
}

struct PitchTypeMetrics: Codable, Hashable {
    var pitchTypeId: UUID
    var pitchTypeName: String
    var count: Int
    var strikePct: Double
    var accuracyHitRate: Double
    var accuracyProximityAvg: Double
    var accuracyInchesAvg: Double?
    var accuracyInchesMedian: Double?
    var accuracyInchesMax: Double?
}
