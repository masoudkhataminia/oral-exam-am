import SwiftUI

@main
struct OralExamAMHApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            AppShell()
                .environmentObject(store)
                .tint(Color.examGreen)
        }
    }
}
