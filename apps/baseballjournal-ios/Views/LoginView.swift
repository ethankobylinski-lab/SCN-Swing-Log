import SwiftUI

struct LoginView: View {
    @ObservedObject var authService = AuthService.shared
    
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var name: String = ""
    @State private var isSignUp: Bool = false
    @State private var showError: Bool = false
    @State private var errorMessage: String = ""
    @FocusState private var focusedField: Field?
    
    enum Field {
        case name, email, password
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: AppSpacing.xl) {
                Spacer()
                    .frame(height: AppSpacing.xxl)
                
                // Logo & Title
                logoSection
                
                // Form
                formSection
                
                // Submit Button
                submitButton
                
                // Toggle
                toggleButton
                
                Spacer()
            }
            .padding(.horizontal, AppSpacing.lg)
        }
        .background(
            LinearGradient(
                colors: [AppColors.primary.opacity(0.05), AppColors.background],
                startPoint: .top,
                endPoint: .center
            )
            .ignoresSafeArea()
        )
        .alert("Error", isPresented: $showError) {
            Button("OK") { showError = false }
        } message: {
            Text(errorMessage)
        }
        .onTapGesture {
            focusedField = nil
        }
    }
    
    // MARK: - Logo Section
    private var logoSection: some View {
        VStack(spacing: AppSpacing.md) {
            // Logo
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [AppColors.primary, AppColors.primaryLight],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 88, height: 88)
                    .shadow(color: AppColors.primary.opacity(0.3), radius: 12, x: 0, y: 6)
                
                Image(systemName: "baseball.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.white)
            }
            
            VStack(spacing: AppSpacing.xs) {
                Text("Diamond Tracker")
                    .font(AppTypography.largeTitle)
                    .foregroundColor(AppColors.textPrimary)
                
                Text("Track your progress, improve your game")
                    .font(AppTypography.subheadline)
                    .foregroundColor(AppColors.textSecondary)
            }
        }
        .padding(.bottom, AppSpacing.lg)
    }
    
    // MARK: - Form Section
    private var formSection: some View {
        VStack(spacing: AppSpacing.md) {
            if isSignUp {
                CustomTextField(
                    placeholder: "Full Name",
                    icon: "person.fill",
                    text: $name
                )
                .textContentType(.name)
                .autocapitalization(.words)
                .focused($focusedField, equals: .name)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
            
            CustomTextField(
                placeholder: "Email",
                icon: "envelope.fill",
                text: $email
            )
            .textContentType(.emailAddress)
            .keyboardType(.emailAddress)
            .autocapitalization(.none)
            .autocorrectionDisabled()
            .focused($focusedField, equals: .email)
            
            CustomSecureField(
                placeholder: "Password",
                icon: "lock.fill",
                text: $password
            )
            .textContentType(isSignUp ? .newPassword : .password)
            .focused($focusedField, equals: .password)
            
            if isSignUp {
                Text("Password must be at least 6 characters")
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: isSignUp)
    }
    
    // MARK: - Submit Button
    private var submitButton: some View {
        Button(action: submitForm) {
            HStack {
                if authService.isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text(isSignUp ? "Create Account" : "Sign In")
                        .font(AppTypography.headline)
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(AppSpacing.lg)
            .background(
                RoundedRectangle(cornerRadius: AppCornerRadius.large)
                    .fill(isFormValid ? AppColors.primary : AppColors.primary.opacity(0.5))
            )
            .shadow(color: isFormValid ? AppColors.primary.opacity(0.3) : Color.clear, radius: 8, x: 0, y: 4)
        }
        .disabled(!isFormValid || authService.isLoading)
        .padding(.top, AppSpacing.sm)
    }
    
    // MARK: - Toggle Button
    private var toggleButton: some View {
        Button(action: {
            withAnimation(.easeInOut(duration: 0.2)) {
                isSignUp.toggle()
            }
        }) {
            HStack(spacing: AppSpacing.xs) {
                Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                    .foregroundColor(AppColors.textSecondary)
                
                Text(isSignUp ? "Sign In" : "Sign Up")
                    .fontWeight(.semibold)
                    .foregroundColor(AppColors.primary)
            }
            .font(AppTypography.callout)
        }
    }
    
    private var isFormValid: Bool {
        let hasEmail = email.trimmingCharacters(in: .whitespaces).contains("@")
        let hasPassword = password.count >= 6
        let hasName = !isSignUp || !name.trimmingCharacters(in: .whitespaces).isEmpty
        return hasEmail && hasPassword && hasName
    }
    
    private func submitForm() {
        focusedField = nil
        
        Task {
            do {
                if isSignUp {
                    try await authService.signUp(
                        email: email.trimmingCharacters(in: .whitespaces).lowercased(),
                        password: password,
                        name: name.trimmingCharacters(in: .whitespaces),
                        role: .player
                    )
                } else {
                    try await authService.signIn(
                        email: email.trimmingCharacters(in: .whitespaces).lowercased(),
                        password: password
                    )
                }
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
}

// MARK: - Custom Text Field
struct CustomTextField: View {
    let placeholder: String
    let icon: String
    @Binding var text: String
    
    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(AppColors.textTertiary)
                .frame(width: 24)
            
            TextField(placeholder, text: $text)
                .font(AppTypography.body)
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .overlay(
            RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                .stroke(AppColors.primary.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Custom Secure Field
struct CustomSecureField: View {
    let placeholder: String
    let icon: String
    @Binding var text: String
    @State private var isSecure: Bool = true
    
    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(AppColors.textTertiary)
                .frame(width: 24)
            
            if isSecure {
                SecureField(placeholder, text: $text)
                    .font(AppTypography.body)
            } else {
                TextField(placeholder, text: $text)
                    .font(AppTypography.body)
            }
            
            Button(action: { isSecure.toggle() }) {
                Image(systemName: isSecure ? "eye.slash.fill" : "eye.fill")
                    .font(.system(size: 16))
                    .foregroundColor(AppColors.textTertiary)
            }
        }
        .padding(AppSpacing.md)
        .background(AppColors.cardBackground)
        .cornerRadius(AppCornerRadius.medium)
        .overlay(
            RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                .stroke(AppColors.primary.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

#Preview {
    LoginView()
}
