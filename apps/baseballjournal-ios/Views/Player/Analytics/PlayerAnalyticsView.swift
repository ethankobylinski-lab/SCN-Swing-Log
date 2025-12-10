import SwiftUI
import Charts

struct PlayerAnalyticsView: View {
    @StateObject private var viewModel = AnalyticsViewModel()
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Segmented Control
                    Picker("Analyitcs Type", selection: $viewModel.selectedTab) {
                        ForEach(AnalyticsViewModel.AnalyticsTab.allCases) { tab in
                            Text(tab.rawValue).tag(tab)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    
                    // Content
                    if viewModel.isLoading {
                        ProgressView().padding(.top, 50)
                    } else {
                        switch viewModel.selectedTab {
                        case .hitting:
                            hittingContent
                        case .pitching:
                            pitchingContent
                        case .summary:
                            summaryContent
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Analytics")
            .background(AppColors.secondaryBackground.ignoresSafeArea())
            .task {
                await viewModel.loadData()
            }
            .refreshable {
                await viewModel.loadData()
            }
        }
    }
    
    // MARK: - Hitting Content
    var hittingContent: some View {
        VStack(spacing: AppSpacing.lg) {
            // General Stats
            HStack(spacing: AppSpacing.md) {
                StatBox(title: "Total Swings", value: "\(viewModel.totalSwings)")
                StatBox(title: "Execution %", value: String(format: "%.0f%%", viewModel.executionRate * 100))
            }
            .padding(.horizontal)
            
            // Heatmap Card
            VStack(alignment: .leading) {
                Text("CONTACT HEATMAP (Simulated)")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
                    .padding(.horizontal)
                
                // Since we don't have real granular data for hitting in this version
                // we show a placeholder explanation
                Text("Granular hitting location data requires connected hardware or manual charting. Current logging tracks execution only.")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                    .padding(.horizontal)
                    .multilineTextAlignment(.center)
            }
        }
    }
    
    // MARK: - Pitching Content
    var pitchingContent: some View {
        VStack(spacing: AppSpacing.lg) {
            // General Stats
            HStack(spacing: AppSpacing.md) {
                StatBox(title: "Total Pitches", value: "\(viewModel.totalPitches)")
                StatBox(title: "Strike %", value: String(format: "%.0f%%", viewModel.strikeRate * 100))
            }
            .padding(.horizontal)
            
            // Heatmap
            VStack(alignment: .leading) {
                Text("PITCH LOCATION HEATMAP")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
                    .padding(.horizontal)
                
                HeatmapGrid(zoneCounts: viewModel.pitchingZoneCounts, total: viewModel.totalPitches)
                    .frame(height: 300)
                    .padding()
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppCornerRadius.medium)
                    .padding(.horizontal)
            }
        }
    }
    
    // MARK: - Summary Content
    var summaryContent: some View {
        VStack(spacing: AppSpacing.lg) {
            Text("Training Overview")
                .font(AppTypography.headline)
            
            // Pie chart or bar chart of session split could go here
            // For now, text summary
            
            HStack {
                VStack {
                    Text("\(viewModel.totalSwings)")
                        .font(AppTypography.title)
                    Text("Swings")
                        .font(AppTypography.caption)
                }
                .frame(maxWidth: .infinity)
                Divider()
                VStack {
                    Text("\(viewModel.totalPitches)")
                        .font(AppTypography.title)
                    Text("Pitches")
                        .font(AppTypography.caption)
                }
                .frame(maxWidth: .infinity)
            }
            .padding()
            .background(AppColors.cardBackground)
            .cornerRadius(AppCornerRadius.medium)
            .padding(.horizontal)
        }
    }
}

// MARK: - Components

struct StatBox: View {
    let title: String
    let value: String
    
    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(AppTypography.caption)
                .foregroundColor(AppColors.textSecondary)
            Text(value)
                .font(AppTypography.title2)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textPrimary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

struct HeatmapGrid: View {
    let zoneCounts: [ZoneId: Int]
    let total: Int
    
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width / 3
            let h = geo.size.height / 3
            
            VStack(spacing: 2) {
                ForEach(0..<3) { row in
                    HStack(spacing: 2) {
                        ForEach(0..<3) { col in
                            let id = zoneId(row: row, col: col)
                            let count = zoneCounts[id] ?? 0
                            let pct = total > 0 ? Double(count) / Double(total) : 0
                            
                            ZStack {
                                Rectangle()
                                    .fill(heatmapColor(pct))
                                
                                if count > 0 {
                                    VStack(spacing: 2) {
                                        Text("\(Int(pct * 100))%")
                                            .font(.caption2)
                                            .fontWeight(.bold)
                                            .foregroundColor(.white)
                                            .shadow(color: .black.opacity(0.5), radius: 1)
                                        Text("(\(count))")
                                            .font(.system(size: 8))
                                            .foregroundColor(.white.opacity(0.8))
                                    }
                                }
                            }
                            .frame(width: w, height: h)
                        }
                    }
                }
            }
        }
        .background(Color.black) // Edges
    }
    
    func zoneId(row: Int, col: Int) -> ZoneId {
        // Reuse logic from StrikeZoneGrid or shared helper
        switch (row, col) {
        case (0, 0): return .z11
        case (0, 1): return .z12
        case (0, 2): return .z13
        case (1, 0): return .z21
        case (1, 1): return .z22
        case (1, 2): return .z23
        case (2, 0): return .z31
        case (2, 1): return .z32
        case (2, 2): return .z33
        default: return .z22
        }
    }
    
    func heatmapColor(_ pct: Double) -> Color {
        // Simple scale: Blue (low) -> Red (high)
        if pct == 0 { return Color.gray.opacity(0.2) }
        return Color.red.opacity(0.3 + (pct * 0.7))
    }
}
