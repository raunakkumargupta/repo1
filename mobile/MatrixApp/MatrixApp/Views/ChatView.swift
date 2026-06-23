import SwiftUI
import UIKit
import CometChatSDK
import CometChatCallsSDK
import CometChatUIKitSwift

// MARK: - SwiftUI Conversations List View
struct CometChatConversationsView: UIViewControllerRepresentable {
    @EnvironmentObject var vm: AppViewModel
    
    func makeUIViewController(context: Context) -> UINavigationController {
        let conversationsVC = CometChatConversations()
        let navController = UINavigationController(rootViewController: conversationsVC)
        
        conversationsVC.set(onItemClick: { [weak navController] conversation, indexPath in
            let messagesVC = MessagesVC()
            if let group = conversation.conversationWith as? CometChatSDK.Group {
                messagesVC.group = group
            } else if let user = conversation.conversationWith as? CometChatSDK.User {
                messagesVC.user = user
            }
            messagesVC.hidesBottomBarWhenPushed = true
            navController?.pushViewController(messagesVC, animated: true)
        })
        
        return navController
    }
    
    func updateUIViewController(_ uiViewController: UINavigationController, context: Context) {}
}

// MARK: - Custom Messages View Controller (Header + List + Composer)
class MessagesVC: UIViewController, UIGestureRecognizerDelegate {
    var user: CometChatSDK.User?
    var group: CometChatSDK.Group?
    
    private lazy var headerView: CometChatMessageHeader = {
        let headerView = CometChatMessageHeader()
        headerView.translatesAutoresizingMaskIntoConstraints = false
        headerView.heightAnchor.constraint(equalToConstant: 50).isActive = true
        if let user = user { headerView.set(user: user) }
        if let group = group { headerView.set(group: group) }
        headerView.set(controller: self)
        return headerView
    }()
    
    private lazy var messageListView: CometChatMessageList = {
        let listView = CometChatMessageList(frame: .null)
        listView.translatesAutoresizingMaskIntoConstraints = false
        if let user = user { listView.set(user: user) }
        if let group = group { listView.set(group: group) }
        listView.set(controller: self)
        listView.set(onThreadRepliesClick: { [weak self] message, template in
            // Thread replies can be handled here if needed
        })
        return listView
    }()
    
    private lazy var composerView: CometChatMessageComposer = {
        let composer = CometChatMessageComposer(frame: .null)
        composer.translatesAutoresizingMaskIntoConstraints = false
        if let user = user { composer.set(user: user) }
        if let group = group { composer.set(group: group) }
        composer.set(controller: self)
        return composer
    }()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()
        
        // Listen for call ended to dismiss any stale SDK-presented call views
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(dismissPresentedCallViews),
            name: NSNotification.Name("CometChatCallEnded"),
            object: nil
        )
    }
    
    @objc private func dismissPresentedCallViews() {
        if let presented = presentedViewController {
            print("[CALL-DEBUG] MessagesVC: dismissing presented VC: \(type(of: presented))")
            presented.dismiss(animated: false)
        }
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.interactivePopGestureRecognizer?.delegate = self
        navigationController?.setNavigationBarHidden(true, animated: animated)
        navigationItem.hidesBackButton = true
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        let topVC = navigationController?.viewControllers.last
        let isPushingToMessagesVC = topVC is MessagesVC && topVC !== self
        if !isPushingToMessagesVC {
            navigationController?.setNavigationBarHidden(false, animated: animated)
        }
    }
    
    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        if isMovingFromParent || isBeingDismissed {
            navigationController?.setNavigationBarHidden(false, animated: true)
        }
    }
    
    public func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        return true
    }
    
    private func buildUI() {
        view.backgroundColor = .systemBackground
        view.addSubview(headerView)
        view.addSubview(messageListView)
        view.addSubview(composerView)
        
        NSLayoutConstraint.activate([
            headerView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            
            messageListView.topAnchor.constraint(equalTo: headerView.bottomAnchor),
            messageListView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            messageListView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            messageListView.bottomAnchor.constraint(equalTo: composerView.topAnchor),
            
            composerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            composerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            composerView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }
    
    /// Reload chat components after user/group is set asynchronously
    func reloadChatComponents() {
        if let user = user {
            headerView.set(user: user)
            messageListView.set(user: user)
            composerView.set(user: user)
        } else if let group = group {
            headerView.set(group: group)
            messageListView.set(group: group)
            composerView.set(group: group)
        }
    }
}

// MARK: - SwiftUI Incoming Call Representable
struct CometChatIncomingCallView: UIViewControllerRepresentable {
    let call: Call
    @EnvironmentObject var vm: AppViewModel
    
    func makeUIViewController(context: Context) -> CometChatIncomingCall {
        let vc = CometChatIncomingCall()
        
        // Always login to Calls SDK fresh before each incoming call
        if let uid = CometChat.getLoggedInUser()?.uid {
            CometChatManager.shared.loginCallsSDK(uid: uid)
        }
        
        vc.set(call: call)
        
        // Handle accept: manually accept the call, then show ongoing call view
        vc.set(onAcceptClick: { acceptedCall, controller in
            guard let sessionID = call.sessionID else {
                print("[CALL-DEBUG] onAcceptClick: NO sessionID on call!")
                return
            }
            print("[CALL-DEBUG] onAcceptClick: accepting sessionID=\(sessionID)")
            
            // Manually accept the call since setting onAcceptClick overrides default SDK behavior
            CometChat.acceptCall(sessionID: sessionID) { acceptedCall in
                print("[CALL-DEBUG] acceptCall SUCCESS: sessionID=\(acceptedCall?.sessionID ?? "nil")")
                DispatchQueue.main.async {
                    // Set ongoing FIRST, then clear incoming — the fullScreenCover
                    // binding checks ongoing before incoming, so this transitions smoothly
                    vm.ongoingCallSessionID = sessionID
                    vm.ongoingCallStartTime = Date()
                    vm.incomingCall = nil
                    print("[CALL-DEBUG] State updated: ongoingCallSessionID=\(sessionID)")
                }
            } onError: { error in
                print("[CALL-DEBUG] acceptCall FAILED: \(error?.errorDescription ?? "unknown")")
                DispatchQueue.main.async {
                    vm.incomingCall = nil
                }
            }
        })
        
        // Handle decline/error: just dismiss
        vc.set(onError: { error in
            DispatchQueue.main.async {
                vm.incomingCall = nil
            }
        })
        
        return vc
    }
    
    func updateUIViewController(_ vc: CometChatIncomingCall, context: Context) {}
}

// MARK: - SwiftUI Ongoing Call Representable
struct CometChatOngoingCallView: UIViewControllerRepresentable {
    let sessionID: String
    @EnvironmentObject var vm: AppViewModel
    
    func makeUIViewController(context: Context) -> CometChatOngoingCall {
        print("[CALL-DEBUG] CometChatOngoingCallView: sessionID=\(sessionID)")
        let vc = CometChatOngoingCall()
        vc.set(sessionId: sessionID)
        return vc
    }
    
    func updateUIViewController(_ vc: CometChatOngoingCall, context: Context) {}
}

// MARK: - Helpers for SwiftUI fullScreenCover Identification
struct IdentifiableCall: Identifiable {
    let id: String
    let call: Call
}

struct IdentifiableSession: Identifiable {
    let id: String
}

// MARK: - Direct Message View (1-on-1 chat by UID)
struct DirectMessageView: UIViewControllerRepresentable {
    let uid: String
    let name: String
    
    func makeUIViewController(context: Context) -> UINavigationController {
        let messagesVC = MessagesVC()
        
        // Fetch the CometChat user by UID and set on the MessagesVC
        CometChat.getUser(UID: uid) { user in
            DispatchQueue.main.async {
                if let user = user {
                    messagesVC.user = user
                    messagesVC.reloadChatComponents()
                }
            }
        } onError: { error in
            print("Failed to fetch CometChat user \(uid): \(error?.errorDescription ?? "")")
        }
        
        let nav = UINavigationController(rootViewController: messagesVC)
        return nav
    }
    
    func updateUIViewController(_ uiViewController: UINavigationController, context: Context) {}
}
