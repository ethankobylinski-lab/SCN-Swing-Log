import SwiftUI

struct HittingRecordingView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel: HittingRecordingViewModel
    @State private var showingSaveConfirmation = false
    
    init(playerId: String, teamId: String?) {
        _viewModel = StateObject(wrappedValue: HittingRecordingViewModel(playerId: playerId, teamId: teamId))
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Session Info
                    SectionCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Session Name")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                            
                            TextField("e.g., Tee Work, Front Toss", text: $viewModel.sessionName)
                                .textFieldStyle(RoundedTextFieldStyle())
                            
                            Text("Drill Type")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                                .padding(.top, 8)
                            
                            Picker("Drill Type", selection: $viewModel.selectedDrillType) {
                                Text("None").tag(Optional<DrillType>(nil))
                                ForEach([DrillType.teeWork, .softToss, .frontToss, .machine, .liveBP], id: \.self) { type in
                                    Text(type.rawValue).tag(Optional<DrillType>(type))
                                }
                            }
                            .pickerStyle(MenuPickerStyle())
                        }
                    }
                    .padding(.horizontal)
                    
                    // Current Set
                    SectionCard {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Set #\(viewModel.currentSet.setNumber)")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                            
                            HStack(spacing: 16) {
                                StepperCard(
                                    title: "Reps",
                                    value: $viewModel.currentSet.repsAttempted,
                                    color: .primaryBlue
                                )
                                
                                StepperCard(
                                    title: "Executed",
                                    value: $viewModel.currentSet.repsExecuted,
                                    max: viewModel.currentSet.repsAttempted,
                                    color: .success
                                )
                            }
                            
                            HStack(spacing: 16) {
                                StepperCard(
                                    title: "Hard Hits",
                                    value: $viewModel.currentSet.hardHits,
                                    max: viewModel.currentSet.repsAttempted,
                                    color: .warning
                                )
                                
                                StepperCard(
                                    title: "Strikeouts",
                                    value: $viewModel.currentSet.strikeouts,
                                    max: viewModel.currentSet.repsAttempted,
                                    color: .error
                                )
                            }
                            
                            if viewModel.currentSet.repsAttempted > 0 {
                                Button(action: {
                                    viewModel.addSet()
                                }) {
                                    HStack {
                                        Image(systemName: "plus.circle.fill")
                                        Text("Add Set")
                                    }
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.primaryBlue)
                                    .cornerRadius(12)
                                }
                                .disabled(viewModel.isLoading)
                            }
                        }
                    }
                    .padding(.horizontal)
                    
                    // Previous Sets
                    if !viewModel.sets.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Previous Sets")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                                .padding(.horizontal)
                            
                            ForEach(Array(viewModel.sets.enumerated()), id: \.offset) { index, set in
                                SetSummaryCard(set: set, onRemove: {
                                    viewModel.removeSet(at: index)
                                })
                                .padding(.horizontal)
                            }
                        }
                    }
                    
                    // Summary Stats
                    SectionCard {
                        VStack(spacing: 12) {
                            HStack {
                                StatCard(
                                    title: "Total Reps",
                                    value: "\(viewModel.totalReps)"
                                )
                                StatCard(
                                    title: "Execution %",
                                    value: "\(viewModel.executionPercentage)%"
                                )
                            }
                        }
                    }
                    .padding(.horizontal)
                    
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
                    
                    // Error Message
                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.error)
                            .padding(.horizontal)
                    }
                    
                    // Save Button
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    } else {
                        PrimaryButton(title: "Save Session") {
                            showingSaveConfirmation = true
                        }
                        .padding(.horizontal)
                        .disabled(viewModel.totalReps == 0)
                    }
                }
                .padding(.vertical)
            }
            .background(Color.background)
            .navigationTitle("Record Hitting Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Save Session?", isPresented: $showingSaveConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Save") {
                    Task {
                        await viewModel.saveSession()
                        if viewModel.isSessionSaved {
                            dismiss()
                        }
                    }
                }
            } message: {
                Text("This will save your session to your journal.")
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

struct StepperCard: View {
    let title: String
    @Binding var value: Int
    var max: Int? = nil
    var color: Color = .primaryBlue
    
    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(.textSecondary)
            Text("\(value)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            HStack(spacing: 12) {
                Button(action: {
                    if value > 0 {
                        value -= 1
                    }
                }) {
                    Image(systemName: "minus.circle.fill")
                        .font(.title3)
                        .foregroundColor(color)
                }
                
                Button(action: {
                    if let max = max {
                        if value < max {
                            value += 1
                        }
                    } else {
                        value += 1
                    }
                }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundColor(color)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct SetSummaryCard: View {
    let set: SetResult
    let onRemove: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Set #\(set.setNumber)")
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                Text("\(set.repsAttempted) reps · \(set.repsExecuted) executed")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
            
            Spacer()
            
            if let drillType = set.drillType {
                Text(drillType.rawValue)
                    .font(.caption)
                    .foregroundColor(.textMuted)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.primaryBlue.opacity(0.1))
                    .cornerRadius(8)
            }
            
            Button(action: onRemove) {
                Image(systemName: "trash")
                    .foregroundColor(.error)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

