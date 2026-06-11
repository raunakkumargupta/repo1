import Foundation

enum AuthScreen {
    case login
    case register
    case forgot
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct LoginResponse: Codable {
    let token: String
    let user: User?
}

struct RegisterRequest: Codable {
    let name: String
    let email: String
    let password: String
    let role: String
}

struct User: Codable, Identifiable {
    let id: String?
    let name: String
    let email: String
    let role: String?
}

struct Hackathon: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let coverImage: String?
    let tracks: String?             // JSON array string
    let startDate: String?
    let endDate: String?
    let registrationStatus: String?
    let problemStatement: String?
    let prizes: String?
    let schedule: String?
    let sponsors: String?
    let minTeamSize: Int?
    let maxTeamSize: Int?
    let registrationFee: String?
    let rounds: String?
}

struct Registration: Codable, Identifiable {
    let id: String
    let userId: String
    let hackathonId: String
    let githubUrl: String?
    let linkedinUrl: String?
    let skills: String?             // JSON array string
    let teamPreference: String
    let approvalStatus: String
    let resumeUrl: String?
}

struct HackathonApplicationRequest: Codable {
    let githubUrl: String
    let linkedinUrl: String
    let skills: [String]
    let teamPreference: String
    let resumeUrl: String?
}

struct TeamMember: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
    let role: String?
}

struct Team: Codable, Identifiable {
    let id: String
    let hackathonId: String
    let leaderId: String?
    let teamName: String
    let inviteCode: String
    let repositoryUrl: String?
    let isSubmitted: Bool
    let isWinner: Bool
}

struct TeamStatusResponse: Codable {
    let team: Team
    let members: [TeamMember]
}

struct CreateTeamRequest: Codable {
    let teamName: String
}

struct JoinTeamRequest: Codable {
    let inviteCode: String
}

struct ProjectSubmissionRequest: Codable {
    let repositoryUrl: String
}

struct Announcement: Codable, Identifiable {
    let id: String
    let message: String
}

struct SupportTicketRequest: Codable {
    let description: String
}

struct FcmTokenRequest: Codable {
    let token: String
    let platform: String
}

struct HackerProfile: Codable {
    var userId: String?
    var gender: String?
    var tshirtSize: String?
    var city: String?
    var phoneNumber: String?
    var emergencyContactName: String?
    var emergencyContactNumber: String?
    var bio: String?
    var readmeMd: String?
    var hasFormalEducation: Bool
    var degreeType: String?
    var institution: String?
    var fieldOfStudy: String?
    var gradYear: Int?
    var gradMonth: String?
    var dietaryPreference: String?
    var allergies: String?
    var githubUrl: String?
    var linkedinUrl: String?
    var resumeUrl: String?
    var skills: String?
    var defaultTeamPreference: String?
    var industry: String?
    var yearsOfExperience: Int?
    var mentorExpertise: String?
}

struct TeamInvitation: Codable, Identifiable {
    let id: String
    let teamId: String
    let inviteeId: String
    let status: String
    let teamName: String
}

struct TeamJoinRequest: Codable, Identifiable {
    let id: String
    let teamId: String
    let userId: String
    let status: String
    let userName: String?
    let userEmail: String?
    let teamName: String?
}

struct InviteUserRequest: Codable {
    let email: String
}

struct ManageRequestBody: Codable {
    let status: String
}
