import Foundation

// MARK: - User Role
enum UserRole: String, Codable, CaseIterable {
    case coach = "Coach"
    case player = "Player"
}

// MARK: - Membership Role
enum MembershipRole: String, Codable {
    case player = "Player"
    case headCoach = "HeadCoach"
    case assistantCoach = "AssistantCoach"
}

// MARK: - Player Profile
struct PlayerProfile: Codable, Hashable {
    var gradYear: Int
    var bats: BatSide
    var throwHand: ThrowSide
    var position: String?
    
    enum BatSide: String, Codable, CaseIterable {
        case right = "R"
        case left = "L"
        case `switch` = "S"
    }
    
    enum ThrowSide: String, Codable, CaseIterable {
        case right = "R"
        case left = "L"
    }
    
    enum CodingKeys: String, CodingKey {
        case gradYear = "gradYear"
        case bats
        case throwHand = "throws"
        case position
    }
}

// MARK: - User
struct User: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var email: String?
    var phoneNumber: String?
    var role: UserRole
    var teamIds: [UUID]
    var coachTeamIds: [UUID]?
    var isNew: Bool
    var preferences: UserPreferences?
    var profile: PlayerProfile?
    var orientationCompleted: Bool?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case email
        case phoneNumber = "phone_number"
        case role
        case teamIds = "team_ids"
        case coachTeamIds = "coach_team_ids"
        case isNew = "is_new"
        case preferences
        case profile
        case orientationCompleted = "orientation_completed"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? ""
        email = try container.decodeIfPresent(String.self, forKey: .email)
        phoneNumber = try container.decodeIfPresent(String.self, forKey: .phoneNumber)
        role = try container.decodeIfPresent(UserRole.self, forKey: .role) ?? .player
        teamIds = try container.decodeIfPresent([UUID].self, forKey: .teamIds) ?? []
        coachTeamIds = try container.decodeIfPresent([UUID].self, forKey: .coachTeamIds)
        isNew = try container.decodeIfPresent(Bool.self, forKey: .isNew) ?? true
        preferences = try container.decodeIfPresent(UserPreferences.self, forKey: .preferences)
        profile = try container.decodeIfPresent(PlayerProfile.self, forKey: .profile)
        orientationCompleted = try container.decodeIfPresent(Bool.self, forKey: .orientationCompleted)
    }
    
    init(id: UUID, name: String, email: String? = nil, role: UserRole = .player, teamIds: [UUID] = [], isNew: Bool = false) {
        self.id = id
        self.name = name
        self.email = email
        self.role = role
        self.teamIds = teamIds
        self.isNew = isNew
    }
}

// MARK: - User Preferences
struct UserPreferences: Codable, Hashable {
    var defaultTeamId: UUID?
    var showAdvancedAnalytics: Bool?
    var darkMode: Bool?
    
    enum CodingKeys: String, CodingKey {
        case defaultTeamId = "defaultTeamId"
        case showAdvancedAnalytics = "showAdvancedAnalytics"
        case darkMode = "darkMode"
    }
}

// MARK: - Team
struct Team: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var seasonYear: Int
    var coachId: UUID
    var primaryColor: String?
    var createdAt: Date?
    var createdBy: UUID?
    
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

// MARK: - Team Member
struct TeamMember: Identifiable, Codable, Hashable {
    let id: UUID
    var teamId: UUID
    var userId: UUID
    var role: MembershipRole
    var status: String
    var addedBy: UUID?
    var createdAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case teamId = "team_id"
        case userId = "user_id"
        case role
        case status
        case addedBy = "added_by"
        case createdAt = "created_at"
    }
}
