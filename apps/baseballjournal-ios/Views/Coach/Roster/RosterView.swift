struct RosterView: View {
    @State private var players: [User] = []
    @State private var isLoading = false
    
    // Need current coach's team ID
    // We assume AuthService has checked role
    // For now pick first coachTeamId
    
    var body: some View {
        NavigationStack {
            List {
                if isLoading {
                    ProgressView()
                } else if players.isEmpty {
                    Text("No players found in your roster.")
                        .foregroundColor(.secondary)
                } else {
                    ForEach(players) { player in
                        NavigationLink(destination: DashboardView(userId: player.id).navigationTitle(player.name)) {
                            HStack {
                                Image(systemName: "person.circle.fill")
                                    .font(.title2)
                                    .foregroundColor(AppColors.primary)
                                VStack(alignment: .leading) {
                                    Text(player.name)
                                        .fontWeight(.medium)
                                    Text(player.email ?? "")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Roster")
            .refreshable {
                 await loadRoster()
            }
            .task {
                await loadRoster()
            }
        }
    }
    
    func loadRoster() async {
        guard let user = AuthService.shared.currentUser,
              let teamId = user.coachTeamIds?.first ?? user.teamIds.first else {
            return
        }
        
        isLoading = true
        do {
            players = try await DataService.shared.fetchRoster(teamId: teamId)
        } catch {
             print("Error fetching roster: \(error)")
        }
        isLoading = false
    }
}
