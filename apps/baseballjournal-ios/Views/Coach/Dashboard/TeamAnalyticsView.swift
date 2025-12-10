import SwiftUI

struct TeamAnalyticsView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: AppSpacing.xl) {
                Spacer()
                
                Image(systemName: "chart.xyaxis.line")
                    .font(.system(size: 64))
                    .foregroundColor(AppColors.textTertiary)
                
                Text("Team Analytics")
                    .font(AppTypography.title2)
                    .foregroundColor(AppColors.textPrimary)
                
                Text("Aggregate stats for your entire roster will appear here.")
                    .font(AppTypography.body)
                    .foregroundColor(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                Spacer()
            }
            .navigationTitle("Team Analytics")
            .background(AppColors.secondaryBackground.ignoresSafeArea())
        }
    }
}
