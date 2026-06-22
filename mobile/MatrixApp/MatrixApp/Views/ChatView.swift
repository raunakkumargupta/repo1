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
class MessagesVC: UIViewController {
    var user: CometChatSDK.User?
    var group: CometChatSDK.Group?
    
    private lazy var headerView: CometChatMessageHeader = {
        let view = CometChatMessageHeader()
        view.translatesAutoresizingMaskIntoConstraints = false
        if let user = user {
            view.set(user: user)
        } else if let group = group {
            view.set(group: group)
        }
        view.set(controller: self)
        return view
    }()
    
    private lazy var messageListView: CometChatMessageList = {
        let listView = CometChatMessageList()
        listView.translatesAutoresizingMaskIntoConstraints = false
        if let user = user {
            listView.set(user: user)
        } else if let group = group {
            listView.set(group: group)
        }
        listView.set(controller: self)
        return listView
    }()
    
    private lazy var composerView: CometChatMessageComposer = {
        let composer = CometChatMessageComposer()
        composer.translatesAutoresizingMaskIntoConstraints = false
        if let user = user {
            composer.set(user: user)
        } else if let group = group {
            composer.set(group: group)
        }
        composer.set(controller: self)
        return composer
    }()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        configureView()
        setupLayout()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        navigationController?.setNavigationBarHidden(false, animated: true)
    }
    
    private func configureView() {
        view.backgroundColor = .systemBackground
        navigationController?.setNavigationBarHidden(true, animated: false)
    }
    
    private func setupLayout() {
        [headerView, messageListView, composerView].forEach { view.addSubview($0) }
        
        NSLayoutConstraint.activate([
            headerView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            headerView.heightAnchor.constraint(equalToConstant: 50),
            
            messageListView.topAnchor.constraint(equalTo: headerView.bottomAnchor),
            messageListView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            messageListView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            messageListView.bottomAnchor.constraint(equalTo: composerView.topAnchor),
            
            composerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            composerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            composerView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
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
        
        // CRITICAL: Ensure Calls SDK is logged in before binding the call
        // Without this, accept/reject signals don't reach the caller
        if let uid = CometChat.getLoggedInUser()?.uid {
            CometChatManager.shared.loginCallsSDK(uid: uid)
        }
        
        vc.set(call: call)
        
        vc.set(onAcceptClick: { acceptedCall, controller in
            DispatchQueue.main.async {
                vm.incomingCall = nil
                vm.ongoingCallSessionID = call.sessionID
            }
        })
        
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
        let vc = CometChatOngoingCall()
        vc.set(sessionId: sessionID)
        return vc
    }
    
    func updateUIViewController(_ vc: CometChatOngoingCall, context: Context) {}
}

/// Container that hides the status bar during calls
class CallContainerViewController: UIViewController {
    override var prefersStatusBarHidden: Bool { true }
    override var preferredStatusBarUpdateAnimation: UIStatusBarAnimation { .fade }
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
