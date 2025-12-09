import SwiftUI

struct SessionDetailView: View {
    let session: Session
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(session.name)
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.textPrimary)
                    
                    Text(formatDate(session.date))
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                    
                    if let drillType = session.sets.first?.drillType {
                        Text(drillType.rawValue)
                            .font(.caption)
                            .foregroundColor(.textMuted)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.primaryBlue.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                
                // Summary Stats
                HStack(spacing: 12) {
                    StatCard(
                        title: "Total Reps",
                        value: "\(getTotalReps())"
                    )
                    StatCard(
                        title: "Execution %",
                        value: "\(AnalyticsHelpers.calculateExecutionPercentage(session.sets))%"
                    )
                }
                .padding(.horizontal)
                
                // Sets
                VStack(alignment: .leading, spacing: 12) {
                    Text("Sets")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                        .padding(.horizontal)
                    
                    ForEach(Array(session.sets.enumerated()), id: \.offset) { index, set in
                        SetDetailCard(set: set, setNumber: index + 1)
                            .padding(.horizontal)
                    }
                }
                
                // Notes
                if let reflection = session.reflection, !reflection.isEmpty {
                    SectionCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notes")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                            Text(reflection)
                                .font(.body)
                                .foregroundColor(.textPrimary)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .background(Color.background)
        .navigationTitle("Session Details")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func getTotalReps() -> Int {
        return session.sets.reduce(0) { $0 + $1.repsAttempted }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .long
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

struct SetDetailCard: View {
    let set: SetResult
    let setNumber: Int
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Set #\(setNumber)")
                .font(.headline)
                .foregroundColor(.textPrimary)
            
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Reps")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                    Text("\(set.repsAttempted)")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.textPrimary)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Executed")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                    Text("\(set.repsExecuted)")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.success)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Hard Hits")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                    Text("\(set.hardHits)")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.warning)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Strikeouts")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                    Text("\(set.strikeouts)")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.error)
                }
            }
            
            if let notes = set.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundColor(.textSecondary)
                    .padding(.top, 4)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

