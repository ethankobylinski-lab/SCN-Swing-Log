import Foundation

enum PitchSessionType: String, Codable {
    case command = "command"
    case velo = "velo"
    case mix = "mix"
    case recovery = "recovery"
    case flat = "flat"
    case live = "live"
}

enum PitchSessionStatus: String, Codable {
    case inProgress = "in_progress"
    case completed = "completed"
    case emergencyReview = "emergency_review"
    case discarded = "discarded"
}

struct PitchSession: Codable, Identifiable {
    let id: String
    var pitcherId: String
    var teamId: String
    var catcherId: String?
    var date: String // ISO date string
    var sessionName: String
    var sessionType: PitchSessionType
    var status: PitchSessionStatus
    var gameSituationEnabled: Bool
    var createdAt: String
    var updatedAt: String
    var pitchGoals: [PitchGoal]
    var totalPitches: Int
    var sessionStartTime: String
    var sessionEndTime: String?
    var restHoursRequired: Double?
    var restEndTime: String?
    var analytics: PitchSessionAnalytics?
    var pitchRecords: [PitchRecord]?
    
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
        case restEndTime = "rest_end_time"
        case analytics
        case pitchRecords = "pitch_records"
    }
}

struct PitchGoal: Codable {
    var pitchTypeId: String
    var repsGoal: Int?
    var strikeGoalPct: Double?
    
    enum CodingKeys: String, CodingKey {
        case pitchTypeId = "pitch_type_id"
        case repsGoal = "reps_goal"
        case strikeGoalPct = "strike_goal_pct"
    }
}

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

enum PitchOutcome: String, Codable {
    case ball = "ball"
    case calledStrike = "called_strike"
    case swingingStrike = "swinging_strike"
    case foul = "foul"
    case inPlay = "in_play"
    case hbp = "hbp"
}

struct PitchRecord: Codable, Identifiable {
    let id: String
    var sessionId: String
    var index: Int
    var batterSide: String // "L" or "R"
    var ballsBefore: Int
    var strikesBefore: Int
    var runnersOn: RunnersOn
    var outs: Int
    var pitchTypeId: String
    var targetZone: ZoneId
    var targetXNorm: Double?
    var targetYNorm: Double?
    var actualZone: ZoneId
    var actualXNorm: Double?
    var actualYNorm: Double?
    var velocityMph: Double?
    var outcome: PitchOutcome
    var inPlayQuality: String? // "weak", "medium", "hard"
    var missDistanceInches: Double?
    var createdAt: String
    
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
        case targetXNorm = "target_x_norm"
        case targetYNorm = "target_y_norm"
        case actualZone = "actual_zone"
        case actualXNorm = "actual_x_norm"
        case actualYNorm = "actual_y_norm"
        case velocityMph = "velocity_mph"
        case outcome
        case inPlayQuality = "in_play_quality"
        case missDistanceInches = "miss_distance_inches"
        case createdAt = "created_at"
    }
}

struct RunnersOn: Codable {
    var on1b: Bool
    var on2b: Bool
    var on3b: Bool
    
    enum CodingKeys: String, CodingKey {
        case on1b = "on1b"
        case on2b = "on2b"
        case on3b = "on3b"
    }
}

struct PitchSessionAnalytics: Codable {
    var strikePct: Double
    var accuracyHitRate: Double
    var accuracyProximityAvg: Double
    var pitchTypeMetrics: [PitchTypeMetrics]
    var missPattern: MissPattern
    var situational: SituationalMetrics
    var trend: TrendMetrics
    var commandScore: Double
    var insights: [String]
    
    enum CodingKeys: String, CodingKey {
        case strikePct = "strike_pct"
        case accuracyHitRate = "accuracy_hit_rate"
        case accuracyProximityAvg = "accuracy_proximity_avg"
        case pitchTypeMetrics = "pitch_type_metrics"
        case missPattern = "miss_pattern"
        case situational
        case trend
        case commandScore = "command_score"
        case insights
    }
}

struct PitchTypeMetrics: Codable {
    var pitchTypeId: String
    var pitchTypeName: String
    var count: Int
    var strikePct: Double
    var accuracyHitRate: Double
    var accuracyProximityAvg: Double
    var accuracyInchesAvg: Double?
    var accuracyInchesMedian: Double?
    var accuracyInchesMax: Double?
    
    enum CodingKeys: String, CodingKey {
        case pitchTypeId = "pitch_type_id"
        case pitchTypeName = "pitch_type_name"
        case count
        case strikePct = "strike_pct"
        case accuracyHitRate = "accuracy_hit_rate"
        case accuracyProximityAvg = "accuracy_proximity_avg"
        case accuracyInchesAvg = "accuracy_inches_avg"
        case accuracyInchesMedian = "accuracy_inches_median"
        case accuracyInchesMax = "accuracy_inches_max"
    }
}

struct MissPattern: Codable {
    var missUpPct: Double
    var missDownPct: Double
    var missArmSidePct: Double
    var missGloveSidePct: Double
    var avgMissDistance: Double
    
    enum CodingKeys: String, CodingKey {
        case missUpPct = "miss_up_pct"
        case missDownPct = "miss_down_pct"
        case missArmSidePct = "miss_arm_side_pct"
        case missGloveSidePct = "miss_glove_side_pct"
        case avgMissDistance = "avg_miss_distance"
    }
}

struct SituationalMetrics: Codable {
    var firstPitchStrikePct: Double
    var behindInCountStrikePct: Double
    var behindInCountAccuracy: Double
    
    enum CodingKeys: String, CodingKey {
        case firstPitchStrikePct = "first_pitch_strike_pct"
        case behindInCountStrikePct = "behind_in_count_strike_pct"
        case behindInCountAccuracy = "behind_in_count_accuracy"
    }
}

struct TrendMetrics: Codable {
    var earlyAccuracy: Double
    var lateAccuracy: Double
    
    enum CodingKeys: String, CodingKey {
        case earlyAccuracy = "early_accuracy"
        case lateAccuracy = "late_accuracy"
    }
}

