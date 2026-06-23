import SwiftUI
import FirebaseCore
import FirebaseMessaging
import UserNotifications
import CometChatSDK
import PushKit

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
    // Required by CometChatCallsSDK
    private var _window: UIWindow?
    @objc var window: UIWindow? {
        get {
            if _window == nil {
                _window = UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .flatMap { $0.windows }
                    .first { $0.isKeyWindow }
            }
            return _window
        }
        set { _window = newValue }
    }
    
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        FirebaseApp.configure()
        
        // Initialize CometChat SDK
        Task { @MainActor in
            CometChatManager.shared.initialize { success, error in
                if success {
                    print("CometChat initialized from AppDelegate ✓")
                } else if let error = error {
                    print("CometChat failed to initialize: \(error.errorDescription)")
                }
            }
        }
        
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self
        
        // Configure CometChat Push Notifications (APNs + VoIP/PushKit)
        CometChatPushHelper.shared.configurePushNotification(application: application)
        
        return true
    }
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Firebase
        Messaging.messaging().apnsToken = deviceToken
        // CometChat APNs
        CometChatPushHelper.shared.registerAPNsToken(deviceToken: deviceToken)
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error.localizedDescription)")
    }
    
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        print("Firebase registration token: \(String(describing: fcmToken))")
        if let fcmToken = fcmToken {
            UserDefaults.standard.set(fcmToken, forKey: "matrix_fcm_token")
            NotificationCenter.default.post(name: .didReceiveFCMToken, object: nil, userInfo: ["token": fcmToken])
        }
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([[.banner, .sound, .badge]])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        // Handle notification tap — can navigate to chat here
        let userInfo = response.notification.request.content.userInfo
        print("[PUSH] Notification tapped: \(userInfo)")
        completionHandler()
    }
}

extension Notification.Name {
    static let didReceiveFCMToken = Notification.Name("didReceiveFCMToken")
}

@main
struct MatrixAppApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
        }
    }
}
