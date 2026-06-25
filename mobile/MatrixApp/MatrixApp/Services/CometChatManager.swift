import Foundation
import CometChatSDK
import CometChatCallsSDK
import CometChatUIKitSwift
import AVFoundation

@MainActor
final class CometChatManager: NSObject {
    static let shared = CometChatManager()
    
    // CometChat App credentials (matching backend & Android configurations)
    let appID = "1680184fff9efba78"
    let region = "in"
    let authKey = "c973c5607c75f3dbebe07a8845e6fa7a7cddfab7"
    
    private(set) var isInitialized = false
    private(set) var currentUser: CometChatSDK.User?
    
    // Callbacks to bridge signaling states to the ViewModel
    var onIncomingCallReceived: ((Call) -> Void)?
    var onOutgoingCallAccepted: ((Call) -> Void)?
    var onCallEnded: ((String?) -> Void)?  // passes session ID of ended call
    
    private override init() {
        super.init()
    }
    
    func initialize(completion: @escaping (Bool, CometChatException?) -> Void) {
        guard !isInitialized else {
            completion(true, nil)
            return
        }
        
        let uiKitSettings = UIKitSettings()
            .set(appID: appID)
            .set(authKey: authKey)
            .set(region: region)
            .subscribePresenceForAllUsers()
            .build()
        
        CometChatUIKit.init(uiKitSettings: uiKitSettings) { [weak self] result in
            DispatchQueue.main.async {
                guard let strongSelf = self as? CometChatManager else { return }
                switch result {
                case .success(let success):
                    strongSelf.isInitialized = success
                    strongSelf.currentUser = CometChatUIKit.getLoggedInUser()
                    
                    // Register Call Listener
                    CometChat.addCallListener("AppCallListener", strongSelf)
                    
                    // Initialize Calls SDK here, AFTER Chat SDK
                    let callAppSettings = CallAppSettingsBuilder()
                        .setAppId(strongSelf.appID)
                        .setRegion(strongSelf.region)
                        .build()
                    
                    CometChatCalls(callsAppSettings: callAppSettings) { _ in
                        print("CometChatCalls SDK initialized successfully ✓")
                        completion(success, nil)
                    } onError: { error in
                        print("CometChatCalls SDK init failed: \(error?.errorDescription ?? "unknown")")
                        completion(success, nil)
                    }
                case .failure(let error):
                    print("CometChat init failed: \(error.localizedDescription)")
                    completion(false, error as? CometChatException)
                }
            }
        }
    }
    
    func login(uid: String, completion: @escaping (CometChatSDK.User?, CometChatException?) -> Void) {
        guard isInitialized else {
            print("CometChat not initialized")
            completion(nil, nil)
            return
        }
        
        if let user = currentUser, user.uid == uid {
            // Already logged in — ensure Calls SDK is also logged in
            loginCallsSDK(uid: uid)
            completion(user, nil)
            return
        }
        
        CometChatUIKit.login(uid: uid) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let user):
                    self?.currentUser = user
                    print("CometChat logged in successfully: \(user.uid ?? "unknown")")
                    
                    // CRITICAL: Login to Calls SDK after Chat SDK login
                    // Without this, calling features won't work
                    if let uid = user.uid {
                        self?.loginCallsSDK(uid: uid)
                    }
                    
                    completion(user, nil)
                case .onError(let error):
                    print("CometChat login failed for UID=\(uid): \(error.errorDescription)")
                    completion(nil, error)
                @unknown default:
                    completion(nil, nil)
                }
            }
        }
    }
    
    /// In Calls SDK v4.x, there's no separate login step.
    /// The session token is handled internally when joining a call.
    func loginCallsSDK(uid: String) {
        // No-op for v4.x — login is not needed
        print("CometChatCalls SDK v4 — no login needed for UID=\(uid) ✓")
    }
    
    func logout(completion: @escaping (Bool, CometChatException?) -> Void) {
        guard let user = currentUser else {
            completion(true, nil)
            return
        }
        
        CometChatUIKit.logout(user: user) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.currentUser = nil
                    print("CometChat logged out")
                    completion(true, nil)
                case .onError(let error):
                    print("CometChat logout failed: \(error.errorDescription)")
                    completion(false, error)
                @unknown default:
                    completion(false, nil)
                }
            }
        }
    }
    
    /// Re-initialize the Calls SDK after a call session ends.
    func reinitializeCallsSDK() {
        let callAppSettings = CallAppSettingsBuilder()
            .setAppId(appID)
            .setRegion(region)
            .build()
        
        CometChatCalls.init(callsAppSettings: callAppSettings, onSuccess: { _ in
            print("[CALL-DEBUG] CometChatCalls SDK re-initialized after call ✓")
        }, onError: { error in
            print("[CALL-DEBUG] CometChatCalls SDK re-init failed: \(error?.errorDescription ?? "unknown")")
        })
    }
    
    // Derive a CometChat UID from the user email
    static func uidFromEmail(_ email: String) -> String {
        return email.lowercased()
            .replacingOccurrences(of: "[^a-z0-9]", with: "-", options: .regularExpression)
            .replacingOccurrences(of: "-+", with: "-", options: .regularExpression)
    }
}

// MARK: - CometChatCallDelegate Implementation
extension CometChatManager: CometChatCallDelegate {
    func onIncomingCallReceived(incomingCall: Call?, error: CometChatException?) {
        guard let call = incomingCall else { return }
        print("Incoming call received in CometChatManager: \(call.sessionID ?? "")")
        
        // Report to CallKit so native call UI shows on lock screen & home screen
        let callerName: String
        if let initiator = call.callInitiator as? CometChatSDK.User {
            callerName = initiator.name ?? "Unknown"
        } else {
            callerName = "Unknown Caller"
        }
        let isVideo = (call.callType == .video)
        CometChatPushHelper.shared.reportIncomingCallFromSDK(
            sessionId: call.sessionID ?? "",
            callerName: callerName,
            isVideo: isVideo,
            call: call
        )
        
        DispatchQueue.main.async {
            self.onIncomingCallReceived?(call)
        }
    }
    
    func onOutgoingCallAccepted(acceptedCall: Call?, error: CometChatException?) {
        guard let call = acceptedCall else { return }
        print("Outgoing call accepted in CometChatManager: \(call.sessionID ?? "")")
        DispatchQueue.main.async {
            // Dismiss the SDK's internal outgoing call view before we present our ongoing call
            NotificationCenter.default.post(name: NSNotification.Name("CometChatCallEnded"), object: nil)
            self.onOutgoingCallAccepted?(call)
        }
    }
    
    func onIncomingCallCancelled(cancelledCall: Call?, error: CometChatException?) {
        print("Incoming call cancelled in CometChatManager")
        DispatchQueue.main.async {
            self.onCallEnded?(cancelledCall?.sessionID)
            CometChatPushHelper.shared.endCallKitCall()
            NotificationCenter.default.post(name: NSNotification.Name("CometChatCallEnded"), object: nil)
        }
    }
    
    func onOutgoingCallRejected(rejectedCall: Call?, error: CometChatException?) {
        print("Outgoing call rejected in CometChatManager")
        DispatchQueue.main.async {
            self.onCallEnded?(rejectedCall?.sessionID)
            CometChatPushHelper.shared.endCallKitCall()
            NotificationCenter.default.post(name: NSNotification.Name("CometChatCallEnded"), object: nil)
        }
    }
    
    func onCallEndedMessageReceived(endedCall: Call?, error: CometChatException?) {
        print("Call ended message received in CometChatManager: \(endedCall?.sessionID ?? "no-session")")
        DispatchQueue.main.async {
            self.onCallEnded?(endedCall?.sessionID)
        }
    }
}
