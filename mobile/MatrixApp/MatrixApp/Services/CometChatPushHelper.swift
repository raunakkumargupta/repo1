import Foundation
import UIKit
import PushKit
import CallKit
import AVFAudio
import CometChatSDK
import CometChatCallsSDK
import CometChatUIKitSwift

/// CometChat APNs + VoIP Push Notification Helper
/// Handles token registration, incoming call via CallKit, and notification presentation
class CometChatPushHelper: NSObject {
    
    static let shared = CometChatPushHelper()
    static let PROVIDER_ID = "apns_matrixapp_device"
    
    // CallKit state
    private var uuid: UUID?
    private var activeCall: Call?
    private var provider: CXProvider?
    private var callController = CXCallController()
    
    // Must be stored to keep receiving VoIP push tokens
    private var voipRegistry: PKPushRegistry?
    
    private override init() {
        super.init()
    }
    
    // MARK: - Configure Push Notifications
    func configurePushNotification(application: UIApplication) {
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { _, _ in }
        application.registerForRemoteNotifications()
        
        // Register VoIP push — must store the registry
        voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
        voipRegistry?.delegate = self
        voipRegistry?.desiredPushTypes = [.voIP]
    }
    
    // MARK: - Register APNs Device Token
    func registerAPNsToken(deviceToken: Data) {
        guard CometChat.getLoggedInUser() != nil else {
            // Store for later
            let hex = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
            UserDefaults.standard.set(hex, forKey: "pendingAPNsToken")
            return
        }
        
        let hex = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[PUSH] Registering APNs device token: \(hex.prefix(20))...")
        
        CometChatNotifications.registerPushToken(
            pushToken: hex,
            platform: .APNS_IOS_DEVICE,
            providerId: Self.PROVIDER_ID
        ) { success in
            print("[PUSH] APNs device token registered: \(success)")
        } onError: { error in
            print("[PUSH] APNs device token registration failed: \(error.errorCode) \(error.errorDescription)")
        }
    }
    
    // MARK: - Register pending token after login
    func registerPendingTokens() {
        if let hex = UserDefaults.standard.string(forKey: "pendingAPNsToken"), !hex.isEmpty {
            CometChatNotifications.registerPushToken(
                pushToken: hex,
                platform: .APNS_IOS_DEVICE,
                providerId: Self.PROVIDER_ID
            ) { success in
                print("[PUSH] Pending APNs token registered: \(success)")
                UserDefaults.standard.removeObject(forKey: "pendingAPNsToken")
            } onError: { error in
                print("[PUSH] Pending APNs token failed: \(error.errorDescription)")
            }
        }
        
        if let voipHex = UserDefaults.standard.string(forKey: "pendingVoIPToken"), !voipHex.isEmpty {
            CometChatNotifications.registerPushToken(
                pushToken: voipHex,
                platform: .APNS_IOS_VOIP,
                providerId: Self.PROVIDER_ID
            ) { success in
                print("[PUSH] Pending VoIP token registered: \(success)")
                UserDefaults.standard.removeObject(forKey: "pendingVoIPToken")
            } onError: { error in
                print("[PUSH] Pending VoIP token failed: \(error.errorDescription)")
            }
        }
    }
    
    // MARK: - Unregister on logout
    func unregisterTokens(completion: @escaping () -> Void) {
        CometChatNotifications.unregisterPushToken { success in
            print("[PUSH] Token unregistered: \(success)")
            completion()
        } onError: { error in
            print("[PUSH] Token unregister failed: \(error.errorDescription)")
            completion()
        }
    }
    
    // MARK: - Handle notification to check if should suppress
    func shouldPresentNotification(userInfo: [AnyHashable: Any]) -> Bool {
        // Can suppress if user is in the active chat for this conversation
        return true
    }
}

// MARK: - PushKit VoIP Delegate
extension CometChatPushHelper: PKPushRegistryDelegate {
    
    func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        guard type == .voIP else { return }
        let token = pushCredentials.token.reduce("") { $0 + String(format: "%02X", $1) }
        print("[PUSH] VoIP token received: \(token.prefix(20))...")
        
        guard CometChat.getLoggedInUser() != nil else {
            UserDefaults.standard.set(token, forKey: "pendingVoIPToken")
            return
        }
        
        CometChatNotifications.registerPushToken(
            pushToken: token,
            platform: .APNS_IOS_VOIP,
            providerId: Self.PROVIDER_ID
        ) { success in
            print("[PUSH] VoIP token registered: \(success)")
        } onError: { error in
            print("[PUSH] VoIP token registration failed: \(error.errorDescription)")
        }
    }
    
    func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
        print("[PUSH] VoIP token invalidated")
    }
    
    func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        guard type == .voIP else {
            completion()
            return
        }
        
        let dict = payload.dictionaryPayload
        guard let callAction = dict["callAction"] as? String,
              let sessionId = dict["sessionId"] as? String,
              let senderName = dict["senderName"] as? String,
              let sender = dict["sender"] as? String,
              let callType = dict["callType"] as? String else {
            // Must report a call to CallKit even if we can't parse it (Apple requirement)
            let tempUUID = UUID()
            let config = CXProviderConfiguration(localizedName: "MatrixApp")
            let tempProvider = CXProvider(configuration: config)
            let update = CXCallUpdate()
            update.remoteHandle = CXHandle(type: .generic, value: "Unknown")
            tempProvider.reportNewIncomingCall(with: tempUUID, update: update) { _ in
                tempProvider.reportCall(with: tempUUID, endedAt: Date(), reason: .failed)
            }
            completion()
            return
        }
        
        switch callAction {
        case "initiated":
            reportIncomingCall(sessionId: sessionId, senderName: senderName, sender: sender, callType: callType)
        case "unanswered", "cancelled", "rejected", "busy", "ended":
            if let uuid = self.uuid {
                provider?.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
                self.uuid = nil
                self.activeCall = nil
            }
        default:
            break
        }
        
        completion()
    }
    
    private func reportIncomingCall(sessionId: String, senderName: String, sender: String, callType: String) {
        // If already on a call, reject with busy
        if CometChat.getActiveCall() != nil {
            CometChat.rejectCall(sessionID: sessionId, status: .busy) { _ in
                print("[PUSH] Rejected with busy (already on call)")
            } onError: { _ in }
            return
        }
        
        uuid = UUID()
        
        let callTypeValue: CometChat.CallType = callType == "audio" ? .audio : .video
        let call = Call(receiverId: CometChat.getLoggedInUser()?.uid ?? "", callType: callTypeValue, receiverType: .user)
        call.sessionID = sessionId
        let initiator = CometChatSDK.User(uid: sender, name: senderName)
        call.callInitiator = initiator
        activeCall = call
        
        let config = CXProviderConfiguration(localizedName: "MatrixApp")
        config.supportsVideo = callType == "video"
        config.includesCallsInRecents = true
        
        provider = CXProvider(configuration: config)
        provider?.setDelegate(self, queue: nil)
        
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: senderName)
        update.hasVideo = callType == "video"
        
        provider?.reportNewIncomingCall(with: uuid!, update: update) { error in
            if let error = error {
                print("[PUSH] Report incoming call failed: \(error.localizedDescription)")
            } else {
                self.configureAudioSession()
            }
        }
    }
    
    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playAndRecord, options: [.mixWithOthers, .allowBluetooth, .defaultToSpeaker])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("[PUSH] Audio session error: \(error)")
        }
    }
}

// MARK: - CallKit Delegate
extension CometChatPushHelper: CXProviderDelegate {
    
    func providerDidReset(_ provider: CXProvider) {
        if let uuid = self.uuid {
            provider.reportCall(with: uuid, endedAt: Date(), reason: .unanswered)
        }
    }
    
    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        guard let call = activeCall, let sessionId = call.sessionID else {
            action.fail()
            return
        }
        
        // Accept the call
        CometChat.acceptCall(sessionID: sessionId) { [weak self] acceptedCall in
            DispatchQueue.main.async {
                // Present the ongoing call view
                let ongoingCallVC = CometChatOngoingCall()
                ongoingCallVC.set(sessionId: sessionId)
                ongoingCallVC.modalPresentationStyle = .fullScreen
                
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let window = windowScene.windows.first,
                   var topVC = window.rootViewController {
                    while let presented = topVC.presentedViewController {
                        topVC = presented
                    }
                    topVC.present(ongoingCallVC, animated: true)
                }
            }
        } onError: { error in
            print("[PUSH] Accept call failed: \(error?.errorDescription ?? "")")
        }
        
        action.fulfill()
    }
    
    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        guard let call = activeCall, let sessionId = call.sessionID else {
            action.fulfill()
            return
        }
        
        if CometChat.getActiveCall() == nil || CometChat.getActiveCall()?.callStatus == .initiated {
            // Reject the call
            CometChat.rejectCall(sessionID: sessionId, status: .rejected) { _ in
                print("[PUSH] Call rejected via CallKit")
            } onError: { error in
                print("[PUSH] Reject failed: \(error?.errorDescription ?? "")")
            }
        } else {
            // End active call
            CometChat.endCall(sessionID: sessionId) { _ in
                CometChatCalls.endSession()
                print("[PUSH] Call ended via CallKit")
            } onError: { error in
                print("[PUSH] End call failed: \(error?.errorDescription ?? "")")
            }
        }
        
        activeCall = nil
        uuid = nil
        action.fulfill()
    }
    
    func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
        CometChatCalls.audioMuted(action.isMuted)
        action.fulfill()
    }
}
