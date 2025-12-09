import Foundation
import SwiftUI

@MainActor
class HomeViewModel: ObservableObject {
    @Published var notes: [Note] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let client = SupabaseClientProvider.shared.client
    
    func loadNotes() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response: [Note] = try await client
                .from("notes")
                .select()
                .order("created_at", ascending: false)
                .execute()
                .value
            
            notes = response
        } catch {
            errorMessage = "Failed to load notes: \(error.localizedDescription)"
            print("Error loading notes: \(error)")
        }
        
        isLoading = false
    }
    
    func addNote(title: String) async {
        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else {
            errorMessage = "Note title cannot be empty"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        struct NoteInsert: Codable {
            let title: String
        }
        
        let insert = NoteInsert(title: title)
        
        do {
            let response: Note = try await client
                .from("notes")
                .insert(insert)
                .select()
                .single()
                .execute()
                .value
            
            // Add to local array at the beginning (most recent first)
            notes.insert(response, at: 0)
        } catch {
            errorMessage = "Failed to add note: \(error.localizedDescription)"
            print("Error adding note: \(error)")
        }
        
        isLoading = false
    }
}

