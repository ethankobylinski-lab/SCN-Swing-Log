import SwiftUI

struct PlayerDashboardView: View {
    @EnvironmentObject var appSession: AppSessionViewModel
    @StateObject private var viewModel = PlayerDashboardViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Welcome Section
                    if let user = appSession.currentUser {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Welcome back, \(user.name)")
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.textPrimary)
                            Text("This Week")
                                .font(.headline)
                                .foregroundColor(.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)
                    }
                    
                    // This Week Summary Cards
                    HStack(spacing: 16) {
                        NavigationLink(destination: PlayerHittingView()) {
                            WeekSummaryCard(
                                title: "Hitting Sessions",
                                count: viewModel.hittingSessionsThisWeek.count,
                                icon: "figure.baseball"
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        NavigationLink(destination: PlayerPitchingView()) {
                            WeekSummaryCard(
                                title: "Pitching Sessions",
                                count: viewModel.pitchingSessionsThisWeek.count,
                                icon: "target"
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .padding(.horizontal)
                    
                    // Active Goals
                    if !viewModel.activeGoals.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Active Goals")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                                .padding(.horizontal)
                            
                            ForEach(viewModel.activeGoals.prefix(3)) { goal in
                                GoalCard(goal: goal)
                                    .padding(.horizontal)
                            }
                        }
                    }
                    
                    // Quick Actions
                    if let user = appSession.currentUser {
                        VStack(spacing: 16) {
                            NavigationLink(destination: HittingRecordingView(
                                playerId: user.id,
                                teamId: user.teamIds.first
                            ).onDisappear {
                                Task {
                                    await viewModel.loadData(playerId: user.id, teamId: user.teamIds.first)
                                }
                            }) {
                                Text("Start Hitting Session")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.primaryBlue)
                                    .cornerRadius(12)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            NavigationLink(destination: PitchingRecordingView(
                                pitcherId: user.id,
                                teamId: user.teamIds.first ?? ""
                            ).onDisappear {
                                Task {
                                    await viewModel.loadData(playerId: user.id, teamId: user.teamIds.first)
                                }
                            }) {
                                Text("Start Pitching Session")
                                    .font(.headline)
                                    .foregroundColor(.primaryBlue)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.white)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.primaryBlue, lineWidth: 2)
                                    )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        .padding(.horizontal)
                        .padding(.top, 8)
                    }
                }
                .padding(.vertical)
            }
            .background(Color.background)
            .navigationTitle("Dashboard")
            .task {
                await loadData()
            }
            .refreshable {
                await loadData()
            }
        }
    }
    
    private func loadData() async {
        if let user = appSession.currentUser {
            await viewModel.loadData(playerId: user.id, teamId: user.teamIds.first)
        }
    }
}

struct WeekSummaryCard: View {
    let title: String
    let count: Int
    let icon: String
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(.primaryBlue)
            Text("\(count)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
            Text(title)
                .font(.caption)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

struct GoalCard: View {
    let goal: PersonalGoal
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(goal.metric.rawValue)
                .font(.headline)
                .foregroundColor(.textPrimary)
            
            HStack {
                Text("Target: \(Int(goal.targetValue))")
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)
                Spacer()
                Text(formatDate(goal.targetDate))
                    .font(.caption)
                    .foregroundColor(.textMuted)
            }
            
            // Progress bar placeholder
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.textMuted.opacity(0.2))
                        .frame(height: 8)
                        .cornerRadius(4)
                    
                    Rectangle()
                        .fill(Color.primaryBlue)
                        .frame(width: geometry.size.width * 0.5, height: 8)
                        .cornerRadius(4)
                }
            }
            .frame(height: 8)
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateString) else { return dateString }
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

