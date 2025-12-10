import SwiftUI

struct LogHittingSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    var onSave: (() -> Void)?
    
    // Form state
    @State private var sessionName: String = "Tee Work"
    @State private var repsAttempted: Int = 25
    @State private var repsExecuted: Int = 20
    @State private var notes: String = ""
    @State private var grade: Int = 7
    
    @State private var isSaving: Bool = false
    @State private var showError: Bool = false
    @State private var errorMessage: String = ""
    @State private var showSuccess: Bool = false
    
    private let client = SupabaseClientProvider.shared.client
    
    private let sessionTypes = [
        ("Tee Work", "baseball.diamond.bases"),
        ("Soft Toss", "hand.raised"),
        ("Front Toss", "figure.baseball"),
        ("Live BP", "person.fill"),
        ("Machine", "gearshape.fill"),
        ("Throwing", "arrow.up.right")
    ]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Session Type
                    sessionTypeSection
                    
                    // Reps Section
                    repsSection
                    
                    // Grade Section
                    gradeSection
                    
                    // Notes Section
                    notesSection
                    
                    // Save Button
                    saveButton
                }
                .padding(AppSpacing.md)
                .padding(.bottom, AppSpacing.xl)
            }
            .background(AppColors.secondaryBackground.ignoresSafeArea())
            .navigationTitle("Log Hitting Session")
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
                ForEach(sessionTypes, id: \.0) { type in
                    SessionTypeButton(
                        name: type.0,
                        icon: type.1,
                        isSelected: sessionName == type.0
                    ) {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            sessionName = type.0
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Reps Section
    private var repsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Text("REPS")
                .font(AppTypography.caption)
                .fontWeight(.bold)
                .foregroundColor(AppColors.textTertiary)
                .tracking(0.5)
            
            VStack(spacing: AppSpacing.lg) {
                HStack(spacing: AppSpacing.xl) {
                    // Attempted
                    VStack(spacing: AppSpacing.sm) {
                        Text("Attempted")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                        
                        LargeStepperControl(value: $repsAttempted, range: 0...200, color: AppColors.textPrimary)
                    }
                    
                    // Executed
                    VStack(spacing: AppSpacing.sm) {
                        Text("Executed")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.textSecondary)
                        
                        LargeStepperControl(value: $repsExecuted, range: 0...repsAttempted, color: AppColors.primary)
                    }
                }
                
                // Execution % Display
                if repsAttempted > 0 {
                    executionDisplay
                }
            }
            .padding(AppSpacing.md)
            .background(AppColors.cardBackground)
            .cornerRadius(AppCornerRadius.large)
            .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        }
    }
    
    private var executionPercentage: Double {
        guard repsAttempted > 0 else { return 0 }
        return Double(repsExecuted) / Double(repsAttempted) * 100
    }
    
    private var executionDisplay: some View {
        VStack(spacing: AppSpacing.xs) {
            HStack {
                Text("Execution Rate")
                    .font(AppTypography.callout)
                    .foregroundColor(AppColors.textSecondary)
                
                Spacer()
                
                Text("\(Int(executionPercentage))%")
                    .font(AppTypography.title3)
                    .fontWeight(.bold)
                    .foregroundColor(executionColor)
            }
            
            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(executionColor.opacity(0.2))
                    
                    RoundedRectangle(cornerRadius: 6)
                        .fill(executionColor)
                        .frame(width: geo.size.width * min(executionPercentage / 100, 1.0))
                }
            }
            .frame(height: 10)
        }
    }
    
    private var executionColor: Color {
        if executionPercentage >= 80 { return AppColors.success }
        if executionPercentage >= 60 { return AppColors.warning }
        return AppColors.error
    }
    
    // MARK: - Grade Section
    private var gradeSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                Text("SESSION GRADE")
                    .font(AppTypography.caption)
                    .fontWeight(.bold)
                    .foregroundColor(AppColors.textTertiary)
                    .tracking(0.5)
                
                Spacer()
                
                Text("\(grade)/10")
                    .font(AppTypography.headline)
                    .foregroundColor(gradeColor)
            }
            
            VStack(spacing: AppSpacing.xs) {
                Slider(value: Binding(
                    get: { Double(grade) },
                    set: { grade = Int($0) }
                ), in: 1...10, step: 1)
                .tint(gradeColor)
                
                HStack {
                    Text("Rough")
                        .font(AppTypography.caption2)
                        .foregroundColor(AppColors.textTertiary)
                    Spacer()
                    Text("Great")
                        .font(AppTypography.caption2)
                        .foregroundColor(AppColors.textTertiary)
                }
            }
            .padding(AppSpacing.md)
            .background(AppColors.cardBackground)
            .cornerRadius(AppCornerRadius.large)
            .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        }
    }
    
    private var gradeColor: Color {
        if grade >= 8 { return AppColors.success }
        if grade >= 5 { return AppColors.warning }
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
            
            TextField("What did you focus on?", text: $notes, axis: .vertical)
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
                    .fill(isSaving || repsAttempted == 0 ? AppColors.primary.opacity(0.5) : AppColors.primary)
            )
            .shadow(color: AppColors.primary.opacity(0.3), radius: 8, x: 0, y: 4)
        }
        .disabled(isSaving || repsAttempted == 0)
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
        guard let userId = AuthService.shared.userId else {
            errorMessage = "Please sign in to save sessions"
            showError = true
            return
        }
        
        isSaving = true
        
        let set = SetResult(
            setNumber: 1,
            repsAttempted: repsAttempted,
            repsExecuted: repsExecuted
        )
        
        let insert = SessionInsert(
            playerId: userId,
            teamId: AuthService.shared.primaryTeamId,
            drillId: nil,
            name: sessionName,
            date: Date(),
            type: .hitting,
            sets: [set],
            feedback: nil,
            reflection: notes.isEmpty ? nil : notes
        )
        
        do {
            try await client
                .from("sessions")
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

// MARK: - Session Type Button
struct SessionTypeButton: View {
    let name: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: AppSpacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                
                Text(name)
                    .font(AppTypography.callout)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                    .fill(isSelected ? AppColors.primary : AppColors.cardBackground)
            )
            .foregroundColor(isSelected ? .white : AppColors.textPrimary)
            .overlay(
                RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                    .stroke(isSelected ? AppColors.primary : AppColors.primary.opacity(0.15), lineWidth: 1.5)
            )
            .shadow(color: isSelected ? AppColors.primary.opacity(0.2) : Color.clear, radius: 4, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Large Stepper Control
struct LargeStepperControl: View {
    @Binding var value: Int
    var range: ClosedRange<Int>
    var color: Color
    
    var body: some View {
        HStack(spacing: AppSpacing.md) {
            Button(action: {
                if value > range.lowerBound {
                    withAnimation(.easeInOut(duration: 0.1)) {
                        value -= 1
                    }
                }
            }) {
                Image(systemName: "minus.circle.fill")
                    .font(.system(size: 36))
                    .foregroundColor(value > range.lowerBound ? color : color.opacity(0.3))
            }
            .disabled(value <= range.lowerBound)
            
            Text("\(value)")
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundColor(color)
                .frame(minWidth: 60)
            
            Button(action: {
                if value < range.upperBound {
                    withAnimation(.easeInOut(duration: 0.1)) {
                        value += 1
                    }
                }
            }) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 36))
                    .foregroundColor(value < range.upperBound ? color : color.opacity(0.3))
            }
            .disabled(value >= range.upperBound)
        }
    }
}

#Preview {
    LogHittingSheet()
}
