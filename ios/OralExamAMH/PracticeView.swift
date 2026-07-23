import SwiftUI

struct PracticeView: View {
    @EnvironmentObject private var store: AppStore
    @State private var selectedPart: OralPart = .A
    @State private var selectedView: CaseViewMode = .caseInformation
    @State private var catalog: [CaseOption] = []
    @State private var selectedCase: CaseOption?
    @State private var searchText = ""
    @State private var customText = ""
    @State private var isLoadingCatalog = false
    @State private var isAnalysing = false
    @State private var answer: AnswerResult?
    @State private var errorMessage: String?

    private var filteredCatalog: [CaseOption] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return catalog }
        return catalog.filter {
            $0.caseId.localizedCaseInsensitiveContains(query) ||
            $0.title.localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                hero
                partPicker
                casePicker
                promptEditor
                analyseButton
            }
            .padding()
            .padding(.bottom, 18)
        }
        .background(Color.examBackground)
        .navigationTitle("Oral Exam")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $answer) { result in
            AnswerView(result: result) {
                Task { await analyse(forceRefresh: true) }
            }
        }
        .task(id: selectedPart) {
            await loadCatalog()
        }
        .onChange(of: selectedView) { _, _ in
            if let selectedCase {
                customText = prompt(for: selectedCase)
            }
        }
        .alert("Couldn’t continue", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Practice with purpose")
                        .font(.title2.bold())
                    Text("Complete, concise answers shaped for the Australian intern pharmacist oral exam.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "graduationcap.fill")
                    .font(.title2)
                    .foregroundStyle(.white)
                    .frame(width: 48, height: 48)
                    .background(Color.examGreen, in: RoundedRectangle(cornerRadius: 15))
            }

            if store.isDemoMode {
                Label("Demo mode — UI works without API credentials", systemImage: "checkmark.seal.fill")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.examGreen)
            }
        }
        .padding(20)
        .studyCard()
    }

    private var partPicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("1. Choose exam part")
                .font(.headline)

            HStack(spacing: 8) {
                ForEach(OralPart.allCases) { part in
                    Button {
                        selectedPart = part
                    } label: {
                        VStack(spacing: 7) {
                            Image(systemName: part.symbol)
                                .font(.headline)
                            Text(part.shortTitle)
                                .font(.caption.weight(.semibold))
                        }
                        .foregroundStyle(selectedPart == part ? .white : .primary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(
                            selectedPart == part ? Color.examGreen : Color.primary.opacity(0.06),
                            in: RoundedRectangle(cornerRadius: 14)
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("part-\(part.rawValue)")
                }
            }

            Text(selectedPart.title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(18)
        .studyCard()
    }

    private var casePicker: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("2. Select or search")
                    .font(.headline)
                Spacer()
                if isLoadingCatalog { ProgressView().controlSize(.small) }
            }

            if selectedPart != .B {
                Picker("Case source", selection: $selectedView) {
                    ForEach(CaseViewMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
            }

            TextField(
                selectedPart == .B ? "Type question number, e.g. 11" : "Case number or keyword",
                text: $searchText
            )
            .textFieldStyle(.plain)
            .padding(12)
            .background(Color.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 13))
            .accessibilityIdentifier("case-search")

            if let selectedCase {
                selectedCaseCard(selectedCase)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(filteredCatalog.prefix(6)) { item in
                        Button {
                            selectedCase = item
                            searchText = item.caseId
                            customText = prompt(for: item)
                        } label: {
                            HStack(spacing: 12) {
                                Text(item.caseId)
                                    .font(.caption.monospaced().weight(.bold))
                                    .foregroundStyle(Color.examGreen)
                                    .frame(minWidth: 58, alignment: .leading)
                                Text(item.title)
                                    .font(.subheadline)
                                    .foregroundStyle(.primary)
                                    .lineLimit(2)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                Image(systemName: "chevron.right")
                                    .font(.caption.bold())
                                    .foregroundStyle(.tertiary)
                            }
                            .padding(12)
                            .background(Color.primary.opacity(0.045), in: RoundedRectangle(cornerRadius: 13))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(18)
        .studyCard()
    }

    private func selectedCaseCard(_ item: CaseOption) -> some View {
        HStack(alignment: .top, spacing: 12) {
            PartBadge(part: item.part)
            VStack(alignment: .leading, spacing: 5) {
                Text(item.caseId)
                    .font(.subheadline.monospaced().bold())
                Text(item.title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                selectedCase = nil
                searchText = ""
                customText = ""
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Clear selected case")
        }
        .padding(12)
        .background(Color.examGreen.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
    }

    private var promptEditor: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("3. Case text or examiner question")
                .font(.headline)
            TextEditor(text: $customText)
                .frame(minHeight: 120)
                .padding(8)
                .scrollContentBackground(.hidden)
                .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 14))
                .accessibilityIdentifier("case-text")
            Label("Do not include names, dates of birth or other identifiable patient details.", systemImage: "lock.shield.fill")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(18)
        .studyCard()
    }

    private var analyseButton: some View {
        Button {
            Task { await analyse(forceRefresh: false) }
        } label: {
            HStack {
                if isAnalysing {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: "sparkles")
                }
                Text(isAnalysing ? "Preparing answer…" : "Generate exam-ready answer")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
        }
        .buttonStyle(.borderedProminent)
        .tint(Color.examGreen)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .disabled(isAnalysing || customText.trimmingCharacters(in: .whitespacesAndNewlines).count < 2)
        .accessibilityIdentifier("generate-answer")
    }

    private func loadCatalog() async {
        isLoadingCatalog = true
        selectedCase = nil
        searchText = ""
        customText = ""
        defer { isLoadingCatalog = false }
        do {
            catalog = try await store.client.catalog(for: selectedPart)
        } catch is CancellationError {
            return
        } catch {
            catalog = []
            errorMessage = error.localizedDescription
        }
    }

    private func analyse(forceRefresh: Bool) async {
        guard !isAnalysing else { return }
        let text = customText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard text.count >= 2 else { return }

        isAnalysing = true
        defer { isAnalysing = false }
        do {
            let result = try await store.client.analyse(
                AnalysisRequest(
                    part: selectedPart,
                    caseNumber: selectedCase?.caseId,
                    itemNumber: selectedPart == .B ? selectedCase?.caseId : selectedView.rawValue,
                    query: text,
                    forceRefresh: forceRefresh
                )
            )
            store.save(result)
            answer = result
        } catch is CancellationError {
            return
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func prompt(for item: CaseOption) -> String {
        guard item.part != .B else { return item.prompt }
        let page = selectedView == .caseOnly
            ? item.caseOnlyPage ?? item.informationPage
            : item.informationPage
        let pageText = page.map { ", page \($0)" } ?? ""
        let viewText = selectedView == .caseOnly ? "Case Only" : "Case and Information"
        let instruction = selectedView == .caseOnly
            ? "Use the case stem only. Do not assume hidden information."
            : "Retrieve the exact case stem and further information from the approved indexed source."
        return """
        Part \(item.part.rawValue), Case ID: \(item.caseId).
        \(item.title)
        Source: \(item.sourceFile)\(pageText), \(viewText).
        \(instruction)
        """
    }
}
