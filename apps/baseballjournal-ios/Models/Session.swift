import Foundation

// MARK: - Session Type
enum SessionType: String, Codable, CaseIterable {
    case hitting = "hitting"
    case pitching = "pitching"
}

// MARK: - Drill Type
enum DrillType: String, Codable, CaseIterable {
    case teeWork = "Tee Work"
    case softToss = "Soft Toss"
    case frontToss = "Front Toss"
    case throwing = "Throwing"
    case liveBP = "Live BP"
    case machine = "Machine"
}

// MARK: - Target Zone
enum TargetZone: String, Codable, CaseIterable {
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

// MARK: - Pitch Type
enum PitchType: String, Codable, CaseIterable {
    case fastball = "Fastball"
    case curveball = "Curveball"
    case slider = "Slider"
    case changeup = "Changeup"
    case sinker = "Sinker"
}

// MARK: - Count Situation
enum CountSituation: String, Codable, CaseIterable {
    case ahead = "Ahead"
    case even = "Even"
    case behind = "Behind"
}

// MARK: - Set Result
struct SetResult: Codable, Hashable, Identifiable {
    var id = UUID()
    var setNumber: Int
    var repsAttempted: Int
    var repsExecuted: Int
    var hardHits: Int?
    var strikeouts: Int?
    var drillLabel: String?
    var drillType: DrillType?
    var notes: String?
    var outs: Int?
    var countSituation: CountSituation?
    var grade: Int?
    var pitchTypes: [PitchType]?
    var targetZones: [TargetZone]?
    
    enum CodingKeys: String, CodingKey {
        case setNumber
        case repsAttempted
        case repsExecuted
        case hardHits
        case strikeouts
        case drillLabel
        case drillType
        case notes
        case outs
        case countSituation
        case grade
        case pitchTypes
        case targetZones
    }
    
    init(setNumber: Int = 1, repsAttempted: Int = 0, repsExecuted: Int = 0) {
        self.setNumber = setNumber
        self.repsAttempted = repsAttempted
        self.repsExecuted = repsExecuted
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        setNumber = try container.decode(Int.self, forKey: .setNumber)
        repsAttempted = try container.decode(Int.self, forKey: .repsAttempted)
        repsExecuted = try container.decode(Int.self, forKey: .repsExecuted)
        hardHits = try container.decodeIfPresent(Int.self, forKey: .hardHits)
        strikeouts = try container.decodeIfPresent(Int.self, forKey: .strikeouts)
        drillLabel = try container.decodeIfPresent(String.self, forKey: .drillLabel)
        drillType = try container.decodeIfPresent(DrillType.self, forKey: .drillType)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        outs = try container.decodeIfPresent(Int.self, forKey: .outs)
        countSituation = try container.decodeIfPresent(CountSituation.self, forKey: .countSituation)
        grade = try container.decodeIfPresent(Int.self, forKey: .grade)
        pitchTypes = try container.decodeIfPresent([PitchType].self, forKey: .pitchTypes)
        targetZones = try container.decodeIfPresent([TargetZone].self, forKey: .targetZones)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(setNumber, forKey: .setNumber)
        try container.encode(repsAttempted, forKey: .repsAttempted)
        try container.encode(repsExecuted, forKey: .repsExecuted)
        try container.encodeIfPresent(hardHits, forKey: .hardHits)
        try container.encodeIfPresent(strikeouts, forKey: .strikeouts)
        try container.encodeIfPresent(drillLabel, forKey: .drillLabel)
        try container.encodeIfPresent(drillType, forKey: .drillType)
        try container.encodeIfPresent(notes, forKey: .notes)
        try container.encodeIfPresent(outs, forKey: .outs)
        try container.encodeIfPresent(countSituation, forKey: .countSituation)
        try container.encodeIfPresent(grade, forKey: .grade)
        try container.encodeIfPresent(pitchTypes, forKey: .pitchTypes)
        try container.encodeIfPresent(targetZones, forKey: .targetZones)
    }
}

// MARK: - Session (Hitting)
struct Session: Identifiable, Codable, Hashable {
    let id: UUID
    var playerId: UUID
    var teamId: UUID?
    var drillId: UUID?
    var name: String
    var date: Date
    var type: SessionType?
    var sets: [SetResult]
    var feedback: String?
    var reflection: String?
    var coachFeedback: String?
    var createdAt: Date?
    var updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case playerId = "player_id"
        case teamId = "team_id"
        case drillId = "drill_id"
        case name
        case date
        case type
        case sets
        case feedback
        case reflection
        case coachFeedback = "coach_feedback"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    // Computed properties
    var totalRepsAttempted: Int {
        sets.reduce(0) { $0 + $1.repsAttempted }
    }
    
    var totalRepsExecuted: Int {
        sets.reduce(0) { $0 + $1.repsExecuted }
    }
    
    var executionPercentage: Double {
        guard totalRepsAttempted > 0 else { return 0 }
        return Double(totalRepsExecuted) / Double(totalRepsAttempted) * 100
    }
    
    init(id: UUID = UUID(), playerId: UUID, teamId: UUID? = nil, name: String, date: Date = Date(), sets: [SetResult] = []) {
        self.id = id
        self.playerId = playerId
        self.teamId = teamId
        self.name = name
        self.date = date
        self.sets = sets
        self.type = .hitting
    }
}

// MARK: - Insert payload for creating new sessions
struct SessionInsert: Codable {
    let playerId: UUID
    let teamId: UUID?
    let drillId: UUID?
    let name: String
    let date: Date
    let type: SessionType?
    let sets: [SetResult]
    let feedback: String?
    let reflection: String?
    
    enum CodingKeys: String, CodingKey {
        case playerId = "player_id"
        case teamId = "team_id"
        case drillId = "drill_id"
        case name
        case date
        case type
        case sets
        case feedback
        case reflection
    }
}
