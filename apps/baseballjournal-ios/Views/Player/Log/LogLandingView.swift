import SwiftUI

struct LogLandingView: View {
    @StateObject private var sessionManager = SessionManager.shared
    @State private var showStartSheet = false
    @State private var showResumeAlert = false
    @State private var startType: SessionType = .hitting
    
    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.secondaryBackground.ignoresSafeArea()
                
                VStack(spacing: AppSpacing.xl) {
                    Spacer()
                    
                    // Main CTA
                    VStack(spacing: AppSpacing.md) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(AppColors.primary)
                            .shadow(color: AppColors.primary.opacity(0.3), radius: 10, x: 0, y: 4)
                        
                        Text("Start Session")
                            .font(AppTypography.title1)
                            .foregroundColor(AppColors.textPrimary)
                        
                        Text("Track your practice and progress")
                            .font(AppTypography.body)
                            .foregroundColor(AppColors.textSecondary)
                    }
                    .onTapGesture {
                        showStartSheet = true
                    }
                    
                    Spacer()
                    
                    // Resume Card if active
                    if sessionManager.isSessionActive {
                        resumeCard
                            .padding(.horizontal, AppSpacing.lg)
                            .padding(.bottom, AppSpacing.xl)
                    }
                }
            }
            .navigationTitle("Log")
            .sheet(isPresented: $showStartSheet) {
                StartSessionSheet()
                    .presentationDetents([.medium])
            }
            .onAppear {
                if sessionManager.isSessionActive {
                    // Maybe just show the card, or auto-prompt?
                    // User requirement says: "On app background / kill... On next launch... Show a clear prompt"
                    // But here we are in the Log tab.
                    // Let's just show the card for now.
                }
            }
            .fullScreenCover(item: $sessionManager.currentHittingSession) { session in
                // Navigate to Hitting Session View
                LogHittingView(session: $sessionManager.currentHittingSession)
            }
            .fullScreenCover(item: $sessionManager.currentPitchingSession) { session in
                // Navigate to Pitching Session View
                LogPitchingView(session: $sessionManager.currentPitchingSession)
            }
        }
    }
    
    var resumeCard: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack {
                Text("Session In Progress")
                    .font(AppTypography.headline)
                    .foregroundColor(AppColors.textPrimary)
                
                Spacer()
                
                PulseIndicator()
            }
            
            Text(sessionDescription)
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.textSecondary)
            
            HStack(spacing: AppSpacing.md) {
                Button(action: {
                    // Trigger full screen cover via state binding
                    // The binding is item: $sessionManager... so it should auto trigger if present?
                    // Actually, fullScreenCover monitors changes. If it's already non-nil, we might need a way to re-trigger or it persists.
                    // SwiftUI `item` binding covers usually stay up as long as it is non-nil.
                    // So if we dismissed it previously, we need to re-show.
                }) {
                    Text("Resume")
                        .font(AppTypography.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 16)
                        .background(Capsule().fill(AppColors.primary))
                }
                
                Button(action: {
                    sessionManager.discardSession()
                }) {
                    Text("Discard")
                        .font(AppTypography.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(AppColors.error)
                }
            }
            .padding(.top, AppSpacing.xs)
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    var sessionDescription: String {
        if let _ = sessionManager.currentHittingSession {
            return "Hitting Session"
        } else if let _ = sessionManager.currentPitchingSession {
            return "Pitching Session"
        }
        return "Unknown Session"
    }
}

// MARK: - Start Session Sheet
struct StartSessionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedType: SessionType = .hitting
    @ObservedObject var sessionManager = SessionManager.shared
    
    var body: some View {
        VStack(spacing: AppSpacing.lg) {
            Text("Start New Session")
                .font(AppTypography.title2)
                .padding(.top, AppSpacing.lg)
            
            HStack(spacing: AppSpacing.lg) {
                // Hitting
                Button(action: { startSession(.hitting) }) {
                    VStack(spacing: AppSpacing.sm) {
                        Image(systemName: "baseball.fill")
                            .font(.system(size: 40))
                        Text("Hitting")
                            .font(AppTypography.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(AppSpacing.xl)
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppCornerRadius.medium)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                            .stroke(AppColors.primary.opacity(0.3), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
                
                // Pitching
                Button(action: { startSession(.pitching) }) {
                    VStack(spacing: AppSpacing.sm) {
                        Image(systemName: "target")
                            .font(.system(size: 40))
                        Text("Pitching")
                            .font(AppTypography.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(AppSpacing.xl)
                    .background(AppColors.cardBackground)
                    .cornerRadius(AppCornerRadius.medium)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                            .stroke(AppColors.secondary.opacity(0.3), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, AppSpacing.lg)
            
            Spacer()
        }
        .background(AppColors.secondaryBackground.ignoresSafeArea())
    }
    
    private func startSession(_ type: SessionType) {
        // Need to get current user to start session
        guard let user = AuthService.shared.currentUser else { return }
        
        if type == .hitting {
            sessionManager.startHittingSession(player: user)
        } else {
            // Need teamId for pitching session
            guard let teamId = user.primaryTeamId else {
                // Handle no team case
                print("No team ID")
                return
            }
            sessionManager.startPitchingSession(player: user, teamId: teamId, type: .flat) // Default type
            // Ideally we show a picker for PitchSessionType first
        }
        dismiss()
    }
}

struct PulseIndicator: View {
    @State private var animate = false
    
    var body: some View {
        Circle()
            .fill(AppColors.success)
            .frame(width: 10, height: 10)
            .scaleEffect(animate ? 1.2 : 1.0)
            .opacity(animate ? 0.5 : 1.0)
            .onAppear {
                withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                    animate = true
                }
            }
    }
}
