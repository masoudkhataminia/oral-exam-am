import SwiftUI

extension Color {
    static let examGreen = Color(red: 0.04, green: 0.58, blue: 0.42)
    static let examBackground = Color(uiColor: .systemGroupedBackground)
}

private struct StudyCardModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    let cornerRadius: CGFloat

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(colorScheme == .dark ? Color(white: 0.09) : .white)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.primary.opacity(0.07), lineWidth: 1)
            )
            .shadow(color: .black.opacity(colorScheme == .dark ? 0 : 0.06), radius: 14, y: 5)
    }
}

extension View {
    func studyCard(cornerRadius: CGFloat = 22) -> some View {
        modifier(StudyCardModifier(cornerRadius: cornerRadius))
    }
}

struct PartBadge: View {
    let part: OralPart

    var body: some View {
        Label(part.shortTitle, systemImage: part.symbol)
            .font(.caption.weight(.semibold))
            .foregroundStyle(Color.examGreen)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.examGreen.opacity(0.12), in: Capsule())
    }
}

struct EmptyStateView: View {
    let symbol: String
    let title: String
    let message: String

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: symbol)
        } description: {
            Text(message)
        }
    }
}
