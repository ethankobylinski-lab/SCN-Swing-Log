import Foundation

enum UserRole: String, Codable {
    case coach = "Coach"
    case player = "Player"
}

struct User: Codable, Identifiable {
    let id: String
    var email: String?
    var phoneNumber: String?
    var name: String
    var role: UserRole
    var teamIds: [String]
    var coachTeamIds: [String]?
    var isNew: Bool?
    var preferences: UserPreferences?
    var orientationCompleted: Bool?
    var profile: PlayerProfile?
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case phoneNumber = "phone_number"
        case name
        case role
        case teamIds = "team_ids"
        case coachTeamIds = "coach_team_ids"
        case isNew = "is_new"
        case preferences
        case orientationCompleted = "orientation_completed"
        case profile
    }
}

struct UserPreferences: Codable {
    var defaultTeamId: String?
    var showAdvancedAnalytics: Bool?
    var darkMode: Bool?
}

struct PlayerProfile: Codable {
    var gradYear: Int?
    var throws: String? // "R" or "L"
    var bats: String? // "R", "L", or "S"
    var position: String?
}

struct Team: Codable, Identifiable {
    let id: String
    var name: String
    var seasonYear: Int
    var coachId: String
    var primaryColor: String?
    var createdAt: String?
    var createdBy: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case seasonYear = "season_year"
        case coachId = "coach_id"
        case primaryColor = "primary_color"
        case createdAt = "created_at"
        case createdBy = "created_by"
    }
}

