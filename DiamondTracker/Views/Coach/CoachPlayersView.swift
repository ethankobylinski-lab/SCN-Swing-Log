import SwiftUI

struct CoachPlayersView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var viewModel = CoachDashboardViewModel()
    @State private var selectedPlayer: User?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    } else if viewModel.players.isEmpty {
                        EmptyState(
                            icon: "person.2",
                            title: "No Players",
                            description: "Players will appear here once they join your team",
                            actionTitle: nil
                        )
                    } else {
                        ForEach(viewModel.players) { player in
                            NavigationLink(destination: CoachPlayerDetailView(player: player)) {
                                PlayerRow(player: player)
                            }
                            .buttonStyle(PlainButtonStyle())
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color.background)
            .navigationTitle("Players")
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

struct PlayerRow: View {
    let player: User
    
    var body: some View {
        HStack {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 40))
                .foregroundColor(.primaryBlue)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(player.name)
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                if let email = player.email {
                    Text(email)
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
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

struct CoachPlayerDetailView: View {
    let player: User
    @StateObject private var hittingViewModel = PlayerHittingViewModel()
    @StateObject private var pitchingViewModel = PlayerPitchingViewModel()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Player Info
                VStack(spacing: 8) {
                    Text(player.name)
                        .font(.title)
                        .fontWeight(.bold)
                    Text(player.email ?? "")
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                }
                .padding()
                
                // Hitting Summary
                VStack(alignment: .leading, spacing: 12) {
                    Text("Hitting")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    HStack(spacing: 12) {
                        StatCard(
                            title: "Execution %",
                            value: "\(hittingViewModel.overallExecutionPct)%"
                        )
                        StatCard(
                            title: "Total Reps",
                            value: "\(hittingViewModel.totalReps)"
                        )
                    }
                    .padding(.horizontal)
                }
                
                // Pitching Summary
                VStack(alignment: .leading, spacing: 12) {
                    Text("Pitching")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    HStack(spacing: 12) {
                        StatCard(
                            title: "Strike %",
                            value: "\(pitchingViewModel.overallStrikePct)%"
                        )
                        StatCard(
                            title: "Total Pitches",
                            value: "\(pitchingViewModel.totalPitches)"
                        )
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .background(Color.background)
        .navigationTitle(player.name)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await hittingViewModel.loadData(playerId: player.id, teamId: player.teamIds.first)
            await pitchingViewModel.loadData(pitcherId: player.id, teamId: player.teamIds.first)
        }
    }
}

