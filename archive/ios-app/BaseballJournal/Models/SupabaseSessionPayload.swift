import Foundation

// Helper structs for Supabase insert/update operations
struct SupabaseSessionPayload: Codable {
    let playerId: String
    let teamId: String?
    let drillId: String?
    let name: String
    let sets: [AnyCodable] // JSON array - will be encoded as JSONB
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

struct SupabasePitchSessionPayload: Codable {
    let pitcherId: String
    let teamId: String
    let sessionName: String
    let sessionType: String
    let gameSituationEnabled: Bool
    let pitchGoals: [AnyCodable] // JSON array for JSONB
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

// Helper to encode Any values for JSON (used for JSONB columns in Supabase)
struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "AnyCodable value cannot be decoded")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        case let dictArray as [[String: Any]]:
            // Handle array of dictionaries (for sets, pitchGoals)
            try container.encode(dictArray.map { dict in
                dict.mapValues { AnyCodable($0) }
            })
        default:
            // For complex nested structures, try JSONSerialization approach
            let jsonData = try JSONSerialization.data(withJSONObject: value)
            let jsonObject = try JSONSerialization.jsonObject(with: jsonData)
            if let array = jsonObject as? [Any] {
                try container.encode(array.map { AnyCodable($0) })
            } else if let dict = jsonObject as? [String: Any] {
                try container.encode(dict.mapValues { AnyCodable($0) })
            } else {
                throw EncodingError.invalidValue(value, EncodingError.Context(codingPath: container.codingPath, debugDescription: "AnyCodable value cannot be encoded"))
            }
        }
    }
}

