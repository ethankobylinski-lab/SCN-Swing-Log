import SwiftUI

struct CoachTeamsView: View {
    @EnvironmentObject var appSession: AppSessionViewModel
    @StateObject private var viewModel = CoachDashboardViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    } else if viewModel.teams.isEmpty {
                        EmptyState(
                            icon: "person.3",
                            title: "No Teams",
                            description: "Create a team to get started",
                            actionTitle: nil
                        )
                    } else {
                        ForEach(viewModel.teams) { team in
                            TeamCard(team: team)
                                .padding(.horizontal)
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color.background)
            .navigationTitle("Teams")
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
            await viewModel.loadData(userId: user.id, teamId: user.coachTeamIds?.first)
        }
    }
}

