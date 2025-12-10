import SwiftUI

// MARK: - App Colors
struct AppColors {
    // Primary - Baseball theme blue
    static let primary = Color(red: 0.1, green: 0.4, blue: 0.75)
    static let primaryLight = Color(red: 0.2, green: 0.5, blue: 0.85)
    
    // Secondary - Orange accent
    static let secondary = Color(red: 0.95, green: 0.5, blue: 0.2)
    static let secondaryLight = Color(red: 0.98, green: 0.6, blue: 0.35)
    
    // Semantic colors
    static let success = Color(red: 0.2, green: 0.75, blue: 0.4)
    static let warning = Color(red: 0.95, green: 0.7, blue: 0.1)
    static let error = Color(red: 0.9, green: 0.25, blue: 0.2)
    
    // Backgrounds
    static let background = Color(uiColor: .systemBackground)
    static let secondaryBackground = Color(uiColor: .secondarySystemBackground)
    static let cardBackground = Color(uiColor: .systemBackground)
    
    // Text
    static let textPrimary = Color(uiColor: .label)
    static let textSecondary = Color(uiColor: .secondaryLabel)
    static let textTertiary = Color(uiColor: .tertiaryLabel)
}

// MARK: - App Typography
struct AppTypography {
    static let largeTitle = Font.system(size: 34, weight: .bold, design: .rounded)
    static let title = Font.system(size: 28, weight: .bold, design: .rounded)
    static let title2 = Font.system(size: 22, weight: .semibold, design: .rounded)
    static let title3 = Font.system(size: 20, weight: .semibold, design: .rounded)
    static let headline = Font.system(size: 17, weight: .semibold)
    static let body = Font.system(size: 17, weight: .regular)
    static let callout = Font.system(size: 16, weight: .regular)
    static let subheadline = Font.system(size: 15, weight: .regular)
    static let footnote = Font.system(size: 13, weight: .regular)
    static let caption = Font.system(size: 12, weight: .regular)
    static let caption2 = Font.system(size: 11, weight: .regular)
    
    // Stat numbers
    static let statLarge = Font.system(size: 48, weight: .bold, design: .rounded)
    static let statMedium = Font.system(size: 32, weight: .bold, design: .rounded)
    static let statSmall = Font.system(size: 24, weight: .bold, design: .rounded)
}

// MARK: - App Spacing
struct AppSpacing {
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

// MARK: - App Corner Radius
struct AppCornerRadius {
    static let small: CGFloat = 8
    static let medium: CGFloat = 12
    static let large: CGFloat = 16
    static let xl: CGFloat = 20
    static let full: CGFloat = 999
}

// MARK: - Primary Button Style
struct PrimaryButtonStyle: ButtonStyle {
    var isEnabled: Bool = true
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTypography.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                    .fill(isEnabled ? AppColors.primary : AppColors.primary.opacity(0.5))
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Secondary Button Style
struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTypography.headline)
            .foregroundColor(AppColors.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: AppCornerRadius.medium)
                    .stroke(AppColors.primary, lineWidth: 2)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Card Style
struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(AppColors.cardBackground)
            .cornerRadius(AppCornerRadius.large)
            .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardModifier())
    }
}

// MARK: - Section Header Style
struct SectionHeader: View {
    let title: String
    var action: (() -> Void)? = nil
    var actionLabel: String? = nil
    
    var body: some View {
        HStack {
            Text(title.uppercased())
                .font(AppTypography.caption)
                .fontWeight(.semibold)
                .foregroundColor(AppColors.textSecondary)
                .tracking(0.5)
            
            Spacer()
            
            if let action = action, let label = actionLabel {
                Button(action: action) {
                    Text(label)
                        .font(AppTypography.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(AppColors.primary)
                }
            }
        }
    }
}

// MARK: - Empty State View
struct EmptyStateView: View {
    let icon: String
    let title: String
    let subtitle: String
    var action: (() -> Void)? = nil
    var actionLabel: String? = nil
    
    var body: some View {
        VStack(spacing: AppSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(AppColors.textTertiary)
            
            Text(title)
                .font(AppTypography.headline)
                .foregroundColor(AppColors.textPrimary)
            
            Text(subtitle)
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
            
            if let action = action, let label = actionLabel {
                Button(action: action) {
                    Text(label)
                        .font(AppTypography.callout)
                        .fontWeight(.semibold)
                }
                .buttonStyle(SecondaryButtonStyle())
                .frame(width: 200)
                .padding(.top, AppSpacing.xs)
            }
        }
        .padding(AppSpacing.xl)
    }
}

// MARK: - Loading View
struct LoadingView: View {
    var message: String = "Loading..."
    
    var body: some View {
        VStack(spacing: AppSpacing.md) {
            ProgressView()
                .scaleEffect(1.2)
            Text(message)
                .font(AppTypography.subheadline)
                .foregroundColor(AppColors.textSecondary)
        }
    }
}

// MARK: - Stat Card
struct StatCard: View {
    let value: String
    let label: String
    var color: Color = AppColors.primary
    var action: (() -> Void)? = nil
    
    var body: some View {
        Button(action: { action?() }) {
            VStack(spacing: AppSpacing.xs) {
                Text(value)
                    .font(AppTypography.statMedium)
                    .foregroundColor(color)
                
                Text(label)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(AppSpacing.lg)
            .background(
                RoundedRectangle(cornerRadius: AppCornerRadius.large)
                    .fill(color.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: AppCornerRadius.large)
                            .stroke(color.opacity(0.2), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }
}

// MARK: - Tag Badge
struct TagBadge: View {
    let text: String
    var color: Color = AppColors.primary
    
    var body: some View {
        Text(text.uppercased())
            .font(AppTypography.caption2)
            .fontWeight(.bold)
            .foregroundColor(color)
            .padding(.horizontal, AppSpacing.xs)
            .padding(.vertical, AppSpacing.xxs)
            .background(
                Capsule()
                    .fill(color.opacity(0.15))
            )
    }
}
