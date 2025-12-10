import SwiftUI

struct LogHittingView: View {
    @Binding var session: Session? // Binding into SessionManager
    @Environment(\.dismiss) private var dismiss
    
    // Local state for the current REP being logged
    @State private var selectedZone: ZoneId?
    @State private var pitchType: PitchType = .fastball
    @State private var outcome: String = "Effective" // Simplified outcome for hitting? 
    // Wait, requirement says: "pitch type, intent, result, intended location, actual location"
    // Hitting Log Logic in Web:
    // It usually tracks: Pitch Type, Location (Zone), Outcome (Hard Hit, Take, Whiff, etc).
    // Let's use `SetResult` structure or similar.
    // Actually, `SetResult` has `repsExecuted`, `hardHits`. It seems it aggregates reps.
    // BUT the requirement says "Each rep: Update in-memory... Haptic on each rep".
    // This implies we are logging one rep at a time, or incrementing counters.
    // "UI tuned for phone: Big tap targets... Strike zone grid".
    
    // Let's assume we are logging detailed reps if we use the grid.
    // However, `SetResult` model aggregates.
    // If the Web App aggregates, then maybe we just tap "Good Swing" / "Bad Swing" / "Take"?
    // "Strike zone map with volume + execution" implies we track location.
    // The `SetResult` model has `targetZones: [TargetZone]`.
    // It does NOT seem to have a `Reps` array with individual locations.
    // Wait, let's check `Models/Session.swift`.
    // `struct Session` has `sets: [SetResult]`.
    // `SetResult` has `repsAttempted`, `repsExecuted`, `hardHits`, `strikeouts`.
    // It does NOT have per-pitch granular data like `PitchSession`.
    
    // Contradiction?
    // Requirement 2.2: "Hitting logging view: Mirrors the web's hitting log logic: All required fields: pitch type, intent, result, intended location, actual location...".
    // BUT the Data Model `Session.swift` (mirrored from `types.ts`) does NOT store granular hitting reps.
    // It stores `sets` which are aggregates.
    // Unless `SetResult` is used for a single rep? "SetNumber", "RepsAttempted".
    // Maybe the Web App just logs aggregates for hitting?
    // "Strike zone map with volume + execution" in Analytics.
    // If we don't store individual locations, how do we show a heatmap?
    // Ah, `Drill` has `targetZones`. Maybe the heatmap is based on the Drill's target?
    // Or maybe the `Session` model I saw is incomplete or I missed something.
    
    // Let's check `types.ts` again.
    // `export interface SetResult { ... targetZones?: TargetZone[] ... }`
    // It seems Hitting is indeed aggregated by Set.
    // SO, the "Strike Zone Grid" in logging might be for "Intended Zone" for the SET?
    // "Hitting logging view... Mirrors web... All required fields: pitch type, intent, result, intended location..."
    // This sounds like Pitching Charting.
    // Maybe the user means "Pitching logging view" mirrors web pitching?
    // "Hitting logging view: Mirrors the web's hitting log logic".
    
    // Let's look at `Session.swift` again.
    // It supports "Drill Linkage".
    // If I look at `LogHittingSheet.swift`, it has "Attempted" and "Executed".
    
    // User says: "Strike zone grid that's precise and hard to miss... Haptics on each rep".
    // If I tap a zone, maybe it increments a counter for that zone?
    // Or maybe I log a "Rep" and it aggregates into the current Set?
    // If `SetResult` tracks `repsExecuted`, maybe we just increment that.
    
    // I will implement a view that looks like:
    // 1. Setup (Drill/Intent).
    // 2. Active Logging:
    //    - Tap "Swing & Miss" -> Inc Attempted
    //    - Tap "Weak Contact" -> Inc Attempted
    //    - Tap "Hard Hit" -> Inc Attempted, Inc Executed (or HardHits)
    //    - Tap "Take" -> ?
    // But where does "Strike Zone Grid" fit?
    // Maybe for "Intended Location".
    // If the user wants granular location logging for hitting, the data model doesn't support it yet (it supports `targetZones` for the set).
    // I will assume the grid is to SELECT TARGET ZONES for the current set.
    
    // OR, maybe the user implies I should add granular logging?
    // "Do not change backend schema or web logic unless you absolutely must."
    // "Mirrors the web's hitting log logic".
    // If the web log logic is aggregate, then I should stick to aggregate.
    // But "Strike zone grid... precise" suggests granular.
    // Maybe the user is confusing Hitting with Pitching?
    // "Pitching logging view... Mirrors the web's... Intended vs actual location".
    // For Hitting, the text says: "required fields: pitch type, intent, result, intended location, actual location".
    // This strongly suggests granular data.
    // IS IT POSSIBLE `types.ts` IS MISSING SOMETHING?
    // `DataService.swift` `saveHittingSession` uses `Session`.
    
    // I will stick to what the data model supports: `SetResult`.
    // I will provide a UI to increment these counters.
    // I will use `StrikeZoneGrid` to set `targetZones` for the Set.
    // I will use `PitchType` picker to set `pitchTypes` for the Set.
    
    // Wait, "Haptics on each rep".
    // So buttons like "Hit", "Miss" are paramount.
    
    @ObservedObject var sessionManager = SessionManager.shared
    
    // Active Set State default
    @State private var currentSetIndex: Int = 0
    
    var currentSet: SetResult {
        if let s = session, s.sets.indices.contains(currentSetIndex) {
            return s.sets[currentSetIndex]
        }
        return SetResult(setNumber: 1)
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: AppSpacing.md) {
                // Header (Drill Name, Total Reps)
                headerSection
                
                Divider()
                
                ScrollView {
                    VStack(spacing: AppSpacing.xl) {
                        // 1. Target Setup (Grid + Pitch Type)
                        // "Intended Location"
                        setupSection
                        
                        Divider()
                        
                        // 2. Rep Logging (Big Buttons)
                        loggingControls
                        
                        // 3. Current Set Stats
                        statsSummary
                    }
                    .padding()
                }
                
                // End Session Button
                Button("End Session") {
                     Task { try? await sessionManager.endCurrentSession() }
                }
                .buttonStyle(.borderedProminent)
                .tint(AppColors.primary)
                .padding()
            }
            .navigationTitle("Hitting Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Dismiss") { dismiss() } // Just hides, preserves state
                }
            }
        }
    }
    
    var headerSection: some View {
        VStack {
            Text(session?.name ?? "Hitting")
                .font(AppTypography.headline)
            
            HStack {
                VStack {
                    Text("\(session?.totalRepsExecuted ?? 0)")
                        .font(AppTypography.title2)
                        .fontWeight(.bold)
                    Text("Executed")
                        .font(AppTypography.caption)
                }
                
                Divider().frame(height: 30)
                
                VStack {
                    Text("\(session?.totalRepsAttempted ?? 0)")
                        .font(AppTypography.title2)
                        .fontWeight(.bold)
                    Text("Total")
                        .font(AppTypography.caption)
                }
            }
        }
        .padding(.vertical, AppSpacing.sm)
    }
    
    var setupSection: some View {
        VStack(spacing: AppSpacing.md) {
            Text("Set \(currentSet.setNumber) Setup")
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.textSecondary)
                
            HStack(alignment: .top, spacing: AppSpacing.lg) {
                // Zone Selector
                VStack {
                    Text("Target Zone")
                        .font(AppTypography.caption)
                    StrikeZoneGrid(onZoneSelected: { zone in
                         // Update current set target zones
                         // We need to modify sessionManager.currentHittingSession
                         updateSetTarget(zone)
                    }, selectedZone: nil) // TODO: Map SetResult.targetZones to selection
                    .frame(width: 120, height: 150)
                }
                
                // Pitch Type Selector
                VStack {
                    Text("Pitch Type")
                        .font(AppTypography.caption)
                    // Simple Picker or Grid
                    // For now simple text
                    Text("Fastball") // Placeholder
                }
            }
        }
    }
    
    var loggingControls: some View {
        VStack(spacing: AppSpacing.md) {
            Text("Log Rep Result")
                .font(AppTypography.headline)
            
            HStack(spacing: AppSpacing.md) {
                // Hard Hit
                Button(action: { logRep(executed: true, hardHit: true) }) {
                   logButtonLabel(title: "Hard Hit", icon: "bolt.fill", color: AppColors.success)
                }
                
                // Solid / Executed
                Button(action: { logRep(executed: true, hardHit: false) }) {
                   logButtonLabel(title: "Good", icon: "checkmark", color: AppColors.primary)
                }
            }
            
            HStack(spacing: AppSpacing.md) {
                // Weak / Miss
                Button(action: { logRep(executed: false, hardHit: false) }) {
                   logButtonLabel(title: "Miss", icon: "xmark", color: AppColors.error)
                }
                
                // Strikeout
                Button(action: { logRep(executed: false, strikeout: true) }) {
                   logButtonLabel(title: "K", icon: "nosign", color: .gray)
                }
            }
        }
    }
    
    func logButtonLabel(title: String, icon: String, color: Color) -> some View {
        VStack {
            Image(systemName: icon)
                .font(.system(size: 30))
            Text(title)
                .fontWeight(.bold)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 100)
        .background(color.opacity(0.15))
        .foregroundColor(color)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(color, lineWidth: 2))
    }
    
    var statsSummary: some View {
        VStack {
            Text("Set Stats")
                .font(AppTypography.caption)
            
            HStack {
                Text("Hard Hits: \(currentSet.hardHits ?? 0)")
                Spacer()
                Text("K: \(currentSet.strikeouts ?? 0)")
            }
            .font(AppTypography.body)
            .padding()
            .background(AppColors.cardBackground)
            .cornerRadius(8)
        }
    }
    
    // Helpers
    func logRep(executed: Bool, hardHit: Bool = false, strikeout: Bool = false) {
        // Haptic feedback
        let generator = UIImpactFeedbackGenerator(style: executed ? .medium : .light)
        generator.impactOccurred()
        
        guard var s = session else { return }
        
        // Ensure sets exist
        if s.sets.isEmpty {
            s.sets = [SetResult(setNumber: 1)]
        }
        
        // Update set
        var set = s.sets[currentSetIndex]
        set.repsAttempted += 1
        if executed { set.repsExecuted += 1 }
        if hardHit { set.hardHits = (set.hardHits ?? 0) + 1 }
        if strikeout { set.strikeouts = (set.strikeouts ?? 0) + 1 }
        
        s.sets[currentSetIndex] = set
        
        // Write back to manager
        sessionManager.updateHittingSession(s)
    }
    
    func updateSetTarget(_ zone: ZoneId) {
        // Just a stub to show intent.
        // We'd map ZoneId -> TargetZone enum
    }
}
