import SwiftUI
import Charts

struct PlayerPitchingView: View {
    @EnvironmentObject var appSession: AppSessionViewModel
    @StateObject private var viewModel = PlayerPitchingViewModel()
    @State private var showingRecording = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Active Goals
                    if !viewModel.activeGoals.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Active Goals")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                                .padding(.horizontal)
                            
                            ForEach(viewModel.activeGoals) { goal in
                                GoalCard(goal: goal)
                                    .padding(.horizontal)
                            }
                        }
                    } else {
                        EmptyState(
                            icon: "target",
                            title: "No Active Goals",
                            description: "Set a goal to track your pitching progress",
                            actionTitle: nil
                        )
                    }
                    
                    // Pitching Summary
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Pitching Summary")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                            .padding(.horizontal)
                        
                        HStack(spacing: 12) {
                            StatCard(
                                title: "Strike %",
                                value: "\(viewModel.overallStrikePct)%"
                            )
                            StatCard(
                                title: "Accuracy %",
                                value: "\(viewModel.accuracyPct)%"
                            )
                        }
                        .padding(.horizontal)
                        
                        StatCard(
                            title: "Total Pitches",
                            value: "\(viewModel.totalPitches)"
                        )
                        .padding(.horizontal)
                    }
                    
                    // Performance Trends
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Performance Over Time")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                            .padding(.horizontal)
                        
                        PitchingPerformanceChart(sessions: viewModel.sessions)
                            .padding(.horizontal)
                    }
                    
                    // Strike Zone Heatmap
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Strike Zone Command")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                            .padding(.horizontal)
                        
                        PitchingStrikeZoneView(sessions: viewModel.sessions)
                            .padding(.horizontal)
                    }
                    
                    // Pitching Journal
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Pitching Journal")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                            Spacer()
                            Text("\(viewModel.sessions.count) sessions")
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                        }
                        .padding(.horizontal)
                        
                        if viewModel.sessions.isEmpty {
                            EmptyState(
                                icon: "target",
                                title: "No Sessions Yet",
                                description: "Start logging your pitching sessions to see your progress",
                                actionTitle: nil
                            )
                        } else {
                            ForEach(viewModel.sessions) { session in
                                PitchSessionRow(session: session)
                                    .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color.background)
            .navigationTitle("Pitching")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingRecording = true
                    }) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.primaryBlue)
                    }
                }
            }
            .sheet(isPresented: $showingRecording) {
                if let user = appSession.currentUser, let teamId = user.teamIds.first {
                    PitchingRecordingView(
                        pitcherId: user.id,
                        teamId: teamId
                    )
                    .onDisappear {
                        // Refresh data when recording view closes
                        Task {
                            await viewModel.loadData(pitcherId: user.id, teamId: user.teamIds.first)
                        }
                    }
                }
            }
            .task {
                await loadData()
            }
            .refreshable {
                await loadData()
            }
    }
    
    private func loadData() async {
        if let user = appSession.currentUser {
            await viewModel.loadData(pitcherId: user.id, teamId: user.teamIds.first)
        }
    }
        }
    }
}

struct PitchingPerformanceChart: View {
    let sessions: [PitchSession]
    
    var body: some View {
        let chartData = sessions
            .sorted { $0.sessionStartTime < $1.sessionStartTime }
            .suffix(10)
            .map { session -> (date: String, strikePct: Double, pitches: Int) in
                let strikePct = session.analytics?.strikePct ?? 0
                return (date: formatDate(session.sessionStartTime), strikePct: strikePct, pitches: session.totalPitches)
            }
        
        Chart {
            ForEach(Array(chartData.enumerated()), id: \.offset) { index, data in
                BarMark(
                    x: .value("Date", data.date),
                    y: .value("Pitches", data.pitches)
                )
                .foregroundStyle(Color.primaryBlue.opacity(0.6))
                
                LineMark(
                    x: .value("Date", data.date),
                    y: .value("Strike %", data.strikePct)
                )
                .foregroundStyle(Color.success)
                .symbol(Circle().strokeBorder(lineWidth: 2))
            }
        }
        .frame(height: 200)
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "M/d"
        return displayFormatter.string(from: date)
    }
}

struct PitchingStrikeZoneView: View {
    let sessions: [PitchSession]
    
    var body: some View {
        // Simplified strike zone view for pitching
        // In a full implementation, this would show pitch location heatmap
        Text("Strike Zone Heatmap")
            .font(.subheadline)
            .foregroundColor(.textSecondary)
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.cardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

