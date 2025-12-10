import SwiftUI

struct HistoryView: View {
    @StateObject private var viewModel = HistoryViewModel()
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
                    ProgressView("Loading sessions...")
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
            .navigationTitle("History")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
            // Sheets for details (to be implemented/verified)
            /*
            .sheet(item: $selectedHittingSession) { session in
                SessionDetailSheet(session: session)
            }
            .sheet(item: $selectedPitchingSession) { session in
                PitchSessionDetailSheet(session: session)
            }
            */
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

// MARK: - History ViewModel
@MainActor
class HistoryViewModel: ObservableObject {
    @Published var allItems: [LogItem] = []
    @Published var hittingSessions: [Session] = []
    @Published var pitchingSessions: [PitchSession] = []
    @Published var isLoading: Bool = false
    
    private let dataService = DataService.shared
    private let userId = AuthService.shared.userId
    
    func loadData() async {
        guard let userId = userId else { return }
        
        isLoading = true
        var items: [LogItem] = []
        
        do {
            async let hitting = dataService.fetchHittingSessions(userId: userId)
            async let pitching = dataService.fetchPitchingSessions(userId: userId)
            
            let (hittingData, pitchingData) = try await (hitting, pitching)
            
            hittingSessions = hittingData
            pitchingSessions = pitchingData
            
            let hittingItems = hittingData.map { session in
                LogItem(
                    id: session.id,
                    type: .hitting,
                    name: session.name,
                    date: session.date,
                    primaryStat: "\(Int(session.executionPercentage))%",
                    secondaryStat: "\(session.totalRepsAttempted) reps"
                )
            }
            
            let pitchingItems = pitchingData.map { session in
                LogItem(
                    id: session.id,
                    type: .pitching,
                    name: session.sessionName,
                    date: session.date,
                    primaryStat: "\(Int(session.strikePercentage))%",
                    secondaryStat: "\(session.totalPitches) pitches"
                )
            }
            
            items.append(contentsOf: hittingItems)
            items.append(contentsOf: pitchingItems)
            
            allItems = items.sorted { $0.date > $1.date }
        } catch {
            print("Error loading history: \(error)")
        }
        
        isLoading = false
    }
}
