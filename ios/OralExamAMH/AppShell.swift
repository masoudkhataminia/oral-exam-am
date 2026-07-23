import SwiftUI

struct AppShell: View {
    var body: some View {
        TabView {
            NavigationStack {
                PracticeView()
            }
            .tabItem { Label("Practice", systemImage: "sparkles") }

            NavigationStack {
                SavedAnswersView()
            }
            .tabItem { Label("Saved", systemImage: "bookmark.fill") }

            NavigationStack {
                AboutView()
            }
            .tabItem { Label("About", systemImage: "info.circle.fill") }
        }
    }
}
private struct AboutView: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List {
            Section {
                LabeledContent("Format", value: "AHPRA oral practice")
                LabeledContent("Access", value: "Public — no login")
                LabeledContent("Connection", value: store.isDemoMode ? "Demo data" : "Secure server")
                LabeledContent("Developed by", value: "Masoud Khataminia")
            }
            Section("Important") {
                Text("Educational exam preparation only. Do not enter identifiable patient information.")
                Text("OpenAI and licensed source credentials remain on the server and are never stored in this app.")
            }
            Section("Open-source UI") {
                Link("LearnHub — MIT", destination: URL(string: "https://github.com/Shaarav4795/LearnHub")!)
            }
        }
        .navigationTitle("About")
    }
}
