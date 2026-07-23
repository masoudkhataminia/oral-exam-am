import SwiftUI

struct SavedAnswersView: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        Group {
            if store.savedAnswers.isEmpty {
                EmptyStateView(
                    symbol: "bookmark.slash",
                    title: "No saved answers",
                    message: "Canonical case answers you generate will appear here."
                )
            } else {
                List {
                    ForEach(store.savedAnswers) { answer in
                        NavigationLink {
                            AnswerView(result: answer, onRefresh: {})
                        } label: {
                            VStack(alignment: .leading, spacing: 7) {
                                HStack {
                                    PartBadge(part: answer.part)
                                    if let number = answer.caseNumber {
                                        Text(number)
                                            .font(.caption.monospaced().bold())
                                    }
                                }
                                Text(answer.query)
                                    .font(.subheadline)
                                    .lineLimit(2)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 5)
                        }
                    }
                    .onDelete(perform: store.remove)
                }
            }
        }
        .navigationTitle("Saved answers")
    }
}
