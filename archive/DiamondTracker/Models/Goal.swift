import Foundation

enum GoalType: String, Codable {
    case executionPct = "Execution %"
    case hardHitPct = "Hard Hit %"
    case noStrikeouts = "No Strikeouts"
    case totalReps = "Total Reps"
    case strikePct = "Strike %"
    case velocity = "Velocity"
    case command = "Command"
    case totalPitches = "Total Pitches"
}

enum GoalStatus: String, Codable {
    case active = "Active"
    case completed = "Completed"
    case archived = "Archived"
}

struct PersonalGoal: Codable, Identifiable {
    let id: String
    var playerId: String
    var teamId: String
    var metric: GoalType
    var targetValue: Double
    var startDate: String
    var targetDate: String
    var status: GoalStatus
    var drillType: DrillType?
    var targetZones: [TargetZone]?
    var pitchTypes: [PitchType]?
    var reflection: String?
    var minReps: Int?
    var createdByUserId: String?
    var createdByRole: UserRole?
    
    enum CodingKeys: String, CodingKey {
        case id
        case playerId = "player_id"
        case teamId = "team_id"
        case metric
        case targetValue = "target_value"
        case startDate = "start_date"
        case targetDate = "target_date"
        case status
        case drillType = "drill_type"
        case targetZones = "target_zones"
        case pitchTypes = "pitch_types"
        case reflection
        case minReps = "min_reps"
        case createdByUserId = "created_by_user_id"
        case createdByRole = "created_by_role"
    }
}

struct TeamGoal: Codable, Identifiable {
    let id: String
    var teamId: String
    var description: String
    var metric: GoalType
    var targetValue: Double
    var startDate: String
    var targetDate: String
    var status: GoalStatus
    var drillType: DrillType?
    var targetZones: [TargetZone]?
    var pitchTypes: [PitchType]?
    
    enum CodingKeys: String, CodingKey {
        case id
        case teamId = "team_id"
        case description
        case metric
        case targetValue = "target_value"
        case startDate = "start_date"
        case targetDate = "target_date"
        case status
        case drillType = "drill_type"
        case targetZones = "target_zones"
        case pitchTypes = "pitch_types"
    }
}

