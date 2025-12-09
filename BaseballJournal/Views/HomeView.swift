import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var newNoteTitle: String = ""
    
    var body: some View {
        VStack(spacing: 0) {
            // Error message banner
            if let errorMessage = viewModel.errorMessage {
                HStack {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.white)
                    Spacer()
                    Button(action: {
                        viewModel.errorMessage = nil
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.white)
                    }
                }
                .padding()
                .background(Color.red)
            }
            
            // Main content
            VStack(spacing: 20) {
                // Add note section
                VStack(alignment: .leading, spacing: 12) {
                    Text("New Note")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    HStack(spacing: 12) {
                        TextField("Enter note title", text: $newNoteTitle)
                            .textFieldStyle(.roundedBorder)
                            .submitLabel(.done)
                            .onSubmit {
                                Task {
                                    await addNote()
                                }
                            }
                        
                        Button(action: {
                            Task {
                                await addNote()
                            }
                        }) {
                            Text("Add")
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color.blue)
                                .cornerRadius(8)
                        }
                        .disabled(newNoteTitle.trimmingCharacters(in: .whitespaces).isEmpty || viewModel.isLoading)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)
                .padding(.top)
                
                // Notes list
                if viewModel.isLoading && viewModel.notes.isEmpty {
                    Spacer()
                    ProgressView()
                        .scaleEffect(1.5)
                    Spacer()
                } else if viewModel.notes.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "note.text")
                            .font(.system(size: 48))
                            .foregroundColor(.gray)
                        Text("No notes yet")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        Text("Add your first note above")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else {
                    List {
                        ForEach(viewModel.notes) { note in
                            NoteRow(note: note)
                                .listRowSeparator(.hidden)
                                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        }
                    }
                    .listStyle(.plain)
                    .refreshable {
                        await viewModel.loadNotes()
                    }
                }
            }
        }
        .navigationTitle("BaseballJournal")
        .task {
            await viewModel.loadNotes()
        }
    }
    
    private func addNote() async {
        let title = newNoteTitle.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        
        await viewModel.addNote(title: title)
        
        if viewModel.errorMessage == nil {
            newNoteTitle = ""
        }
    }
}

struct NoteRow: View {
    let note: Note
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: note.createdAt)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(note.title)
                .font(.body)
                .foregroundColor(.primary)
            
            Text(formattedDate)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

