import SwiftUI

struct CoachHomeView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Header
                    headerSection
                    
                    // Quick Actions (Manage Roster, Assign Drill, etc)
                    quickActionsSection
                    
                    // Team Stats Summary
                    teamStatsSection
                    
                    // Recent Team Activity
                    // (Reuse RecentActivity logic but for team_id?)
                    Text("Recent Team Activity Coming Soon")
                        .font(AppTypography.caption)
                        .padding()
                }
                .padding()
            }
            .navigationTitle("Coach Dashboard")
            .background(AppColors.secondaryBackground.ignoresSafeArea())
        }
    }
    
    var headerSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("Welcome, Coach")
                .font(AppTypography.title)
            Text("Manage your team and players")
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("QUICK ACTIONS")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
            
            HStack(spacing: AppSpacing.md) {
                QuickActionButton(icon: "person.3.fill", label: "Roster", color: AppColors.primary)
                QuickActionButton(icon: "list.clipboard.fill", label: "Plans", color: AppColors.secondary)
                QuickActionButton(icon: "calendar", label: "Schedule", color: AppColors.success)
            }
        }
    }
    
    var teamStatsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("TEAM OVERVIEW")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
            
            HStack(spacing: AppSpacing.md) {
                StatBox(title: "Active Players", value: "12") // Mock
                StatBox(title: "This Week", value: "45 Sessions") // Mock
            }
        }
    }
}

struct QuickActionButton: View {
    let icon: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: AppSpacing.sm) {
            Circle()
                .fill(color.opacity(0.1))
                .frame(width: 50, height: 50)
                .overlay(
                    Image(systemName: icon)
                        .foregroundColor(color)
                        .font(.system(size: 20))
                )
            
            Text(label)
                .font(AppTypography.caption)
                .fontWeight(.medium)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}
