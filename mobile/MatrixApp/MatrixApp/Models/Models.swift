import Foundation

// MARK: - Auth & Session Models
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

// MARK: - Hackathon Models
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

// MARK: - Registration Models
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
}

// MARK: - Team Models
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

// MARK: - Support & Broadcast Models
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

struct UserProfile: Codable {
    var name: String?
    var email: String?
    var githubUrl: String?
    var linkedinUrl: String?
    var bio: String?
    var skills: [String]?
}

struct HackerProfileRequest: Codable {
    var bio: String
    var githubUrl: String
    var linkedinUrl: String
    var skills: [String]
}
