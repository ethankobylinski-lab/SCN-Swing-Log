import SwiftUI

struct PitchingRecordingView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel: PitchingRecordingViewModel
    @State private var showingFinalizeConfirmation = false
    
    init(pitcherId: String, teamId: String) {
        _viewModel = StateObject(wrappedValue: PitchingRecordingViewModel(pitcherId: pitcherId, teamId: teamId))
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    if viewModel.currentSessionId == nil {
                        // Session Setup
                        sessionSetupView
                    } else {
                        // Active Recording
                        activeRecordingView
                    }
                }
                .padding(.vertical)
            }
            .background(Color.background)
            .navigationTitle("Record Pitching Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var sessionSetupView: some View {
        VStack(spacing: 24) {
            SectionCard {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Session Name")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    
                    TextField("e.g., Bullpen, Flat Ground", text: $viewModel.sessionName)
                        .textFieldStyle(RoundedTextFieldStyle())
                    
                    Text("Session Type")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                        .padding(.top, 8)
                    
                    Picker("Session Type", selection: $viewModel.sessionType) {
                        ForEach([PitchSessionType.command, .velo, .mix, .recovery, .flat, .live], id: \.self) { type in
                            Text(type.rawValue.capitalized).tag(type)
                        }
                    }
                    .pickerStyle(MenuPickerStyle())
                }
            }
            .padding(.horizontal)
            
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.error)
                    .padding(.horizontal)
            }
            
            PrimaryButton(title: "Start Session") {
                Task {
                    await viewModel.startSession()
                }
            }
            .padding(.horizontal)
            .disabled(viewModel.isLoading || viewModel.sessionName.isEmpty)
        }
    }
    
    private var activeRecordingView: some View {
        VStack(spacing: 24) {
            // Summary Stats
            HStack(spacing: 12) {
                StatCard(
                    title: "Total Pitches",
                    value: "\(viewModel.totalPitches)"
                )
                StatCard(
                    title: "Strike %",
                    value: "\(viewModel.strikePercentage)%"
                )
            }
            .padding(.horizontal)
            
            // Quick Pitch Recording
            SectionCard {
                VStack(spacing: 16) {
                    Text("Record Pitch")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    
                    // Simplified pitch recording - tap to record strike/ball
                    HStack(spacing: 16) {
                        Button(action: {
                            Task {
                                await viewModel.recordPitch(
                                    pitchTypeId: viewModel.selectedPitchTypeId.isEmpty ? "default" : viewModel.selectedPitchTypeId,
                                    targetZone: viewModel.targetZone,
                                    actualZone: viewModel.actualZone,
                                    outcome: .calledStrike
                                )
                            }
                        }) {
                            VStack(spacing: 8) {
                                Text("Strike")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                Text("\(viewModel.pitchRecords.filter { $0.outcome == .calledStrike || $0.outcome == .swingingStrike }.count)")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 100)
                            .background(Color.success)
                            .cornerRadius(12)
                        }
                        .disabled(viewModel.isLoading)
                        
                        Button(action: {
                            Task {
                                await viewModel.recordPitch(
                                    pitchTypeId: viewModel.selectedPitchTypeId.isEmpty ? "default" : viewModel.selectedPitchTypeId,
                                    targetZone: viewModel.targetZone,
                                    actualZone: viewModel.actualZone,
                                    outcome: .ball
                                )
                            }
                        }) {
                            VStack(spacing: 8) {
                                Text("Ball")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                Text("\(viewModel.pitchRecords.filter { $0.outcome == .ball }.count)")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 100)
                            .background(Color.error)
                            .cornerRadius(12)
                        }
                        .disabled(viewModel.isLoading)
                    }
                }
            }
            .padding(.horizontal)
            
            // Recent Pitches
            if !viewModel.pitchRecords.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recent Pitches")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                        .padding(.horizontal)
                    
                    ForEach(viewModel.pitchRecords.suffix(5).reversed(), id: \.id) { pitch in
                        PitchRecordRow(pitch: pitch)
                            .padding(.horizontal)
                    }
                }
            }
            
            // Notes
            SectionCard {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Notes (Optional)")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    
                    TextEditor(text: $viewModel.notes)
                        .frame(height: 100)
                        .padding(8)
                        .background(Color.background)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.textMuted.opacity(0.2), lineWidth: 1)
                        )
                }
            }
            .padding(.horizontal)
            
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.error)
                    .padding(.horizontal)
            }
            
            if viewModel.isLoading {
                ProgressView()
                    .padding()
            } else {
                PrimaryButton(title: "End Session") {
                    showingFinalizeConfirmation = true
                }
                .padding(.horizontal)
                .disabled(viewModel.totalPitches == 0)
            }
            .alert("End Session?", isPresented: $showingFinalizeConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("End Session") {
                    Task {
                        await viewModel.finalizeSession()
                        if viewModel.isSessionSaved {
                            dismiss()
                        }
                    }
                }
            } message: {
                Text("This will finalize your session with \(viewModel.totalPitches) pitches.")
            }
            .alert("Error", isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("OK") { }
            } message: {
                if let error = viewModel.errorMessage {
                    Text(error)
                }
            }
        }
    }
}

struct PitchRecordRow: View {
    let pitch: PitchRecord
    
    var body: some View {
        HStack {
            Text("#\(pitch.index)")
                .font(.caption)
                .foregroundColor(.textMuted)
                .frame(width: 40)
            
            Text(pitch.outcome.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)
                .font(.subheadline)
                .foregroundColor(.textPrimary)
            
            Spacer()
            
            if pitch.outcome == .calledStrike || pitch.outcome == .swingingStrike {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.success)
            } else {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.error)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(8)
    }
}

