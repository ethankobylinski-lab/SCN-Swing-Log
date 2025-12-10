import Foundation

enum SessionType: String, Codable {
    case hitting = "hitting"
    case pitching = "pitching"
}

struct Session: Codable, Identifiable {
    let id: String
    var playerId: String
    var drillId: String?
    var name: String
    var teamId: String?
    var date: String // ISO string
    var type: SessionType?
    var sets: [SetResult]
    var feedback: String?
    var reflection: String?
    var coachFeedback: String?
    var createdAt: String?
    var updatedAt: String?
    var lastEditedBy: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case playerId = "player_id"
        case drillId = "drill_id"
        case name
        case teamId = "team_id"
        case date
        case type
        case sets
        case feedback
        case reflection
        case coachFeedback = "coach_feedback"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case lastEditedBy = "last_edited_by"
    }
}

struct SetResult: Codable {
    var setNumber: Int
    var repsAttempted: Int
    var repsExecuted: Int
    var hardHits: Int
    var strikeouts: Int
    var drillLabel: String?
    var drillType: DrillType?
    var notes: String?
    var outs: Int?
    var countSituation: CountSituation?
    var baseRunners: [BaseRunner]?
    var grade: Int?
    var pitchTypes: [PitchType]?
    var targetZones: [TargetZone]?
    var strikesBefore: Int? // For 2-strike battle calculation
    
    enum CodingKeys: String, CodingKey {
        case setNumber = "set_number"
        case repsAttempted = "reps_attempted"
        case repsExecuted = "reps_executed"
        case hardHits = "hard_hits"
        case strikeouts
        case drillLabel = "drill_label"
        case drillType = "drill_type"
        case notes
        case outs
        case countSituation = "count_situation"
        case baseRunners = "base_runners"
        case grade
        case pitchTypes = "pitch_types"
        case targetZones = "target_zones"
        case strikesBefore = "strikes_before"
    }
}

enum TargetZone: String, Codable {
    case insideHigh = "Inside High"
    case insideMiddle = "Inside Middle"
    case insideLow = "Inside Low"
    case middleHigh = "Middle High"
    case middleMiddle = "Middle Middle"
    case middleLow = "Middle Low"
    case outsideHigh = "Outside High"
    case outsideMiddle = "Outside Middle"
    case outsideLow = "Outside Low"
}

enum PitchType: String, Codable {
    case fastball = "Fastball"
    case curveball = "Curveball"
    case slider = "Slider"
    case changeup = "Changeup"
    case sinker = "Sinker"
}

enum CountSituation: String, Codable {
    case ahead = "Ahead"
    case even = "Even"
    case behind = "Behind"
}

enum BaseRunner: String, Codable {
    case first = "1B"
    case second = "2B"
    case third = "3B"
}

enum DrillType: String, Codable {
    case teeWork = "Tee Work"
    case softToss = "Soft Toss"
    case frontToss = "Front Toss"
    case throwing = "Throwing"
    case liveBP = "Live BP"
    case machine = "Machine"
}

