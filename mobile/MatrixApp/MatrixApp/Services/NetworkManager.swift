import Foundation

enum APIError: Error, LocalizedError {
    case server(String)
    case invalidResponse
    case unauthorized
    
    var errorDescription: String? {
        switch self {
        case .server(let message): return message
        case .invalidResponse: return "Received invalid response from server."
        case .unauthorized: return "Your session has expired. Please log in again."
        }
    }
}

@MainActor
final class NetworkManager {
    static let shared = NetworkManager()
    
    // Using host LAN IP for physical device connection, same as Android client
    private let baseURL = "http://192.168.29.115:8080/api"
    
    private let decoder: JSONDecoder = {
        let dec = JSONDecoder()
        dec.keyDecodingStrategy = .convertFromSnakeCase
        return dec
    }()
    
    private let encoder: JSONEncoder = {
        let enc = JSONEncoder()
        enc.keyEncodingStrategy = .convertToSnakeCase
        return enc
    }()

    private func authenticatedRequest(url: URL, method: String) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainHelper.shared.read() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return request
    }
    
    private func checkResponse(_ response: URLResponse, data: Data) throws {
        if let http = response as? HTTPURLResponse {
            if http.statusCode == 401 {
                throw APIError.unauthorized
            }
            if http.statusCode >= 400 {
                let message = String(data: data, encoding: .utf8) ?? "Server returned error \(http.statusCode)"
                throw APIError.server(message)
            }
        }
    }

    func login(email: String, password: String) async throws -> String {
        let url = URL(string: "\(baseURL)/auth/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(LoginRequest(email: email, password: password))
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        
        return try decoder.decode(LoginResponse.self, from: data).token
    }

    func register(name: String, email: String, password: String) async throws {
        let url = URL(string: "\(baseURL)/auth/register")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(RegisterRequest(name: name, email: email, password: password, role: "Hacker"))
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }

    func forgotPassword(email: String) async throws {
        let url = URL(string: "\(baseURL)/auth/forgot-password")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email])
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }

    func fetchHackathons() async throws -> [Hackathon] {
        let url = URL(string: "\(baseURL)/hackathons")!
        let request = authenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        
        return try decoder.decode([Hackathon].self, from: data)
    }

    func fetchAnnouncements(for hackathonId: String) async throws -> [Announcement] {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/broadcasts")!
        let request = authenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        
        return try decoder.decode([Announcement].self, from: data)
    }

    func fetchMyTeam(for hackathonId: String) async throws -> TeamStatusResponse? {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/my-team")!
        let request = authenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 204 || http.statusCode == 404 {
            return nil
        }
        try checkResponse(response, data: data)
        
        // Handle empty or null JSON returned for team
        let responseString = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
        if responseString == "null" || responseString == "{}" || responseString == "" {
            return nil
        }
        
        do {
            return try decoder.decode(TeamStatusResponse.self, from: data)
        } catch {
            return nil
        }
    }

    func fetchRegistrationStatus(for hackathonId: String) async throws -> Registration? {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/my-registration")!
        let request = authenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 404 {
            return nil
        }
        try checkResponse(response, data: data)
        
        // Handle empty or null JSON returned for registration
        let responseString = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
        if responseString == "null" || responseString == "{}" || responseString == "" {
            return nil
        }
        
        do {
            return try decoder.decode(Registration.self, from: data)
        } catch {
            return nil
        }
    }

    func applyToHackathon(hackathonId: String, requestBody: HackathonApplicationRequest) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/apply")!
        var request = authenticatedRequest(url: url, method: "POST")
        request.httpBody = try encoder.encode(requestBody)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }

    func createTeam(hackathonId: String, teamName: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/teams")!
        var request = authenticatedRequest(url: url, method: "POST")
        request.httpBody = try encoder.encode(CreateTeamRequest(teamName: teamName))
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }

    func joinTeam(hackathonId: String, inviteCode: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/teams/join")!
        var request = authenticatedRequest(url: url, method: "POST")
        request.httpBody = try encoder.encode(JoinTeamRequest(inviteCode: inviteCode))
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }

    func submitProject(hackathonId: String, repositoryURL: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/teams/submit")!
        var request = authenticatedRequest(url: url, method: "PUT")
        request.httpBody = try encoder.encode(ProjectSubmissionRequest(repositoryUrl: repositoryURL))
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }

    func fetchMyProfile() async throws -> UserProfile {
        let url = URL(string: "\(baseURL)/profile/me")!
        let request = authenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        
        return try decoder.decode(UserProfile.self, from: data)
    }

    func updateProfile(_ profile: HackerProfileRequest) async throws {
        let url = URL(string: "\(baseURL)/profile/me")!
        var request = authenticatedRequest(url: url, method: "POST")
        request.httpBody = try encoder.encode(profile)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }
    
    func submitSupportTicket(hackathonId: String, description: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/tickets")!
        var request = authenticatedRequest(url: url, method: "POST")
        request.httpBody = try encoder.encode(SupportTicketRequest(description: description))
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }
    
    func saveFcmToken(token: String) async throws {
        let url = URL(string: "\(baseURL)/users/fcm-token")!
        var request = authenticatedRequest(url: url, method: "POST")
        request.httpBody = try encoder.encode(FcmTokenRequest(token: token, platform: "ios"))
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }
}
