# Oral Exam AMH for iOS

Native SwiftUI application for AHPRA intern pharmacist oral-exam practice.

## Open in Xcode

Open `OralExamAMH.xcodeproj`, select an iPhone simulator, and run the
`OralExamAMH` scheme. Without configuration the app uses safe demo content.

## Connect the server

Set `ORAL_EXAM_API_BASE_URL` in the app target Info properties to the public
HTTPS base URL of the existing Next.js server. Do not add OpenAI, Upstash or
licensed-source credentials to the iOS target.

## UI source

The study-card visual treatment and study-library direction are adapted from
[LearnHub](https://github.com/Shaarav4795/LearnHub), used under the MIT License.
See `THIRD_PARTY_NOTICES.md`.
