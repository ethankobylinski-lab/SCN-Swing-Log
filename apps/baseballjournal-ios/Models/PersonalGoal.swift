import Foundation

// MARK: - Goal Type
enum GoalType: String, Codable, CaseIterable {
    case executionPercent = "Execution %"
    case hardHitPercent = "Hard Hit %"
    case noStrikeouts = "No Strikeouts"
    case totalReps = "Total Reps"
    case strikePercent = "Strike %"
    case velocity = "Velocity"
    case command = "Command"
    case totalPitches = "Total Pitches"
    
    var isHittingGoal: Bool {
        switch self {
        case .executionPercent, .hardHitPercent, .noStrikeouts, .totalReps:
            return true
        case .strikePercent, .velocity, .command, .totalPitches:
            return false
        }
    }
    
    var isPitchingGoal: Bool {
        !isHittingGoal
    }
}

// MARK: - Goal Status
enum GoalStatus: String, Codable {
    case active = "Active"
    case completed = "Completed"
    case archived = "Archived"
}

// MARK: - Personal Goal
struct PersonalGoal: Identifiable, Codable, Hashable {
    let id: UUID
    var playerId: UUID
    var teamId: UUID
    var metric: GoalType
    var targetValue: Double
    var startDate: Date
    var targetDate: Date
    var status: GoalStatus
    var drillType: DrillType?
    var targetZones: [TargetZone]?
    var pitchTypes: [PitchType]?
    var reflection: String?
    var minReps: Int?
    var createdByUserId: UUID?
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
    
    init(id: UUID = UUID(), playerId: UUID, teamId: UUID, metric: GoalType, targetValue: Double, startDate: Date = Date(), targetDate: Date) {
        self.id = id
        self.playerId = playerId
        self.teamId = teamId
        self.metric = metric
        self.targetValue = targetValue
        self.startDate = startDate
        self.targetDate = targetDate
        self.status = .active
    }
}

// MARK: - Personal Goal Insert
struct PersonalGoalInsert: Codable {
    let playerId: UUID
    let teamId: UUID
    let metric: GoalType
    let targetValue: Double
    let startDate: Date
    let targetDate: Date
    let status: GoalStatus
    let drillType: DrillType?
    let targetZones: [TargetZone]?
    let pitchTypes: [PitchType]?
    let minReps: Int?
    
    enum CodingKeys: String, CodingKey {
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
        case minReps = "min_reps"
    }
}
