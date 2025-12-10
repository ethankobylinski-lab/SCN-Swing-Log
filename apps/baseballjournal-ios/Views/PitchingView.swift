import SwiftUI

struct PitchingView: View {
    @StateObject private var viewModel = PitchingViewModel()
    @State private var showLogSheet = false
    @State private var selectedSession: PitchSession?
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Primary CTA
                    logSessionButton
                    
                    // Active Goals
                    if !viewModel.goals.isEmpty {
                        goalsSection
                    }
                    
                    // Session History
                    sessionsSection
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.bottom, AppSpacing.xl)
            }
            .background(AppColors.secondaryBackground.ignoresSafeArea())
            .navigationTitle("Pitching")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
            .sheet(isPresented: $showLogSheet) {
                LogPitchingSheet {
                    Task { await viewModel.loadData() }
                }
            }
            .sheet(item: $selectedSession) { session in
                PitchSessionDetailSheet(session: session)
            }
        }
    }
    
    // MARK: - Log Session Button
    private var logSessionButton: some View {
        Button(action: { showLogSheet = true }) {
            HStack {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 22))
                
                Text("Log Pitching Session")
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
                    colors: [AppColors.secondary, AppColors.secondaryLight],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(AppCornerRadius.large)
            .shadow(color: AppColors.secondary.opacity(0.3), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .padding(.top, AppSpacing.sm)
    }
    
    // MARK: - Goals Section
    private var goalsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("ACTIVE GOALS")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            ForEach(viewModel.goals) { goal in
                PitchingGoalCard(goal: goal)
            }
        }
    }
    
    // MARK: - Sessions Section
    private var sessionsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("SESSION HISTORY")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            if viewModel.isLoading && viewModel.sessions.isEmpty {
                LoadingCard()
            } else if viewModel.sessions.isEmpty {
                EmptyStateCard(
                    icon: "target",
                    title: "No pitching sessions yet",
                    subtitle: "Tap the button above to log your first session",
                    action: { showLogSheet = true },
                    actionLabel: "Log Session"
                )
            } else {
                LazyVStack(spacing: AppSpacing.sm) {
                    ForEach(viewModel.sessions) { session in
                        PitchingSessionCard(session: session)
                            .onTapGesture {
                                selectedSession = session
                            }
                    }
                }
            }
        }
    }
}

// MARK: - Pitching Goal Card
struct PitchingGoalCard: View {
    let goal: PersonalGoal
    @State private var progress: Double = 0
    
    private var daysRemaining: Int {
        let remaining = Calendar.current.dateComponents([.day], from: Date(), to: goal.targetDate).day ?? 0
        return max(0, remaining)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(goal.metric.rawValue)
                        .font(AppTypography.callout)
                        .fontWeight(.semibold)
                        .foregroundColor(AppColors.textPrimary)
                    
                    Text("Target: \(Int(goal.targetValue))%")
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(daysRemaining)")
                        .font(AppTypography.headline)
                        .foregroundColor(daysRemaining < 7 ? AppColors.warning : AppColors.textPrimary)
                    
                    Text("days left")
                        .font(AppTypography.caption2)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            
            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppColors.secondary.opacity(0.15))
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppColors.secondary)
                        .frame(width: geo.size.width * min(progress, 1.0))
                }
            }
            .frame(height: 6)
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) {
                progress = 0.45 // Placeholder
            }
        }
    }
}

// MARK: - Pitching Session Card
struct PitchingSessionCard: View {
    let session: PitchSession
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter.string(from: session.date)
    }
    
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(AppColors.secondary.opacity(0.12))
                    .frame(width: 48, height: 48)
                
                Image(systemName: "target")
                    .font(.system(size: 20))
                    .foregroundColor(AppColors.secondary)
            }
            
            // Info
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text(session.sessionName)
                    .font(AppTypography.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(1)
                
                HStack(spacing: AppSpacing.xs) {
                    Text(session.sessionType.displayName)
                        .font(AppTypography.caption)
                        .fontWeight(.medium)
                        .foregroundColor(AppColors.secondary)
                    
                    Text("•")
                        .foregroundColor(AppColors.textTertiary)
                    
                    Text(formattedDate)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            
            Spacer()
            
            // Stats
            VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                Text("\(Int(session.strikePercentage))%")
                    .font(AppTypography.headline)
                    .foregroundColor(strikeColor)
                
                Text("\(session.totalPitches) pitches")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
            
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(AppColors.textTertiary)
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
    
    private var strikeColor: Color {
        if session.strikePercentage >= 65 { return AppColors.success }
        if session.strikePercentage >= 50 { return AppColors.warning }
        return AppColors.error
    }
}

// MARK: - Pitch Session Detail Sheet
struct PitchSessionDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    let session: PitchSession
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        formatter.timeStyle = .short
        return formatter.string(from: session.date)
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Header Stats
                    HStack(spacing: AppSpacing.lg) {
                        StatBubble(
                            value: "\(Int(session.strikePercentage))%",
                            label: "Strike %",
                            color: AppColors.secondary
                        )
                        
                        StatBubble(
                            value: "\(session.strikeCount)",
                            label: "Strikes",
                            color: AppColors.success
                        )
                        
                        StatBubble(
                            value: "\(session.totalPitches)",
                            label: "Total",
                            color: AppColors.textSecondary
                        )
                    }
                    
                    // Details
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        DetailRow(label: "Session Type", value: session.sessionType.displayName)
                        Divider()
                        DetailRow(label: "Date", value: formattedDate)
                        Divider()
                        DetailRow(label: "Status", value: session.status.rawValue.capitalized)
                    }
                    .padding(AppSpacing.md)
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppCornerRadius.large)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.secondaryBackground.ignoresSafeArea())
            .navigationTitle(session.sessionName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    PitchingView()
}
