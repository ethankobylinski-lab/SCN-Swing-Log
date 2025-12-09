import SwiftUI

struct CoachDashboardView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var viewModel = CoachDashboardViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Team Overview
                    if !viewModel.teams.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Teams")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                                .padding(.horizontal)
                            
                            ForEach(viewModel.teams) { team in
                                TeamCard(team: team)
                                    .padding(.horizontal)
                            }
                        }
                    }
                    
                    // Team Goals
                    if !viewModel.teamGoals.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Team Goals")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                                .padding(.horizontal)
                            
                            ForEach(viewModel.teamGoals) { goal in
                                TeamGoalCard(goal: goal)
                                    .padding(.horizontal)
                            }
                        }
                    }
                    
                    // Players Summary
                    if !viewModel.players.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Players")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                                .padding(.horizontal)
                            
                            HStack(spacing: 12) {
                                StatCard(
                                    title: "Total Players",
                                    value: "\(viewModel.players.count)"
                                )
                                StatCard(
                                    title: "Active Goals",
                                    value: "\(viewModel.teamGoals.count)"
                                )
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color.background)
            .navigationTitle("Coach Dashboard")
            .task {
                await loadData()
            }
            .refreshable {
                await loadData()
            }
        }
    }
    
    private func loadData() async {
        if let user = authService.currentUser {
            await viewModel.loadData(userId: user.id, teamId: user.coachTeamIds?.first)
        }
    }
}

struct TeamCard: View {
    let team: Team
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(team.name)
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                Text("Season \(team.seasonYear)")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.textMuted)
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct TeamGoalCard: View {
    let goal: TeamGoal
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(goal.description)
                .font(.headline)
                .foregroundColor(.textPrimary)
            
            HStack {
                Text("\(goal.metric.rawValue): \(Int(goal.targetValue))")
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)
                Spacer()
                Text(formatDate(goal.targetDate))
                    .font(.caption)
                    .foregroundColor(.textMuted)
            }
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

