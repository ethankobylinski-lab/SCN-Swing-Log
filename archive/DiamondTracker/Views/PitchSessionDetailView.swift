import SwiftUI

struct PitchSessionDetailView: View {
    let session: PitchSession
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(session.sessionName)
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.textPrimary)
                    
                    Text(formatDate(session.sessionStartTime))
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                    
                    Text(session.sessionType.rawValue.capitalized)
                        .font(.caption)
                        .foregroundColor(.textMuted)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.primaryBlue.opacity(0.1))
                        .cornerRadius(8)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                
                // Summary Stats
                if let analytics = session.analytics {
                    HStack(spacing: 12) {
                        StatCard(
                            title: "Strike %",
                            value: "\(Int(analytics.strikePct))%"
                        )
                        StatCard(
                            title: "Accuracy %",
                            value: "\(Int(analytics.accuracyHitRate))%"
                        )
                    }
                    .padding(.horizontal)
                } else {
                    StatCard(
                        title: "Total Pitches",
                        value: "\(session.totalPitches)"
                    )
                    .padding(.horizontal)
                }
                
                // Pitch Type Breakdown
                if let analytics = session.analytics, !analytics.pitchTypeMetrics.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("By Pitch Type")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                            .padding(.horizontal)
                        
                        ForEach(analytics.pitchTypeMetrics, id: \.pitchTypeId) { metric in
                            PitchTypeMetricRow(metric: metric)
                                .padding(.horizontal)
                        }
                    }
                }
            }
            .padding(.vertical)
        }
        .background(Color.background)
        .navigationTitle("Session Details")
        .navigationBarTitleDisplayMode(.inline)
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

struct PitchTypeMetricRow: View {
    let metric: PitchTypeMetrics
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(metric.pitchTypeName)
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                Text("\(metric.count) pitches")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(Int(metric.strikePct))%")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)
                Text("Strike %")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

