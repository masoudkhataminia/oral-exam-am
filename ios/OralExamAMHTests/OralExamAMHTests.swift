import XCTest
@testable import OralExamAMH

@MainActor
final class OralExamAMHTests: XCTestCase {
    func testCustomAnswersAreNotSaved() {
        let defaults = UserDefaults(suiteName: #function)!
        defaults.removePersistentDomain(forName: #function)
        let store = AppStore(client: MockOralExamClient(), defaults: defaults)
        let now = ISO8601DateFormatter().string(from: .now)

        store.save(AnswerResult(
            key: "custom",
            part: .A,
            caseNumber: nil,
            itemNumber: nil,
            query: "Private pasted case",
            answer: "Answer",
            cached: false,
            createdAt: now,
            updatedAt: now,
            version: 0,
            mode: "demo",
            sources: [],
            warning: nil
        ))

        XCTAssertTrue(store.savedAnswers.isEmpty)
    }

    func testCanonicalAnswersAreSaved() {
        let defaults = UserDefaults(suiteName: #function)!
        defaults.removePersistentDomain(forName: #function)
        let store = AppStore(client: MockOralExamClient(), defaults: defaults)
        let now = ISO8601DateFormatter().string(from: .now)

        store.save(AnswerResult(
            key: "A-F4283",
            part: .A,
            caseNumber: "F4283",
            itemNumber: "case-information",
            query: "Case",
            answer: "Answer",
            cached: false,
            createdAt: now,
            updatedAt: now,
            version: 1,
            mode: "demo",
            sources: [],
            warning: nil
        ))

        XCTAssertEqual(store.savedAnswers.first?.caseNumber, "F4283")
    }
}
