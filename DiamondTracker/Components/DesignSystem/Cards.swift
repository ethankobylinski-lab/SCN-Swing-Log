import SwiftUI

struct StatCard: View {
    let title: String
    let value: String
    let subtitle: String?
    
    init(title: String, value: String, subtitle: String? = nil) {
        self.title = title
        self.value = value
        self.subtitle = subtitle
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(.textSecondary)
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.footnote)
                    .foregroundColor(.textMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

struct SectionCard<Content: View>: View {
    let content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            content
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

struct SessionRow: View {
    let session: Session
    
    var body: some View {
        NavigationLink(destination: SessionDetailView(session: session)) {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(session.name)
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    Text(formatDate(session.date))
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(getTotalReps(session))")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.textPrimary)
                    Text("Total Reps")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(AnalyticsHelpers.calculateExecutionPercentage(session.sets))%")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.textPrimary)
                    Text("Exec %")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.textMuted)
            }
            .padding()
            .background(Color.cardBackground)
            .cornerRadius(12)
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
    
    private func getTotalReps(_ session: Session) -> Int {
        return session.sets.reduce(0) { $0 + $1.repsAttempted }
    }
}

struct PitchSessionRow: View {
    let session: PitchSession
    
    var body: some View {
        NavigationLink(destination: PitchSessionDetailView(session: session)) {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(session.sessionName)
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    Text(formatDate(session.sessionStartTime))
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(session.totalPitches)")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.textPrimary)
                    Text("Pitches")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(Int(session.analytics?.strikePct ?? 0))%")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.textPrimary)
                    Text("Strike %")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.textMuted)
            }
            .padding()
            .background(Color.cardBackground)
            .cornerRadius(12)
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

