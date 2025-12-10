import SwiftUI

struct LogPitchingView: View {
    @Binding var session: PitchSession?
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var sessionManager = SessionManager.shared
    
    // Logging State
    @State private var intendedZone: ZoneId?
    @State private var actualZone: ZoneId?
    @State private var selectedPitchType: UUID? // ID of pitch type
    @State private var outcome: PitchOutcome = .ball
    
    // Helper to get available pitch types (Mocked for now, should come from User Profile/Repo)
    // For now we use static list or just basic ones
    let availableTypes: [PitchTypeModel] = [
        PitchTypeModel(id: UUID(), pitcherId: UUID(), name: "Fastball", code: "FB", colorHex: "#ff0000", isActive: true),
        PitchTypeModel(id: UUID(), pitcherId: UUID(), name: "Curveball", code: "CB", colorHex: "#00ff00", isActive: true),
        PitchTypeModel(id: UUID(), pitcherId: UUID(), name: "Slider", code: "SL", colorHex: "#0000ff", isActive: true),
        PitchTypeModel(id: UUID(), pitcherId: UUID(), name: "Changeup", code: "CH", colorHex: "#ffff00", isActive: true)
    ]
    
    var body: some View {
        NavigationStack {
            VStack(spacing: AppSpacing.md) {
                // Header (Count, Stats)
                headerSection
                
                Divider()
                
                ScrollView {
                    VStack(spacing: AppSpacing.lg) {
                        
                        // 1. Pitch Type Selection
                        pitchTypeSelection
                        
                        // 2. Zone Selection (Intended vs Actual)
                        HStack(spacing: AppSpacing.md) {
                            zoneSelector(title: "Intended", selection: $intendedZone)
                            zoneSelector(title: "Actual", selection: $actualZone)
                        }
                        
                        // 3. Outcome Selection
                        outcomeSelection
                        
                        // 4. Log Button
                        Button(action: logPitch) {
                            Text("Log Pitch")
                                .font(AppTypography.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(canLog ? AppColors.primary : Color.gray)
                                .cornerRadius(AppCornerRadius.medium)
                        }
                        .disabled(!canLog)
                    }
                    .padding()
                }
                
                // End Session Button
                Button("End Session") {
                     Task { try? await sessionManager.endCurrentSession() }
                }
                .buttonStyle(.borderedProminent)
                .tint(AppColors.secondary)
                .padding()
            }
            .navigationTitle("Pitching Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Dismiss") { dismiss() }
                }
            }
        }
    }
    
    var canLog: Bool {
        intendedZone != nil && actualZone != nil && selectedPitchType != nil
    }
    
    var headerSection: some View {
        HStack {
            VStack {
                Text("\(session?.totalPitches ?? 0)")
                    .font(AppTypography.title2)
                    .fontWeight(.bold)
                Text("Pitches")
                    .font(AppTypography.caption)
            }
            
            Spacer()
            
            VStack {
                Text("\(Int(session?.strikePercentage ?? 0))%")
                    .font(AppTypography.title2)
                    .fontWeight(.bold)
                Text("Strike %")
                    .font(AppTypography.caption)
            }
        }
        .padding(.horizontal)
    }
    
    var pitchTypeSelection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(availableTypes, id: \.id) { type in
                    Button(action: { selectedPitchType = type.id }) {
                        Text(type.name)
                            .padding(.vertical, 8)
                            .padding(.horizontal, 16)
                            .background(selectedPitchType == type.id ? AppColors.primary : AppColors.cardBackground)
                            .foregroundColor(selectedPitchType == type.id ? .white : AppColors.textPrimary)
                            .cornerRadius(20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(AppColors.primary, lineWidth: 1)
                            )
                    }
                }
            }
        }
    }
    
    func zoneSelector(title: String, selection: Binding<ZoneId?>) -> some View {
        VStack {
            Text(title)
                .font(AppTypography.caption)
            StrikeZoneGrid(onZoneSelected: { zone in
                selection.wrappedValue = zone
            }, selectedZone: selection.wrappedValue)
            .frame(width: 140, height: 160)
        }
    }
    
    var outcomeSelection: some View {
        VStack(alignment: .leading) {
            Text("Outcome")
                .font(AppTypography.caption)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]) {
                outcomeButton(.ball)
                outcomeButton(.calledStrike)
                outcomeButton(.swingingStrike)
                outcomeButton(.foul)
                outcomeButton(.inPlay)
                outcomeButton(.hbp)
            }
        }
    }
    
    func outcomeButton(_ type: PitchOutcome) -> some View {
        Button(action: { outcome = type }) {
            Text(type.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)
                .font(.caption)
                .padding(8)
                .frame(maxWidth: .infinity)
                .background(outcome == type ? AppColors.secondary : AppColors.cardBackground)
                .foregroundColor(outcome == type ? .white : AppColors.textPrimary)
                .cornerRadius(8)
        }
    }
    
    func logPitch() {
        guard let intended = intendedZone,
              let actual = actualZone,
              let pitchTypeId = selectedPitchType,
              var s = session else { return }
        
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        
        let record = PitchRecord(
            id: UUID(),
            sessionId: s.id,
            index: s.totalPitches + 1,
            batterSide: "R", // Default
            ballsBefore: 0,
            strikesBefore: 0,
            runnersOn: RunnersOn(),
            outs: 0,
            pitchTypeId: pitchTypeId,
            targetZone: intended,
            actualZone: actual,
            outcome: outcome,
            createdAt: Date()
        )
        
        if s.pitchRecords == nil {
            s.pitchRecords = []
        }
        s.pitchRecords?.append(record)
        s.totalPitches += 1
        
        sessionManager.updatePitchingSession(s)
        
        // Reset transient state for next pitch
        actualZone = nil
        // Keep intended? Maybe clear it too.
        intendedZone = nil
        // Keep pitch type? Usually pitcher throws same pitch or mixes. Keep it for convenience.
    }
}
