import Foundation

enum OralPart: String, CaseIterable, Codable, Identifiable {
    case A, B, C

    var id: String { rawValue }

    var title: String {
        switch self {
        case .A: "OTC & Self-care"
        case .B: "Law & Professional Practice"
        case .C: "Clinical Problem Solving"
        }
    }

    var shortTitle: String { "Part \(rawValue)" }

    var symbol: String {
        switch self {
        case .A: "cross.case.fill"
        case .B: "building.columns.fill"
        case .C: "stethoscope"
        }
    }
}

enum CaseViewMode: String, CaseIterable, Codable, Identifiable {
    case caseOnly = "case-only"
    case caseInformation = "case-information"

    var id: String { rawValue }
    var title: String { self == .caseOnly ? "Case only" : "Case + information" }
}

struct CaseOption: Codable, Identifiable, Hashable {
    let part: OralPart
    let caseId: String
    let title: String
    let prompt: String
    let order: Int
    let sourceFile: String
    let caseOnlyPage: Int?
    let informationPage: Int?
    let questionPage: Int?

    var id: String { "\(part.rawValue)-\(caseId)" }
}

struct AnswerSource: Codable, Hashable {
    let filename: String
    let score: Double?
}

struct AnswerResult: Codable, Identifiable, Hashable {
    let key: String
    let part: OralPart
    let caseNumber: String?
    let itemNumber: String?
    let query: String
    let answer: String
    let cached: Bool
    let createdAt: String
    let updatedAt: String
    let version: Int
    let mode: String?
    let sources: [AnswerSource]?
    let warning: String?

    var id: String { key }
}

struct AnalysisRequest: Encodable {
    let part: OralPart
    let caseNumber: String?
    let itemNumber: String?
    let query: String
    let forceRefresh: Bool
}
