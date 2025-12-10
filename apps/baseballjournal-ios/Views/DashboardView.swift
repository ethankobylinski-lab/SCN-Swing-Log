import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel: DashboardViewModel
    @State private var showSessionPicker = false
    @State private var showHittingSheet = false
    @State private var showPitchingSheet = false
    
    init(userId: UUID? = nil) {
        _viewModel = StateObject(wrappedValue: DashboardViewModel(targetUserId: userId))
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Welcome & Primary CTA
                    heroSection
                    
                    // Daily Drills
                    if !viewModel.assignedDrills.isEmpty {
                        drillsSection
                    }
                    
                    // Goals
                    if !viewModel.activeGoals.isEmpty {
                        goalsSection
                    }
                    
                    // Quick Stats
                    statsRow
                    
                    // Recent Activity
                    recentActivitySection
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.bottom, AppSpacing.xl)
            }
            .background(AppColors.secondaryBackground.ignoresSafeArea())
            .navigationTitle("Dashboard")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
            .sheet(isPresented: $showHittingSheet) {
                LogHittingSheet {
                    Task { await viewModel.loadData() }
                }
            }
            .sheet(isPresented: $showPitchingSheet) {
                LogPitchingSheet {
                    Task { await viewModel.loadData() }
                }
            }
            .confirmationDialog("Start Session", isPresented: $showSessionPicker, titleVisibility: .visible) {
                Button("⚾️ Hitting Session") { showHittingSheet = true }
                Button("🎯 Pitching Session") { showPitchingSheet = true }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("What type of training are you doing?")
            }
        }
    }
    
    // MARK: - Hero Section
    private var heroSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.lg) {
            // Welcome
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text("Hey, \(viewModel.userName) 👋")
                    .font(AppTypography.title)
                    .foregroundColor(AppColors.textPrimary)
                
                Text(greetingMessage)
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.textSecondary)
            }
            
            // Primary CTA
            Button(action: { showSessionPicker = true }) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 24))
                    
                    Text("Start Session")
                        .font(AppTypography.headline)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white.opacity(0.7))
                }
                .foregroundColor(.white)
                .padding(AppSpacing.lg)
                .background(
                    LinearGradient(
                        colors: [AppColors.primary, AppColors.primaryLight],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(AppCornerRadius.large)
                .shadow(color: AppColors.primary.opacity(0.3), radius: 8, x: 0, y: 4)
            }
            .buttonStyle(.plain)
        }
        .padding(.top, AppSpacing.sm)
    }
    
    private var greetingMessage: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Ready for morning training?" }
        if hour < 17 { return "Let's work on your game." }
        return "Time for an evening session?"
    }
    
    // MARK: - Stats Row
    private var statsRow: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("THIS WEEK")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            HStack(spacing: AppSpacing.sm) {
                MiniStatCard(
                    value: "\(viewModel.hittingSessionsThisWeek)",
                    label: "Hitting",
                    icon: "baseball.fill",
                    color: AppColors.primary
                )
                
                MiniStatCard(
                    value: "\(viewModel.pitchingSessionsThisWeek)",
                    label: "Pitching",
                    icon: "target",
                    color: AppColors.secondary
                )
                
                MiniStatCard(
                    value: "\(viewModel.totalSessionsThisWeek)",
                    label: "Total",
                    icon: "flame.fill",
                    color: AppColors.success
                )
            }
        }
    }
    
    // MARK: - Drills Section
    private var drillsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("DAILY DRILLS")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.md) {
                    ForEach(viewModel.assignedDrills) { drill in
                        DrillCard(drill: drill)
                    }
                }
            }
        }
    }
    
    // MARK: - Goals Section
    private var goalsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("YOUR GOALS")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            VStack(spacing: AppSpacing.sm) {
                ForEach(viewModel.activeGoals) { goal in
                    GoalStrip(goal: goal)
                }
            }
        }
    }

    // MARK: - Recent Activity
    private var recentActivitySection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                Text("RECENT SESSIONS")
                    .font(AppTypography.caption)
                    .fontWeight(.bold)
                    .foregroundColor(AppColors.textTertiary)
                    .tracking(0.5)
                
                Spacer()
                
                NavigationLink(destination: LogView()) {
                    Text("See All")
                        .font(AppTypography.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(AppColors.primary)
                }
            }
            
            if viewModel.isLoading && viewModel.combinedSessions.isEmpty {
                LoadingCard()
            } else if viewModel.combinedSessions.isEmpty {
                EmptySessionsCard(onTap: { showSessionPicker = true })
            } else {
                VStack(spacing: AppSpacing.sm) {
                    ForEach(viewModel.combinedSessions.prefix(5)) { item in
                        RecentSessionCard(session: item)
                    }
                }
            }
        }
    }
}

// MARK: - Mini Stat Card
struct MiniStatCard: View {
    let value: String
    let label: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: AppSpacing.xs) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(color)
            
            Text(value)
                .font(AppTypography.statSmall)
                .foregroundColor(AppColors.textPrimary)
            
            Text(label)
                .font(AppTypography.caption2)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Loading Card
struct LoadingCard: View {
    var body: some View {
        VStack(spacing: AppSpacing.md) {
            ProgressView()
            Text("Loading sessions...")
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.xl)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.large)
    }
}

// MARK: - Empty Sessions Card
struct EmptySessionsCard: View {
    let onTap: () -> Void
    
    var body: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 40))
                .foregroundColor(AppColors.textTertiary)
            
            VStack(spacing: AppSpacing.xxs) {
                Text("No sessions yet")
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.textPrimary)
                
                Text("Start your first session with the button above")
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            Button(action: onTap) {
                Text("Start Session")
                    .font(AppTypography.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.primary)
                    .padding(.horizontal, AppSpacing.lg)
                    .padding(.vertical, AppSpacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: AppCornerRadius.full)
                            .stroke(AppColors.primary, lineWidth: 2)
                    )
            }
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.xl)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.large)
    }
}

// MARK: - Recent Session Card
struct RecentSessionCard: View {
    let session: CombinedSession
    
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(session.isHitting ? AppColors.primary.opacity(0.12) : AppColors.secondary.opacity(0.12))
                    .frame(width: 48, height: 48)
                
                Image(systemName: session.isHitting ? "baseball.fill" : "target")
                    .font(.system(size: 20))
                    .foregroundColor(session.isHitting ? AppColors.primary : AppColors.secondary)
            }
            
            // Details
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text(session.name)
                    .font(AppTypography.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(1)
                
                HStack(spacing: AppSpacing.xs) {
                    Text(session.typeLabel)
                        .font(AppTypography.caption)
                        .fontWeight(.medium)
                        .foregroundColor(session.isHitting ? AppColors.primary : AppColors.secondary)
                    
                    Text("•")
                        .foregroundColor(AppColors.textTertiary)
                    
                    Text(session.formattedDate)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            
            Spacer()
            
            // Primary stat
            VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                Text(session.primaryStat)
                    .font(AppTypography.headline)
                    .foregroundColor(session.isHitting ? AppColors.primary : AppColors.secondary)
                
                Text(session.secondaryStat)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

#Preview {
    DashboardView()
}

// MARK: - Helper Views

struct DrillCard: View {
    let drill: Drill
    
    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                Image(systemName: "figure.baseball")
                    .foregroundColor(AppColors.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(AppColors.textTertiary)
            }
            
            Text(drill.name)
                .font(AppTypography.callout)
                .fontWeight(.semibold)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
                .foregroundColor(AppColors.textPrimary)
            
            Text(drill.category.rawValue.capitalized)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .padding(AppSpacing.md)
        .frame(width: 140, height: 120)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

struct GoalStrip: View {
    let goal: PersonalGoal
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(goal.description)
                    .font(AppTypography.callout)
                    .fontWeight(.medium)
                    .foregroundColor(AppColors.textPrimary)
                
                Text("Target: \(goal.targetValue, format: .number) \(goal.metric)")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
            
            Spacer()
            
            CircularProgress(progress: 0.65) // Mock progress
                .frame(width: 32, height: 32)
        }
        .padding()
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
    }
}

struct CircularProgress: View {
    let progress: Double
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(AppColors.primary.opacity(0.2), lineWidth: 3)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(AppColors.primary, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}
