import Foundation

struct Note: Identifiable, Codable, Hashable {
    let id: UUID
    let title: String
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case createdAt = "created_at"
    }
}

