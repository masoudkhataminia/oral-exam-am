import SwiftUI

@MainActor
final class AppStore: ObservableObject {
    @Published var savedAnswers: [AnswerResult] = []

    let client: any OralExamClient
    private let defaults: UserDefaults
    private static let savedKey = "savedCanonicalAnswers"

    init(client: (any OralExamClient)? = nil, defaults: UserDefaults = .standard) {
        self.defaults = defaults
        if let client {
            self.client = client
        } else if
            let value = Bundle.main.object(forInfoDictionaryKey: "ORAL_EXAM_API_BASE_URL") as? String,
            let url = URL(string: value),
            !value.isEmpty
        {
            self.client = ServerOralExamClient(baseURL: url)
        } else {
            self.client = MockOralExamClient()
        }
        loadSavedAnswers()
    }

    var isDemoMode: Bool { client is MockOralExamClient }

    func save(_ answer: AnswerResult) {
        guard answer.caseNumber != nil else { return }
        savedAnswers.removeAll { $0.key == answer.key }
        savedAnswers.insert(answer, at: 0)
        if let data = try? JSONEncoder().encode(savedAnswers) {
            defaults.set(data, forKey: Self.savedKey)
        }
    }

    func remove(at offsets: IndexSet) {
        savedAnswers.remove(atOffsets: offsets)
        if let data = try? JSONEncoder().encode(savedAnswers) {
            defaults.set(data, forKey: Self.savedKey)
        }
    }

    private func loadSavedAnswers() {
        guard
            let data = defaults.data(forKey: Self.savedKey),
            let answers = try? JSONDecoder().decode([AnswerResult].self, from: data)
        else { return }
        savedAnswers = answers
    }
}
