import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authService: AuthService
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isSignUp = false
    @State private var errorMessage: String?
    @State private var isLoading = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Logo/Title
                VStack(spacing: 8) {
                    Image(systemName: "figure.baseball")
                        .font(.system(size: 64))
                        .foregroundColor(.primaryBlue)
                    Text("Diamond Tracker")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.textPrimary)
                }
                .padding(.top, 60)
                .padding(.bottom, 40)
                
                // Form
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Email")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                        TextField("", text: $email)
                            .textFieldStyle(RoundedTextFieldStyle())
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Password")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                        SecureField("", text: $password)
                            .textFieldStyle(RoundedTextFieldStyle())
                    }
                    
                    if isSignUp {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Confirm Password")
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                            SecureField("", text: $confirmPassword)
                                .textFieldStyle(RoundedTextFieldStyle())
                        }
                    }
                    
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.error)
                            .padding(.horizontal)
                    }
                    
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        PrimaryButton(title: isSignUp ? "Sign Up" : "Sign In") {
                            Task {
                                await handleSubmit()
                            }
                        }
                    }
                    
                    Button(action: { isSignUp.toggle() }) {
                        Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                            .font(.subheadline)
                            .foregroundColor(.primaryBlue)
                    }
                }
                .padding(.horizontal, 24)
            }
        }
        .background(Color.background)
    }
    
    private func handleSubmit() async {
        errorMessage = nil
        isLoading = true
        
        do {
            if isSignUp {
                if password != confirmPassword {
                    errorMessage = "Passwords do not match"
                    isLoading = false
                    return
                }
                try await authService.signUp(email: email, password: password)
            } else {
                try await authService.signIn(email: email, password: password)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}

struct RoundedTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(Color.cardBackground)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.textMuted.opacity(0.2), lineWidth: 1)
            )
    }
}

