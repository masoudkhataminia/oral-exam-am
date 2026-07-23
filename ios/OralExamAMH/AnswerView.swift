import SwiftUI

struct AnswerView: View {
    let result: AnswerResult
    let onRefresh: () -> Void
    @State private var showMoreDetails = false

    private var sections: (main: String, details: String) {
        let marker = "## More details"
        guard let range = result.answer.range(of: marker, options: .caseInsensitive) else {
            return (result.answer, "")
        }
        return (
            String(result.answer[..<range.lowerBound]).trimmingCharacters(in: .whitespacesAndNewlines),
            String(result.answer[range.upperBound...]).trimmingCharacters(in: .whitespacesAndNewlines)
        )
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                header
                markdownCard(sections.main)

                if !sections.details.isEmpty {
                    DisclosureGroup("More details", isExpanded: $showMoreDetails) {
                        MarkdownText(text: sections.details)
                            .padding(.top, 10)
                    }
                    .font(.headline)
                    .padding(18)
                    .studyCard()
                    .accessibilityIdentifier("more-details")
                }

                references
            }
            .padding()
            .padding(.bottom, 18)
        }
        .background(Color.examBackground)
        .navigationTitle("Exam-ready answer")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: result.answer) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                PartBadge(part: result.part)
                if let number = result.caseNumber {
                    Text(number)
                        .font(.caption.monospaced().bold())
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if result.cached {
                    Label("Saved", systemImage: "bolt.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.examGreen)
                }
            }

            if let warning = result.warning {
                Label(warning, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }

            Button(action: onRefresh) {
                Label("Refresh answer", systemImage: "arrow.clockwise")
                    .font(.subheadline.weight(.semibold))
            }
        }
        .padding(18)
        .studyCard()
    }

    private func markdownCard(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Your oral response", systemImage: "quote.bubble.fill")
                .font(.headline)
            Divider()
            MarkdownText(text: text)
        }
        .padding(18)
        .studyCard()
    }

    private var references: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("References", systemImage: "books.vertical.fill")
                .font(.headline)
            if let sources = result.sources, !sources.isEmpty {
                ForEach(sources, id: \.self) { source in
                    Label(source.filename, systemImage: "doc.text.fill")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("No verified source metadata was returned.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .studyCard()
    }
}

private struct MarkdownText: View {
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(text.components(separatedBy: .newlines).enumerated()), id: \.offset) { _, rawLine in
                let line = rawLine.trimmingCharacters(in: .whitespaces)
                if line.hasPrefix("## ") {
                    Text(String(line.dropFirst(3)))
                        .font(.headline)
                        .padding(.top, 6)
                } else if line.hasPrefix("### ") {
                    Text(String(line.dropFirst(4)))
                        .font(.subheadline.bold())
                        .padding(.top, 4)
                } else if line.hasPrefix("- ") || line.hasPrefix("• ") {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Circle()
                            .fill(Color.examGreen)
                            .frame(width: 6, height: 6)
                        Text(String(line.dropFirst(2)))
                            .font(.body)
                    }
                } else if !line.isEmpty {
                    Text(line)
                        .font(.body)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .textSelection(.enabled)
    }
}
