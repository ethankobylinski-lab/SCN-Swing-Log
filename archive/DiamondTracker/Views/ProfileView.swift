import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authService: AuthService
    @State private var showingSignOut = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    if let user = authService.currentUser {
                        // Profile Header
                        VStack(spacing: 12) {
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 80))
                                .foregroundColor(.primaryBlue)
                            
                            Text(user.name)
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.textPrimary)
                            
                            Text(user.email ?? "No email")
                                .font(.subheadline)
                                .foregroundColor(.textSecondary)
                            
                            Text(user.role.rawValue)
                                .font(.caption)
                                .foregroundColor(.textMuted)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 4)
                                .background(Color.primaryBlue.opacity(0.1))
                                .cornerRadius(8)
                        }
                        .padding()
                        
                        // Settings Section
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Settings")
                                .font(.headline)
                                .foregroundColor(.textPrimary)
                                .padding(.horizontal)
                            
                            SectionCard {
                                VStack(spacing: 16) {
                                    HStack {
                                        Text("Notifications")
                                            .foregroundColor(.textPrimary)
                                        Spacer()
                                        Toggle("", isOn: .constant(true))
                                    }
                                    
                                    Divider()
                                    
                                    HStack {
                                        Text("Dark Mode")
                                            .foregroundColor(.textPrimary)
                                        Spacer()
                                        Toggle("", isOn: .constant(false))
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                        
                        // Sign Out
                        Button(action: {
                            showingSignOut = true
                        }) {
                            Text("Sign Out")
                                .font(.headline)
                                .foregroundColor(.error)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.error.opacity(0.1))
                                .cornerRadius(12)
                        }
                        .padding(.horizontal)
                        .alert("Sign Out", isPresented: $showingSignOut) {
                            Button("Cancel", role: .cancel) { }
                            Button("Sign Out", role: .destructive) {
                                Task {
                                    try? await authService.signOut()
                                }
                            }
                        } message: {
                            Text("Are you sure you want to sign out?")
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color.background)
            .navigationTitle("Profile")
        }
    }
}

