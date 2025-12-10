import Foundation

// MARK: - Base Runner
enum BaseRunner: String, Codable, CaseIterable {
    case first = "1B"
    case second = "2B"
    case third = "3B"
}

// MARK: - Drill
struct Drill: Identifiable, Codable, Hashable {
    let id: UUID
    var teamId: UUID
    var name: String
    var description: String
    var targetZones: [TargetZone]
    var pitchTypes: [PitchType]
    var countSituation: CountSituation
    var baseRunners: [BaseRunner]
    var outs: Int // 0, 1, 2
    var goalType: GoalType
    var goalTargetValue: Double
    var repsPerSet: Int
    var sets: Int
    var drillType: DrillType?
    
    enum CodingKeys: String, CodingKey {
        case id
        case teamId = "team_id"
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
    }
}

// MARK: - Day of Week
enum DayOfWeek: String, Codable, CaseIterable {
    case sun = "Sun"
    case mon = "Mon"
    case tue = "Tue"
    case wed = "Wed"
    case thu = "Thu"
    case fri = "Fri"
    case sat = "Sat"
}

// MARK: - Drill Assignment
struct DrillAssignment: Identifiable, Codable, Hashable {
    let id: UUID
    var drillId: UUID
    var teamId: UUID
    var playerIds: [String] // "all" or specific UUID strings
    var isRecurring: Bool
    var recurringDays: [DayOfWeek]?
    var dueDate: Date?
    var assignedDate: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case drillId = "drill_id"
        case teamId = "team_id"
        case playerIds = "player_ids"
        case isRecurring = "is_recurring"
        case recurringDays = "recurring_days"
        case dueDate = "due_date"
        case assignedDate = "assigned_date"
    }
}
