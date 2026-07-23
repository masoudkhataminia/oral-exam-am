import Foundation

protocol OralExamClient: Sendable {
    func catalog(for part: OralPart) async throws -> [CaseOption]
    func analyse(_ request: AnalysisRequest) async throws -> AnswerResult
}

struct ServerOralExamClient: OralExamClient {
    let baseURL: URL
    private let session: URLSession

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    func catalog(for part: OralPart) async throws -> [CaseOption] {
        var components = URLComponents(
            url: baseURL.appending(path: "api/catalog"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "part", value: part.rawValue)]
        guard let url = components?.url else { throw ClientError.invalidURL }

        let (data, response) = try await session.data(from: url)
        try validate(response: response, data: data)
        return try JSONDecoder().decode(CatalogPayload.self, from: data).items
    }

    func analyse(_ request: AnalysisRequest) async throws -> AnswerResult {
        var urlRequest = URLRequest(url: baseURL.appending(path: "api/analyse"))
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (data, response) = try await session.data(for: urlRequest)
        try validate(response: response, data: data)
        return try JSONDecoder().decode(AnswerResult.self, from: data)
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { throw ClientError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let payload = try? JSONDecoder().decode(ErrorPayload.self, from: data)
            throw ClientError.server(payload?.error ?? "Request failed (\(http.statusCode)).")
        }
    }
}

struct MockOralExamClient: OralExamClient {
    func catalog(for part: OralPart) async throws -> [CaseOption] {
        try await Task.sleep(for: .milliseconds(180))
        return Self.catalog.filter { $0.part == part }
    }

    func analyse(_ request: AnalysisRequest) async throws -> AnswerResult {
        try await Task.sleep(for: .milliseconds(700))
        let now = ISO8601DateFormatter().string(from: .now)
        return AnswerResult(
            key: "demo-\(request.part.rawValue)-\(request.caseNumber ?? "custom")",
            part: request.part,
            caseNumber: request.caseNumber,
            itemNumber: request.itemNumber,
            query: request.query,
            answer: Self.sampleAnswer(for: request.part),
            cached: false,
            createdAt: now,
            updatedAt: now,
            version: 1,
            mode: "demo",
            sources: [AnswerSource(filename: "Approved Australian source — demo", score: nil)],
            warning: "Demo answer. Connect the server URL before clinical use."
        )
    }

    private static func sampleAnswer(for part: OralPart) -> String {
        switch part {
        case .A:
            """
            ## Direct response
            I would first confirm who the patient is, assess symptom duration and severity, and screen for urgent red flags before recommending treatment.

            ## Key marking points
            - Clarify symptoms, onset, previous treatment, medical conditions, medicines, allergies and pregnancy status where relevant.
            - Refer urgently if there are severe, rapidly worsening or systemic symptoms.
            - If self-care is appropriate, recommend one suitable option with clear directions.
            - Confirm understanding and give a defined follow-up timeframe.

            ## More details
            The final product, dose and referral criteria must be based on the complete case information and approved Australian references.
            """
        case .B:
            """
            ## Direct response
            I would protect patient safety first, confirm the relevant state or territory, and verify the legal and professional requirements before proceeding.

            ## Key marking points
            - Identify the legal and professional issue.
            - Explain what can and cannot be done.
            - Offer the safest lawful alternative.
            - Escalate and document the decision when required.

            ## More details
            The exact action depends on the applicable jurisdiction and current legislation.
            """
        case .C:
            """
            ## Direct response
            My priority is to identify the medication-related risk, withhold supply if immediate harm is possible, and contact the prescriber using ISBAR.

            ## Key marking points
            - Confirm patient, indication, dose, route, duration and relevant clinical information.
            - State the risk and likely consequence.
            - Recommend a clear, practical intervention.
            - Counsel the patient and arrange monitoring and follow-up.

            ## More details
            The final recommendation must be tailored to renal and hepatic function, comorbidities, interactions and current Australian guidance.
            """
        }
    }

    private static let catalog: [CaseOption] = [
        .init(part: .A, caseId: "F4283", title: "15 year old female presents with redness in the face.", prompt: "Part A, Case ID: F4283.", order: 1, sourceFile: "Part A Questions", caseOnlyPage: 6, informationPage: 20, questionPage: nil),
        .init(part: .A, caseId: "F4297", title: "Adult male requests help for an ear problem.", prompt: "Part A, Case ID: F4297.", order: 2, sourceFile: "Part A Questions", caseOnlyPage: 6, informationPage: 20, questionPage: nil),
        .init(part: .A, caseId: "F4246", title: "Advice about sunscreen and sunburn before travelling.", prompt: "Part A, Case ID: F4246.", order: 3, sourceFile: "Part A Questions", caseOnlyPage: 6, informationPage: 20, questionPage: nil),
        .init(part: .B, caseId: "1", title: "Professional practice scenario 1", prompt: "Part B, Question 1.", order: 1, sourceFile: "Part B Questions", caseOnlyPage: nil, informationPage: nil, questionPage: 1),
        .init(part: .B, caseId: "2", title: "Professional practice scenario 2", prompt: "Part B, Question 2.", order: 2, sourceFile: "Part B Questions", caseOnlyPage: nil, informationPage: nil, questionPage: 2),
        .init(part: .B, caseId: "11", title: "Professional practice scenario 11", prompt: "Part B, Question 11.", order: 11, sourceFile: "Part B Questions", caseOnlyPage: nil, informationPage: nil, questionPage: 11),
        .init(part: .C, caseId: "2DC70A", title: "Clinical problem-solving case 2DC70A", prompt: "Part C, Case ID: 2DC70A.", order: 1, sourceFile: "Part C Questions", caseOnlyPage: nil, informationPage: 36, questionPage: nil),
        .init(part: .C, caseId: "2DC71E", title: "Clinical problem-solving case 2DC71E", prompt: "Part C, Case ID: 2DC71E.", order: 2, sourceFile: "Part C Questions", caseOnlyPage: nil, informationPage: 37, questionPage: nil),
        .init(part: .C, caseId: "2DC6C7", title: "Clinical problem-solving case 2DC6C7", prompt: "Part C, Case ID: 2DC6C7.", order: 3, sourceFile: "Part C Questions", caseOnlyPage: nil, informationPage: 38, questionPage: nil)
    ]
}

private struct CatalogPayload: Decodable {
    let items: [CaseOption]
}

private struct ErrorPayload: Decodable {
    let error: String
}

enum ClientError: LocalizedError {
    case invalidURL
    case invalidResponse
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: "The server URL is invalid."
        case .invalidResponse: "The server returned an invalid response."
        case .server(let message): message
        }
    }
}
