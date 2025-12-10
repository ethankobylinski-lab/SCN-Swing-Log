import SwiftUI
import Charts

struct PlayerHittingView: View {
    @EnvironmentObject var appSession: AppSessionViewModel
    @StateObject private var viewModel = PlayerHittingViewModel()
    @State private var selectedTab = 0
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
                            description: "Set a goal to track your hitting progress",
                            actionTitle: nil
                        )
                    }
                    
                    // Hitting Summary
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Hitting Summary")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                            .padding(.horizontal)
                        
                        HStack(spacing: 12) {
                            StatCard(
                                title: "Execution %",
                                value: "\(viewModel.overallExecutionPct)%"
                            )
                            StatCard(
                                title: "Hard-Hit %",
                                value: "\(viewModel.hardHitPct)%"
                            )
                        }
                        .padding(.horizontal)
                        
                        HStack(spacing: 12) {
                            StatCard(
                                title: "Contact %",
                                value: "\(viewModel.contactPct)%"
                            )
                            StatCard(
                                title: "2-Strike Battle %",
                                value: "\(viewModel.twoStrikeBattlePct)%"
                            )
                        }
                        .padding(.horizontal)
                    }
                    
                    // Performance Trends
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Performance Over Time")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                            .padding(.horizontal)
                        
                        PerformanceChart(sessions: viewModel.sessions)
                            .padding(.horizontal)
                    }
                    
                    // Strike Zone Execution
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Strike Zone Execution")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                            .padding(.horizontal)
                        
                        StrikeZoneExecutionView(sessions: viewModel.sessions)
                            .padding(.horizontal)
                    }
                    
                    // Hitting Journal
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Hitting Journal")
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
                                icon: "figure.baseball",
                                title: "No Sessions Yet",
                                description: "Start logging your hitting sessions to see your progress",
                                actionTitle: nil
                            )
                        } else {
                            ForEach(viewModel.sessions) { session in
                                SessionRow(session: session)
                                    .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color.background)
            .navigationTitle("Hitting")
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
                if let user = appSession.currentUser {
                    HittingRecordingView(
                        playerId: user.id,
                        teamId: user.teamIds.first
                    )
                    .onDisappear {
                        // Refresh data when recording view closes
                        Task {
                            await viewModel.loadData(playerId: user.id, teamId: user.teamIds.first)
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
            await viewModel.loadData(playerId: user.id, teamId: user.teamIds.first)
        }
    }
        }
    }
}

struct PerformanceChart: View {
    let sessions: [Session]
    
    var body: some View {
        let chartData = sessions
            .sorted { $0.date < $1.date }
            .suffix(10)
            .map { session -> (date: String, execution: Double, reps: Int) in
                let execution = Double(AnalyticsHelpers.calculateExecutionPercentage(session.sets))
                let reps = session.sets.reduce(0) { $0 + $1.repsAttempted }
                return (date: formatDate(session.date), execution: execution, reps: reps)
            }
        
        Chart {
            ForEach(Array(chartData.enumerated()), id: \.offset) { index, data in
                BarMark(
                    x: .value("Date", data.date),
                    y: .value("Reps", data.reps)
                )
                .foregroundStyle(Color.primaryBlue.opacity(0.6))
                
                LineMark(
                    x: .value("Date", data.date),
                    y: .value("Execution", data.execution)
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

struct StrikeZoneExecutionView: View {
    let sessions: [Session]
    @State private var selectedMetric: StrikeZoneView.ZoneMetric = .executionPct
    
    var zoneStats: [TargetZone: StrikeZoneView.ZoneStat] {
        var stats: [TargetZone: StrikeZoneView.ZoneStat] = [
            .insideHigh: StrikeZoneView.ZoneStat(reps: 0, hardHits: 0, execution: 0),
            .insideMiddle: StrikeZoneView.ZoneStat(reps: 0, hardHits: 0, execution: 0),
            .insideLow: StrikeZoneView.ZoneStat(reps: 0, hardHits: 0, execution: 0),
            .middleHigh: StrikeZoneView.ZoneStat(reps: 0, hardHits: 0, execution: 0),
            .middleMiddle: StrikeZoneView.ZoneStat(reps: 0, hardHits: 0, execution: 0),
            .middleLow: StrikeZoneView.ZoneStat(reps: 0, hardHits: 0, execution: 0),
            .outsideHigh: StrikeZoneView.ZoneStat(reps: 0, hardHits: 0, execution: 0),
            .outsideMiddle: StrikeZoneView.ZoneStat(reps: 0, hardHits: 0, execution: 0),
            .outsideLow: StrikeZoneView.ZoneStat(reps: 0, hardHits: 0, execution: 0)
        ]
        
        for session in sessions {
            for set in session.sets {
                if let targetZones = set.targetZones {
                    for zone in targetZones {
                        if var stat = stats[zone] {
                            stat.reps += set.repsAttempted
                            stat.hardHits += set.hardHits
                            stat.execution += set.repsExecuted
                            stats[zone] = stat
                        }
                    }
                }
            }
        }
        
        return stats
    }
    
    var body: some View {
        VStack(spacing: 16) {
            Picker("Metric", selection: $selectedMetric) {
                Text("Execution %").tag(StrikeZoneView.ZoneMetric.executionPct)
                Text("Hard Hit %").tag(StrikeZoneView.ZoneMetric.hardHitPct)
                Text("Reps").tag(StrikeZoneView.ZoneMetric.reps)
            }
            .pickerStyle(SegmentedPickerStyle())
            
            StrikeZoneView(zoneStats: zoneStats, metric: selectedMetric)
        }
    }
}

