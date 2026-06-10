import Foundation
struct LoginRequest: Codable { let email:String; let password:String }
struct LoginResponse: Codable { let token:String; let user: User? }
struct RegisterRequest: Codable { let name:String; let email:String; let password:String; let role:String }
struct User: Codable, Identifiable { let id:String?; let name:String; let email:String; let role:String? }
struct Hackathon: Codable, Identifiable { let id:Int; let title:String; let description:String; let cover_image:String? }
struct UserProfile: Codable { var name:String?; var email:String?; var github_url:String?; var linkedin_url:String?; var bio:String?; var skills:[String]? }
struct Announcement: Codable, Identifiable {
	let id: Int
	let message: String
}

struct TeamMember: Codable, Identifiable {
	let id: Int
	let name: String
	let email: String
}

struct TeamStatus: Codable, Identifiable {
	let id: Int
	let hackathon_id: Int?
	let team_name: String
	let invite_code: String?
	let is_submitted: Bool?
	let members: [TeamMember]?
}

struct RegistrationStatus: Codable, Identifiable {
	let id: Int
	let approval_status: String
}

struct HackathonApplicationRequest: Codable {
	let github_url: String
	let linkedin_url: String
	let skills: [String]
	let team_preference: String
}

struct CreateTeamRequest: Codable {
	let team_name: String
}

struct JoinTeamRequest: Codable {
	let invite_code: String
}

struct ProjectSubmissionRequest: Codable {
	let repository_url: String
}

struct HackerProfileRequest: Codable {
	var city: String
	var bio: String
	var github_url: String
	var linkedin_url: String
	var skills: String
}

struct UserSession {
	let token: String
	let profile: UserProfile?
}
