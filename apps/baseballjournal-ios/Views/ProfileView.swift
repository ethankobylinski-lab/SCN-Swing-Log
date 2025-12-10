import SwiftUI

struct ProfileView: View {
    @ObservedObject var authService = AuthService.shared
    @State private var showLogoutConfirmation = false
    @State private var totalSessions: Int = 0
    @State private var isLoadingStats: Bool = true
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Profile Header
                    profileHeader
                    
                    // Quick Stats
                    statsSection
                    
                    // Team Section
                    teamSection
                    
                    // Account Section
                    accountSection
                    
                    // Sign Out Button
                    signOutButton
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.bottom, AppSpacing.xl)
            }
            .background(AppColors.secondaryBackground.ignoresSafeArea())
            .navigationTitle("Profile")
            .task {
                await loadStats()
            }
            .alert("Sign Out", isPresented: $showLogoutConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    Task { await authService.signOut() }
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
    
    // MARK: - Profile Header
    private var profileHeader: some View {
        VStack(spacing: AppSpacing.md) {
            // Avatar
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [AppColors.primary, AppColors.primaryLight],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 88, height: 88)
                
                Text(initials)
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }
            .shadow(color: AppColors.primary.opacity(0.3), radius: 8, x: 0, y: 4)
            
            // Name & Email
            VStack(spacing: AppSpacing.xxs) {
                Text(authService.currentUser?.name ?? "Player")
                    .font(AppTypography.title2)
                    .foregroundColor(AppColors.textPrimary)
                
                if let email = authService.currentUser?.email {
                    Text(email)
                        .font(AppTypography.subheadline)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            
            // Role Badge
            HStack(spacing: AppSpacing.xs) {
                Image(systemName: "person.fill")
                    .font(.system(size: 12))
                
                Text(authService.currentUser?.role.rawValue ?? "Player")
                    .font(AppTypography.caption)
                    .fontWeight(.semibold)
            }
            .foregroundColor(AppColors.primary)
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.xs)
            .background(
                Capsule()
                    .fill(AppColors.primary.opacity(0.1))
            )
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppSpacing.lg)
        .padding(.top, AppSpacing.sm)
    }
    
    private var initials: String {
        let name = authService.currentUser?.name ?? "P"
        let components = name.components(separatedBy: " ")
        let firstInitial = components.first?.first.map(String.init) ?? "P"
        let lastInitial = components.count > 1 ? components.last?.first.map(String.init) ?? "" : ""
        return (firstInitial + lastInitial).uppercased()
    }
    
    // MARK: - Stats Section
    private var statsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("QUICK STATS")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            HStack(spacing: AppSpacing.sm) {
                ProfileStatCard(
                    value: isLoadingStats ? "..." : "\(totalSessions)",
                    label: "Total Sessions",
                    icon: "calendar",
                    color: AppColors.primary
                )
                
                ProfileStatCard(
                    value: memberSince,
                    label: "Member Since",
                    icon: "star.fill",
                    color: AppColors.secondary
                )
            }
        }
    }
    
    private var memberSince: String {
        // Use current date as placeholder
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM yyyy"
        return formatter.string(from: Date())
    }
    
    // MARK: - Team Section
    private var teamSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("TEAM")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            if let teamIds = authService.currentUser?.teamIds, !teamIds.isEmpty {
                VStack(spacing: AppSpacing.xs) {
                    ForEach(teamIds, id: \.self) { _ in
                        TeamRow()
                    }
                }
            } else {
                EmptyTeamCard()
            }
        }
    }
    
    // MARK: - Account Section
    private var accountSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("ACCOUNT")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            VStack(spacing: 0) {
                AccountRow(icon: "bell.fill", title: "Notifications")
                Divider().padding(.leading, 52)
                AccountRow(icon: "moon.fill", title: "Appearance")
                Divider().padding(.leading, 52)
                AccountRow(icon: "questionmark.circle.fill", title: "Help & Support")
            }
            .background(AppColors.cardBackground)
            .cornerRadius(AppCornerRadius.large)
            .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        }
    }
    
    // MARK: - Sign Out
    private var signOutButton: some View {
        Button(action: { showLogoutConfirmation = true }) {
            HStack(spacing: AppSpacing.sm) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 16, weight: .medium))
                
                Text("Sign Out")
                    .font(AppTypography.callout)
                    .fontWeight(.semibold)
            }
            .foregroundColor(AppColors.error)
            .frame(maxWidth: .infinity)
            .padding(AppSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                    .stroke(AppColors.error.opacity(0.3), lineWidth: 1.5)
                    .background(
                        RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                            .fill(AppColors.error.opacity(0.05))
                    )
            )
        }
    }
    
    // MARK: - Load Stats
    private func loadStats() async {
        guard let userId = AuthService.shared.userId else { return }
        
        let client = SupabaseClientProvider.shared.client
        
        do {
            let hittingSessions: [Session] = try await client
                .from("sessions")
                .select()
                .eq("player_id", value: userId.uuidString)
                .execute()
                .value
            
            let pitchingSessions: [PitchSession] = try await client
                .from("pitch_sessions")
                .select()
                .eq("pitcher_id", value: userId.uuidString)
                .execute()
                .value
            
            totalSessions = hittingSessions.count + pitchingSessions.count
        } catch {
            print("Error loading stats: \(error)")
            totalSessions = 0
        }
        
        isLoadingStats = false
    }
}

// MARK: - Profile Stat Card
struct ProfileStatCard: View {
    let value: String
    let label: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: AppSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(color)
            
            Text(value)
                .font(AppTypography.title3)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textPrimary)
            
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppSpacing.lg)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.large)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Team Row
struct TeamRow: View {
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            ZStack {
                Circle()
                    .fill(AppColors.primary.opacity(0.12))
                    .frame(width: 44, height: 44)
                
                Image(systemName: "person.3.fill")
                    .font(.system(size: 18))
                    .foregroundColor(AppColors.primary)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text("My Team")
                    .font(AppTypography.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.textPrimary)
                
                Text("Active member")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
            
            Spacer()
            
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 20))
                .foregroundColor(AppColors.success)
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Empty Team Card
struct EmptyTeamCard: View {
    var body: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "person.3")
                .font(.system(size: 32))
                .foregroundColor(AppColors.textTertiary)
            
            VStack(spacing: AppSpacing.xxs) {
                Text("No team yet")
                    .font(AppTypography.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.textPrimary)
                
                Text("Join a team to connect with coaches")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.lg)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.large)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Account Row
struct AccountRow: View {
    let icon: String
    let title: String
    
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(AppColors.primary)
                .frame(width: 28)
            
            Text(title)
                .font(AppTypography.callout)
                .foregroundColor(AppColors.textPrimary)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(AppColors.textTertiary)
        }
        .padding(AppSpacing.md)
    }
}

#Preview {
    ProfileView()
}
