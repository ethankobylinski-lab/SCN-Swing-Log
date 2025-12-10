import SwiftUI

struct HittingView: View {
    @StateObject private var viewModel = HittingViewModel()
    @State private var showLogSheet = false
    @State private var selectedSession: Session?
    
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
            .navigationTitle("Hitting")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
            .sheet(isPresented: $showLogSheet) {
                LogHittingSheet {
                    Task { await viewModel.loadData() }
                }
            }
            .sheet(item: $selectedSession) { session in
                SessionDetailSheet(session: session)
            }
        }
    }
    
    // MARK: - Log Session Button
    private var logSessionButton: some View {
        Button(action: { showLogSheet = true }) {
            HStack {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 22))
                
                Text("Log Hitting Session")
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
                HittingGoalCard(goal: goal)
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
                    icon: "baseball.fill",
                    title: "No hitting sessions yet",
                    subtitle: "Tap the button above to log your first session",
                    action: { showLogSheet = true },
                    actionLabel: "Log Session"
                )
            } else {
                LazyVStack(spacing: AppSpacing.sm) {
                    ForEach(viewModel.sessions) { session in
                        HittingSessionCard(session: session)
                            .onTapGesture {
                                selectedSession = session
                            }
                    }
                }
            }
        }
    }
}

// MARK: - Hitting Goal Card
struct HittingGoalCard: View {
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
                        .fill(AppColors.primary.opacity(0.15))
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppColors.primary)
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
            // Animate progress on appear
            withAnimation(.easeOut(duration: 0.6)) {
                progress = 0.65 // Placeholder - would calculate from actual data
            }
        }
    }
}

// MARK: - Hitting Session Card
struct HittingSessionCard: View {
    let session: Session
    
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
                    .fill(AppColors.primary.opacity(0.12))
                    .frame(width: 48, height: 48)
                
                Image(systemName: "baseball.fill")
                    .font(.system(size: 20))
                    .foregroundColor(AppColors.primary)
            }
            
            // Info
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text(session.name)
                    .font(AppTypography.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(1)
                
                Text(formattedDate)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
            
            Spacer()
            
            // Stats
            VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                Text("\(Int(session.executionPercentage))%")
                    .font(AppTypography.headline)
                    .foregroundColor(executionColor)
                
                Text("\(session.totalRepsAttempted) reps")
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
    
    private var executionColor: Color {
        if session.executionPercentage >= 80 { return AppColors.success }
        if session.executionPercentage >= 60 { return AppColors.warning }
        return AppColors.error
    }
}

// MARK: - Empty State Card
struct EmptyStateCard: View {
    let icon: String
    let title: String
    let subtitle: String
    var action: (() -> Void)? = nil
    var actionLabel: String? = nil
    
    var body: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundColor(AppColors.textTertiary)
            
            VStack(spacing: AppSpacing.xxs) {
                Text(title)
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.textPrimary)
                
                Text(subtitle)
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            if let action = action, let label = actionLabel {
                Button(action: action) {
                    Text(label)
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
        }
        .frame(maxWidth: .infinity)
        .padding(AppSpacing.xl)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.large)
    }
}

// MARK: - Session Detail Sheet
struct SessionDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    let session: Session
    
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
                            value: "\(Int(session.executionPercentage))%",
                            label: "Execution",
                            color: AppColors.primary
                        )
                        
                        StatBubble(
                            value: "\(session.totalRepsExecuted)",
                            label: "Executed",
                            color: AppColors.success
                        )
                        
                        StatBubble(
                            value: "\(session.totalRepsAttempted)",
                            label: "Attempted",
                            color: AppColors.textSecondary
                        )
                    }
                    
                    // Details
                    VStack(alignment: .leading, spacing: AppSpacing.md) {
                        DetailRow(label: "Session Type", value: session.name)
                        Divider()
                        DetailRow(label: "Date", value: formattedDate)
                        
                        if let reflection = session.reflection, !reflection.isEmpty {
                            Divider()
                            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                                Text("Notes")
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.textSecondary)
                                
                                Text(reflection)
                                    .font(AppTypography.body)
                                    .foregroundColor(AppColors.textPrimary)
                            }
                        }
                    }
                    .padding(AppSpacing.md)
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppCornerRadius.large)
                }
                .padding(AppSpacing.md)
            }
            .background(AppColors.secondaryBackground.ignoresSafeArea())
            .navigationTitle(session.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Stat Bubble
struct StatBubble: View {
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: AppSpacing.xs) {
            Text(value)
                .font(AppTypography.statSmall)
                .foregroundColor(color)
            
            Text(label)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, AppSpacing.md)
        .background(color.opacity(0.1))
        .cornerRadius(AppCornerRadius.medium)
    }
}

// MARK: - Detail Row
struct DetailRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(AppTypography.callout)
                .foregroundColor(AppColors.textSecondary)
            
            Spacer()
            
            Text(value)
                .font(AppTypography.callout)
                .fontWeight(.medium)
                .foregroundColor(AppColors.textPrimary)
        }
    }
}

#Preview {
    HittingView()
}
