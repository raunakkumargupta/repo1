import Foundation

enum APIError: Error {
    case server(String)
}

@MainActor
final class NetworkManager {
    static let shared = NetworkManager()
    private let baseURL = "http://127.0.0.1:8080/api"

    func login(email: String,password: String) async throws -> String {
        let url = URL(string: "\(baseURL)/auth/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(LoginRequest(email: email, password: password))
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw APIError.server(String(data: data, encoding: .utf8) ?? "Login failed")
        }
        return try JSONDecoder().decode(LoginResponse.self, from: data).token
    }

    func fetchHackathons() async throws -> [Hackathon] {
        let (data, _) = try await URLSession.shared.data(from: URL(string: "\(baseURL)/hackathons")!)
        return try JSONDecoder().decode([Hackathon].self, from: data)
    }

    func fetchAnnouncements(for hackathonId: Int) async throws -> [Announcement] {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/broadcasts")!
        var request = URLRequest(url: url)
        if let token = KeychainHelper.shared.read() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([Announcement].self, from: data)
    }

    func fetchMyTeam(for hackathonId: Int) async throws -> TeamStatus {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/my-team")!
        var request = URLRequest(url: url)
        if let token = KeychainHelper.shared.read() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(TeamStatus.self, from: data)
    }

    func fetchRegistrationStatus(for hackathonId: Int) async throws -> RegistrationStatus {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/my-registration")!
        var request = URLRequest(url: url)
        if let token = KeychainHelper.shared.read() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(RegistrationStatus.self, from: data)
    }

    func applyToHackathon(hackathonId: Int, requestBody: HackathonApplicationRequest) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/apply")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = KeychainHelper.shared.read() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = try JSONEncoder().encode(requestBody)
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw APIError.server(String(data: data, encoding: .utf8) ?? "Registration failed")
        }
    }

    func createTeam(hackathonId: Int, teamName: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/teams")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(KeychainHelper.shared.read() ?? "")", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(CreateTeamRequest(team_name: teamName))
        _ = try await URLSession.shared.data(for: request)
    }

    func joinTeam(hackathonId: Int, inviteCode: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/teams/join")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(KeychainHelper.shared.read() ?? "")", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(JoinTeamRequest(invite_code: inviteCode))
        _ = try await URLSession.shared.data(for: request)
    }

    func submitProject(hackathonId: Int, repositoryURL: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/teams/submit")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(KeychainHelper.shared.read() ?? "")", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(ProjectSubmissionRequest(repository_url: repositoryURL))
        _ = try await URLSession.shared.data(for: request)
    }

    func register(name:String,email:String,password:String) async throws {
        let url = URL(string: "\(baseURL)/auth/register")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(RegisterRequest(name: name, email: email, password: password, role: "Hacker"))
        _ = try await URLSession.shared.data(for: request)
    }

    func forgotPassword(email: String) async throws {
        let url = URL(string: "\(baseURL)/auth/forgot-password")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email])
        _ = try await URLSession.shared.data(for: request)
    }

    func fetchMyProfile() async throws -> UserProfile {
        let url = URL(string: "\(baseURL)/profile/me")!
        var request = URLRequest(url: url)
        if let token = KeychainHelper.shared.read() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(UserProfile.self, from: data)
    }

    func updateProfile(_ profile: HackerProfileRequest) async throws {
        let url = URL(string: "\(baseURL)/profile/me")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainHelper.shared.read() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONEncoder().encode(profile)
        _ = try await URLSession.shared.data(for: request)
    }
}
