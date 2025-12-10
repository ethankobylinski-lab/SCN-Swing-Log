import SwiftUI

struct LogPitchingSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    var onSave: (() -> Void)?
    
    // Form state
    @State private var sessionType: PitchSessionType = .command
    @State private var totalPitches: Int = 30
    @State private var strikes: Int = 20
    @State private var notes: String = ""
    
    @State private var isSaving: Bool = false
    @State private var showError: Bool = false
    @State private var errorMessage: String = ""
    @State private var showSuccess: Bool = false
    
    private let client = SupabaseClientProvider.shared.client
    
    private var strikePercentage: Double {
        guard totalPitches > 0 else { return 0 }
        return Double(strikes) / Double(totalPitches) * 100
    }
    
    private var generatedSessionName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let dateStr = formatter.string(from: Date())
        return "\(sessionType.displayName) - \(dateStr)"
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Session Type
                    sessionTypeSection
                    
                    // Pitch Count
                    pitchCountSection
                    
                    // Notes Section
                    notesSection
                    
                    // Save Button
                    saveButton
                }
                .padding(AppSpacing.md)
                .padding(.bottom, AppSpacing.xl)
            }
            .background(AppColors.secondaryBackground.ignoresSafeArea())
            .navigationTitle("Log Pitching Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(AppColors.textSecondary)
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") {}
            } message: {
                Text(errorMessage)
            }
            .overlay {
                if showSuccess {
                    successOverlay
                }
            }
        }
    }
    
    // MARK: - Session Type Section
    private var sessionTypeSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("SESSION TYPE")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppSpacing.sm) {
                ForEach(PitchSessionType.allCases, id: \.self) { type in
                    PitchTypeButton(
                        type: type,
                        isSelected: sessionType == type
                    ) {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            sessionType = type
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Pitch Count Section
    private var pitchCountSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Text("PITCH COUNT")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            VStack(spacing: AppSpacing.lg) {
                HStack(spacing: AppSpacing.xl) {
                    // Total
                    VStack(spacing: AppSpacing.sm) {
                        Text("Total Pitches")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                        
                        LargeStepperControl(value: $totalPitches, range: 0...200, color: AppColors.textPrimary)
                    }
                    
                    // Strikes
                    VStack(spacing: AppSpacing.sm) {
                        Text("Strikes")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                        
                        LargeStepperControl(value: $strikes, range: 0...totalPitches, color: AppColors.secondary)
                    }
                }
                
                // Strike % Display
                if totalPitches > 0 {
                    strikeDisplay
                }
            }
            .padding(AppSpacing.md)
            .background(AppColors.cardBackground)
            .cornerRadius(AppCornerRadius.large)
            .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        }
    }
    
    private var strikeDisplay: some View {
        VStack(spacing: AppSpacing.xs) {
            HStack {
                Text("Strike Rate")
                    .font(AppTypography.callout)
                    .foregroundColor(AppColors.textSecondary)
                
                Spacer()
                
                Text("\(Int(strikePercentage))%")
                    .font(AppTypography.title3)
                    .fontWeight(.bold)
                    .foregroundColor(strikeColor)
            }
            
            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(strikeColor.opacity(0.2))
                    
                    RoundedRectangle(cornerRadius: 6)
                        .fill(strikeColor)
                        .frame(width: geo.size.width * min(strikePercentage / 100, 1.0))
                }
            }
            .frame(height: 10)
            
            // Target indicator
            HStack {
                Image(systemName: strikePercentage >= 60 ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 12))
                    .foregroundColor(strikePercentage >= 60 ? AppColors.success : AppColors.textTertiary)
                
                Text("60% target")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
                
                Spacer()
            }
            .padding(.top, AppSpacing.xxs)
        }
    }
    
    private var strikeColor: Color {
        if strikePercentage >= 65 { return AppColors.success }
        if strikePercentage >= 50 { return AppColors.warning }
        return AppColors.error
    }
    
    // MARK: - Notes Section
    private var notesSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("NOTES (OPTIONAL)")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            TextField("How did it feel?", text: $notes, axis: .vertical)
                .font(AppTypography.body)
                .padding(AppSpacing.md)
                .background(AppColors.cardBackground)
                .cornerRadius(AppCornerRadius.medium)
                .lineLimit(3...6)
                .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        }
    }
    
    // MARK: - Save Button
    private var saveButton: some View {
        Button(action: { Task { await saveSession() } }) {
            HStack {
                if isSaving {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                    
                    Text("Save Session")
                        .font(AppTypography.headline)
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(AppSpacing.lg)
            .background(
                RoundedRectangle(cornerRadius: AppCornerRadius.large)
                    .fill(isSaving || totalPitches == 0 ? AppColors.secondary.opacity(0.5) : AppColors.secondary)
            )
            .shadow(color: AppColors.secondary.opacity(0.3), radius: 8, x: 0, y: 4)
        }
        .disabled(isSaving || totalPitches == 0)
        .padding(.top, AppSpacing.sm)
    }
    
    // MARK: - Success Overlay
    private var successOverlay: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
            
            VStack(spacing: AppSpacing.lg) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 64))
                    .foregroundColor(AppColors.success)
                
                Text("Session Saved!")
                    .font(AppTypography.title2)
                    .foregroundColor(.white)
            }
            .padding(AppSpacing.xxl)
            .background(
                RoundedRectangle(cornerRadius: AppCornerRadius.xl)
                    .fill(AppColors.cardBackground)
            )
        }
        .transition(.opacity)
    }
    
    // MARK: - Save
    private func saveSession() async {
        guard let userId = AuthService.shared.userId,
              let teamId = AuthService.shared.primaryTeamId else {
            errorMessage = "Please sign in and join a team to save sessions"
            showError = true
            return
        }
        
        isSaving = true
        
        let insert = PitchSessionInsert(
            pitcherId: userId,
            teamId: teamId,
            catcherId: nil,
            date: Date(),
            sessionName: generatedSessionName,
            sessionType: sessionType,
            status: .completed,
            gameSituationEnabled: false,
            pitchGoals: [],
            totalPitches: totalPitches,
            sessionStartTime: Date()
        )
        
        do {
            try await client
                .from("pitch_sessions")
                .insert(insert)
                .execute()
            
            withAnimation {
                showSuccess = true
            }
            
            try? await Task.sleep(nanoseconds: 800_000_000) // 0.8s
            
            onSave?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
        
        isSaving = false
    }
}

// MARK: - Pitch Type Button
struct PitchTypeButton: View {
    let type: PitchSessionType
    let isSelected: Bool
    let action: () -> Void
    
    private var icon: String {
        switch type {
        case .command: return "target"
        case .velo: return "gauge.high"
        case .mix: return "shuffle"
        case .recovery: return "heart.fill"
        case .flat: return "arrow.up.forward"
        case .live: return "person.fill"
        }
    }
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                
                Text(type.displayName)
                    .font(AppTypography.callout)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                    .fill(isSelected ? AppColors.secondary : AppColors.cardBackground)
            )
            .foregroundColor(isSelected ? .white : AppColors.textPrimary)
            .overlay(
                RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                    .stroke(isSelected ? AppColors.secondary : AppColors.secondary.opacity(0.15), lineWidth: 1.5)
            )
            .shadow(color: isSelected ? AppColors.secondary.opacity(0.2) : Color.clear, radius: 4, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    LogPitchingSheet()
}
