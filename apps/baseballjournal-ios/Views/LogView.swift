import SwiftUI

struct LogView: View {
    @StateObject private var viewModel = LogViewModel()
    @State private var filterType: FilterType = .all
    @State private var selectedHittingSession: Session?
    @State private var selectedPitchingSession: PitchSession?
    
    enum FilterType: String, CaseIterable {
        case all = "All"
        case hitting = "Hitting"
        case pitching = "Pitching"
        
        var icon: String {
            switch self {
            case .all: return "list.bullet"
            case .hitting: return "baseball.fill"
            case .pitching: return "target"
            }
        }
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter Pills
                filterRow
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.sm)
                    .background(AppColors.background)
                
                // Content
                if viewModel.isLoading && viewModel.allItems.isEmpty {
                    Spacer()
                    LoadingView(message: "Loading sessions...")
                    Spacer()
                } else if filteredItems.isEmpty {
                    Spacer()
                    emptyState
                    Spacer()
                } else {
                    sessionsList
                }
            }
            .background(AppColors.secondaryBackground.ignoresSafeArea())
            .navigationTitle("Log")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
            .sheet(item: $selectedHittingSession) { session in
                SessionDetailSheet(session: session)
            }
            .sheet(item: $selectedPitchingSession) { session in
                PitchSessionDetailSheet(session: session)
            }
        }
    }
    
    // MARK: - Filter Row
    private var filterRow: some View {
        HStack(spacing: AppSpacing.xs) {
            ForEach(FilterType.allCases, id: \.self) { type in
                FilterPill(
                    label: type.rawValue,
                    icon: type.icon,
                    isSelected: filterType == type,
                    color: pillColor(for: type)
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        filterType = type
                    }
                }
            }
            Spacer()
        }
    }
    
    private func pillColor(for type: FilterType) -> Color {
        switch type {
        case .all: return AppColors.primary
        case .hitting: return AppColors.primary
        case .pitching: return AppColors.secondary
        }
    }
    
    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: filterType == .hitting ? "baseball.fill" : filterType == .pitching ? "target" : "list.bullet.clipboard")
                .font(.system(size: 48))
                .foregroundColor(AppColors.textTertiary)
            
            Text(emptyTitle)
                .font(AppTypography.headline)
                .foregroundColor(AppColors.textPrimary)
            
            Text(emptySubtitle)
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(AppSpacing.xl)
    }
    
    private var emptyTitle: String {
        switch filterType {
        case .all: return "No sessions yet"
        case .hitting: return "No hitting sessions"
        case .pitching: return "No pitching sessions"
        }
    }
    
    private var emptySubtitle: String {
        "Sessions you log will appear here"
    }
    
    // MARK: - Sessions List
    private var sessionsList: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.sm) {
                ForEach(groupedByDate, id: \.key) { group in
                    Section {
                        ForEach(group.items) { item in
                            LogItemCard(item: item)
                                .onTapGesture {
                                    handleItemTap(item)
                                }
                        }
                    } header: {
                        HStack {
                            Text(group.key)
                                .font(AppTypography.caption)
                                .fontWeight(.bold)
                                .foregroundColor(AppColors.textTertiary)
                                .tracking(0.5)
                            Spacer()
                        }
                        .padding(.top, AppSpacing.sm)
                    }
                }
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.bottom, AppSpacing.xl)
        }
    }
    
    private func handleItemTap(_ item: LogItem) {
        if item.type == .hitting {
            if let session = viewModel.hittingSessions.first(where: { $0.id == item.id }) {
                selectedHittingSession = session
            }
        } else {
            if let session = viewModel.pitchingSessions.first(where: { $0.id == item.id }) {
                selectedPitchingSession = session
            }
        }
    }
    
    private var filteredItems: [LogItem] {
        switch filterType {
        case .all:
            return viewModel.allItems
        case .hitting:
            return viewModel.allItems.filter { $0.type == .hitting }
        case .pitching:
            return viewModel.allItems.filter { $0.type == .pitching }
        }
    }
    
    private var groupedByDate: [(key: String, items: [LogItem])] {
        let grouped = Dictionary(grouping: filteredItems) { item -> String in
            let formatter = DateFormatter()
            if Calendar.current.isDateInToday(item.date) {
                return "Today"
            } else if Calendar.current.isDateInYesterday(item.date) {
                return "Yesterday"
            } else if Calendar.current.isDate(item.date, equalTo: Date(), toGranularity: .weekOfYear) {
                formatter.dateFormat = "EEEE"
                return formatter.string(from: item.date)
            } else {
                formatter.dateFormat = "MMMM d"
                return formatter.string(from: item.date)
            }
        }
        
        return grouped.sorted { $0.value.first?.date ?? Date() > $1.value.first?.date ?? Date() }
            .map { (key: $0.key, items: $0.value.sorted { $0.date > $1.date }) }
    }
}

// MARK: - Filter Pill
struct FilterPill: View {
    let label: String
    let icon: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.xxs) {
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .semibold))
                
                Text(label)
                    .font(AppTypography.caption)
                    .fontWeight(.semibold)
            }
            .padding(.horizontal, AppSpacing.md)
            .padding(.vertical, AppSpacing.xs)
            .background(
                Capsule()
                    .fill(isSelected ? color : color.opacity(0.1))
            )
            .foregroundColor(isSelected ? .white : color)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Log Item Card
struct LogItemCard: View {
    let item: LogItem
    
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(item.type == .hitting ? AppColors.primary.opacity(0.12) : AppColors.secondary.opacity(0.12))
                    .frame(width: 44, height: 44)
                
                Image(systemName: item.type == .hitting ? "baseball.fill" : "target")
                    .font(.system(size: 18))
                    .foregroundColor(item.type == .hitting ? AppColors.primary : AppColors.secondary)
            }
            
            // Info
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text(item.name)
                    .font(AppTypography.callout)
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.textPrimary)
                    .lineLimit(1)
                
                HStack(spacing: AppSpacing.xs) {
                    Text(item.type.rawValue.capitalized)
                        .font(AppTypography.caption)
                        .fontWeight(.medium)
                        .foregroundColor(item.type == .hitting ? AppColors.primary : AppColors.secondary)
                    
                    Text("•")
                        .foregroundColor(AppColors.textTertiary)
                    
                    Text(formattedTime)
                        .font(AppTypography.caption)
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            
            Spacer()
            
            // Stats
            VStack(alignment: .trailing, spacing: AppSpacing.xxs) {
                Text(item.primaryStat)
                    .font(AppTypography.headline)
                    .foregroundColor(item.type == .hitting ? AppColors.primary : AppColors.secondary)
                
                Text(item.secondaryStat)
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
    
    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: item.date)
    }
}

// MARK: - Log ViewModel
@MainActor
class LogViewModel: ObservableObject {
    @Published var allItems: [LogItem] = []
    @Published var hittingSessions: [Session] = []
    @Published var pitchingSessions: [PitchSession] = []
    @Published var isLoading: Bool = false
    
    private let client = SupabaseClientProvider.shared.client
    
    func loadData() async {
        guard let userId = AuthService.shared.userId else { return }
        
        isLoading = true
        
        var items: [LogItem] = []
        
        // Load hitting sessions
        do {
            let sessions: [Session] = try await client
                .from("sessions")
                .select()
                .eq("player_id", value: userId.uuidString)
                .order("date", ascending: false)
                .execute()
                .value
            
            hittingSessions = sessions
            
            let hittingItems = sessions.map { session in
                LogItem(
                    id: session.id,
                    type: .hitting,
                    name: session.name,
                    date: session.date,
                    primaryStat: "\(Int(session.executionPercentage))%",
                    secondaryStat: "\(session.totalRepsAttempted) reps"
                )
            }
            items.append(contentsOf: hittingItems)
        } catch {
            print("Error loading hitting sessions: \(error)")
        }
        
        // Load pitching sessions
        do {
            let sessions: [PitchSession] = try await client
                .from("pitch_sessions")
                .select()
                .eq("pitcher_id", value: userId.uuidString)
                .order("date", ascending: false)
                .execute()
                .value
            
            pitchingSessions = sessions
            
            let pitchingItems = sessions.map { session in
                LogItem(
                    id: session.id,
                    type: .pitching,
                    name: session.sessionName,
                    date: session.date,
                    primaryStat: "\(Int(session.strikePercentage))%",
                    secondaryStat: "\(session.totalPitches) pitches"
                )
            }
            items.append(contentsOf: pitchingItems)
        } catch {
            print("Error loading pitch sessions: \(error)")
        }
        
        // Sort by date descending
        allItems = items.sorted { $0.date > $1.date }
        isLoading = false
    }
}

// MARK: - Log Item Model
struct LogItem: Identifiable {
    let id: UUID
    let type: SessionType
    let name: String
    let date: Date
    let primaryStat: String
    let secondaryStat: String
}

#Preview {
    LogView()
}
