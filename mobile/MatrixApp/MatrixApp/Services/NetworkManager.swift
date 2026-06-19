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
    
    // Connect to the deployed staging backend
    private let baseURL = "http://192.168.29.115:8080/api"
    
    private let decoder: JSONDecoder = {
        let dec = JSONDecoder()
        dec.keyDecodingStrategy = .convertFromSnakeCase
        return dec
    }()
    
    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try decoder.decode(type, from: data)
        } catch let error as DecodingError {
            print("--- DECODING ERROR ---")
            switch error {
            case .typeMismatch(let type, let context):
                print("Type mismatch: \(type) at \(context.codingPath.map { $0.stringValue }.joined(separator: ".")) - Description: \(context.debugDescription)")
            case .valueNotFound(let type, let context):
                print("Value not found: \(type) at \(context.codingPath.map { $0.stringValue }.joined(separator: ".")) - Description: \(context.debugDescription)")
            case .keyNotFound(let key, let context):
                print("Key not found: '\(key.stringValue)' at \(context.codingPath.map { $0.stringValue }.joined(separator: ".")) - Description: \(context.debugDescription)")
            case .dataCorrupted(let context):
                print("Data corrupted at \(context.codingPath.map { $0.stringValue }.joined(separator: ".")) - Description: \(context.debugDescription)")
            @unknown default:
                print("Unknown decoding error: \(error)")
            }
            if let jsonString = String(data: data, encoding: .utf8) {
                print("JSON string: \(jsonString)")
            }
            throw error
        } catch {
            print("Decoding failed: \(error)")
            throw error
        }
    }
    
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
                if let url = http.url?.absoluteString, url.contains("/login") {
                    let message = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
                    throw APIError.server(message?.isEmpty == false ? message! : "Invalid email or password.")
                }
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
        
        return try decode(LoginResponse.self, from: data).token
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

    func fetchHackathons(limit: Int? = nil, offset: Int? = nil, search: String? = nil, track: String? = nil) async throws -> [Hackathon] {
        var components = URLComponents(string: "\(baseURL)/hackathons")!
        var queryItems = [URLQueryItem]()
        if let limit = limit {
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        if let offset = offset {
            queryItems.append(URLQueryItem(name: "offset", value: String(offset)))
        }
        if let search = search, !search.isEmpty {
            queryItems.append(URLQueryItem(name: "search", value: search))
        }
        if let track = track, !track.isEmpty {
            queryItems.append(URLQueryItem(name: "track", value: track))
        }
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        guard let url = components.url else {
            throw APIError.invalidResponse
        }
        let request = authenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        
        return try decode([Hackathon].self, from: data)
    }

    func fetchAnnouncements(for hackathonId: String) async throws -> [Announcement] {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/broadcasts")!
        let request = authenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        
        return try decode([Announcement].self, from: data)
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
            return try decode(TeamStatusResponse.self, from: data)
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
            return try decode(Registration.self, from: data)
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

    func fetchCurrentUser() async throws -> User {
        let url = URL(string: "\(baseURL)/auth/me")!
        let request = authenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        
        return try decode(User.self, from: data)
    }

    func fetchMyProfile() async throws -> HackerProfile {
        let url = URL(string: "\(baseURL)/profile/me")!
        let request = authenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        
        return try decode(HackerProfile.self, from: data)
    }

    func updateProfile(_ profile: HackerProfile) async throws {
        let url = URL(string: "\(baseURL)/profile/me")!
        var request = authenticatedRequest(url: url, method: "POST")
        request.httpBody = try encoder.encode(profile)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }
    
    func submitSupportTicket(hackathonId: String, teamId: String, description: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/tickets")!
        var request = authenticatedRequest(url: url, method: "POST")
        request.httpBody = try encoder.encode(SupportTicketRequest(teamId: teamId, description: description))
        
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

    func fetchPublicTeams(for hackathonId: String, limit: Int? = nil, offset: Int? = nil, search: String? = nil) async throws -> [Team] {
        var components = URLComponents(string: "\(baseURL)/hackathons/\(hackathonId)/teams/public")!
        var queryItems = [URLQueryItem]()
        if let limit = limit {
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        if let offset = offset {
            queryItems.append(URLQueryItem(name: "offset", value: String(offset)))
        }
        if let search = search, !search.isEmpty {
            queryItems.append(URLQueryItem(name: "search", value: search))
        }
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        guard let url = components.url else {
            throw APIError.invalidResponse
        }
        let request = authenticatedRequest(url: url, method: "GET")
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        return try decode([Team].self, from: data)
    }

    func requestToJoinTeam(hackathonId: String, teamId: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/teams/\(teamId)/request")!
        let request = authenticatedRequest(url: url, method: "POST")
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }

    func inviteUserToTeam(hackathonId: String, teamId: String, email: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/teams/\(teamId)/invite")!
        var request = authenticatedRequest(url: url, method: "POST")
        request.httpBody = try encoder.encode(InviteUserRequest(email: email))
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }

    func removeTeamMember(hackathonId: String, teamId: String, memberId: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/teams/\(teamId)/members/\(memberId)")!
        let request = authenticatedRequest(url: url, method: "DELETE")
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }

    func fetchTeamRequests(hackathonId: String, teamId: String) async throws -> [TeamJoinRequest] {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/teams/\(teamId)/requests")!
        let request = authenticatedRequest(url: url, method: "GET")
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        return try decode([TeamJoinRequest].self, from: data)
    }

    func fetchMyRequests(hackathonId: String) async throws -> [TeamJoinRequest] {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/my-requests")!
        let request = authenticatedRequest(url: url, method: "GET")
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        return try decode([TeamJoinRequest].self, from: data)
    }

    func manageTeamRequest(hackathonId: String, requestId: String, status: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/requests/\(requestId)")!
        var request = authenticatedRequest(url: url, method: "PUT")
        request.httpBody = try encoder.encode(ManageRequestBody(status: status))
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }

    func fetchMyInvitations(hackathonId: String) async throws -> [TeamInvitation] {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/my-invitations")!
        let request = authenticatedRequest(url: url, method: "GET")
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode == 404 {
            return []
        }
        try checkResponse(response, data: data)
        return try decode([TeamInvitation].self, from: data)
    }

    func manageInvitation(hackathonId: String, invitationId: String, status: String) async throws {
        let url = URL(string: "\(baseURL)/hackathons/\(hackathonId)/invitations/\(invitationId)")!
        var request = authenticatedRequest(url: url, method: "PUT")
        request.httpBody = try encoder.encode(ManageRequestBody(status: status))
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
    }
}



