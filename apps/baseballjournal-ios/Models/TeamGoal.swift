import Foundation

// MARK: - Team Goal
struct TeamGoal: Identifiable, Codable, Hashable {
    let id: UUID
    var teamId: UUID
    var description: String
    var metric: GoalType
    var targetValue: Double
    var startDate: Date
    var targetDate: Date
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
