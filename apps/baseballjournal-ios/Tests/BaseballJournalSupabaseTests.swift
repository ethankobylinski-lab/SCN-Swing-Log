import XCTest
@testable import BaseballJournal

final class BaseballJournalSupabaseTests: XCTestCase {
    
    func testSupabaseConfigHasPlaceholders() {
        // Verify that placeholders are present (user should replace these)
        let urlString = SupabaseConfig.url.absoluteString
        XCTAssertTrue(
            urlString.contains("YOUR_SUPABASE_PROJECT_ID"),
            "SupabaseConfig.url should contain placeholder 'YOUR_SUPABASE_PROJECT_ID'"
        )
        
        XCTAssertTrue(
            SupabaseConfig.anonKey.contains("YOUR_SUPABASE_ANON_KEY"),
            "SupabaseConfig.anonKey should contain placeholder 'YOUR_SUPABASE_ANON_KEY'"
        )
    }
    
    func testSupabaseClientProviderInitializes() {
        // Test that the client provider can be initialized
        let provider = SupabaseClientProvider.shared
        XCTAssertNotNil(provider.client, "SupabaseClient should be initialized")
    }
    
    func testNoteModelCodable() {
        // Test that Note model can be encoded/decoded
        let note = Note(
            id: UUID(),
            title: "Test Note",
            createdAt: Date()
        )
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        do {
            let data = try encoder.encode(note)
            let decoded = try decoder.decode(Note.self, from: data)
            
            XCTAssertEqual(note.id, decoded.id)
            XCTAssertEqual(note.title, decoded.title)
            XCTAssertEqual(note.createdAt.timeIntervalSince1970, decoded.createdAt.timeIntervalSince1970, accuracy: 1.0)
        } catch {
            XCTFail("Note encoding/decoding failed: \(error)")
        }
    }
}

