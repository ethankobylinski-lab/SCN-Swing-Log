import Foundation

struct Drill: Codable, Identifiable {
    let id: String
    var teamId: String
    var coachId: String?
    var name: String
    var description: String
    var targetZones: [TargetZone]
    var pitchTypes: [PitchType]
    var countSituation: CountSituation
    var baseRunners: [BaseRunner]
    var outs: Int
    var goalType: GoalType
    var goalTargetValue: Double
    var repsPerSet: Int
    var sets: Int
    var drillType: DrillType?
    var createdAt: String?
    var updatedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case teamId = "team_id"
        case coachId = "coach_id"
        case name
        case description
        case targetZones = "target_zones"
        case pitchTypes = "pitch_types"
        case countSituation = "count_situation"
        case baseRunners = "base_runners"
        case outs
        case goalType = "goal_type"
        case goalTargetValue = "goal_target_value"
        case repsPerSet = "reps_per_set"
        case sets
        case drillType = "drill_type"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum DayOfWeek: String, Codable {
    case sun = "Sun"
    case mon = "Mon"
    case tue = "Tue"
    case wed = "Wed"
    case thu = "Thu"
    case fri = "Fri"
    case sat = "Sat"
}

struct DrillAssignment: Codable, Identifiable {
    let id: String
    var drillId: String
    var teamId: String
    var playerIds: [String]
    var isRecurring: Bool
    var recurringDays: [DayOfWeek]?
    var dueDate: String?
    var assignedDate: String
    var coachId: String?
    var createdAt: String?
    var updatedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case drillId = "drill_id"
        case teamId = "team_id"
        case playerIds = "player_ids"
        case isRecurring = "is_recurring"
        case recurringDays = "recurring_days"
        case dueDate = "due_date"
        case assignedDate = "assigned_date"
        case coachId = "coach_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// Program represents a structured training program (simplified for v1)
struct Program: Codable, Identifiable {
    let id: String
    var name: String
    var description: String
    var type: ProgramType
    var teamId: String
    var playerIds: [String]
    var status: ProgramStatus
    var createdAt: String?
    var updatedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case type
        case teamId = "team_id"
        case playerIds = "player_ids"
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum ProgramType: String, Codable {
    case hitting = "hitting"
    case pitching = "pitching"
}

enum ProgramStatus: String, Codable {
    case notStarted = "not_started"
    case inProgress = "in_progress"
    case completed = "completed"
}

