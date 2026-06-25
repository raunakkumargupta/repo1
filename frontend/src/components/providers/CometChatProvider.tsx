"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
// CSS-only import is SSR-safe (no window access). The JS module is loaded
// lazily inside the browser-only effect below to keep this file SSR-safe,
// because it is imported by the root layout (a Server Component) which is
// evaluated during static prerendering.
import "@cometchat/chat-uikit-react/css-variables.css";

// Lazy-load incoming call overlay
const CometChatIncomingCall = dynamic(
  () => import("@cometchat/chat-uikit-react").then((mod) => mod.CometChatIncomingCall),
  { ssr: false }
);

// Lazy-load outgoing call overlay
const CometChatOutgoingCall = dynamic(
  () => import("@cometchat/chat-uikit-react").then((mod) => mod.CometChatOutgoingCall),
  { ssr: false }
);

// ─── Configuration ────────────────────────────────────────────────────────────

const APP_ID = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID || "";
const REGION = process.env.NEXT_PUBLIC_COMETCHAT_REGION || "in";
const AUTH_KEY = process.env.NEXT_PUBLIC_COMETCHAT_AUTH_KEY || "";

// ─── Types ────────────────────────────────────────────────────────────────────

type CometChatContextValue = {
  isInitialized: boolean;
  isLoggedIn: boolean;
  error: string | null;
  loginUser: (uid: string, name?: string) => Promise<void>;
  logoutUser: () => Promise<void>;
};

const CometChatContext = createContext<CometChatContextValue>({
  isInitialized: false,
  isLoggedIn: false,
  error: null,
  loginUser: async () => {},
  logoutUser: async () => {},
});

export const useCometChat = () => useContext(CometChatContext);

// ─── Module-level init guard (prevents double-init in StrictMode) ─────────────

let initialized = false;
let initPromise: Promise<void> | null = null;
let callsSdkLoggedIn = false;

async function initCometChat(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!APP_ID || !REGION || !AUTH_KEY) {
      throw new Error(
        "CometChat credentials not configured. Set NEXT_PUBLIC_COMETCHAT_APP_ID, NEXT_PUBLIC_COMETCHAT_REGION, NEXT_PUBLIC_COMETCHAT_AUTH_KEY in .env.local"
      );
    }

    // Lazy-load the browser-only UI Kit module (keeps this file SSR-safe).
    const { CometChatUIKit, UIKitSettingsBuilder } = await import("@cometchat/chat-uikit-react");

    const settings = new UIKitSettingsBuilder()
      .setAppId(APP_ID)
      .setRegion(REGION)
      .setAuthKey(AUTH_KEY)
      .subscribePresenceForAllUsers()
      .build();

    await CometChatUIKit.init(settings);

    // Initialize calls SDK after UI Kit init
    const { CometChatCalls } = await import("@cometchat/calls-sdk-javascript");
    const callSettings = new CometChatCalls.CallAppSettingsBuilder()
      .setAppId(APP_ID)
      .setRegion(REGION as any)
      .build();
    await CometChatCalls.init(callSettings);

    initialized = true;
  })();

  return initPromise;
}

// ─── Module-level login guard (prevents concurrent login race) ────────────────

let loginInFlight: Promise<unknown> | null = null;

async function loginCallsSDK(uid: string, user: any) {
  const { CometChatCalls } = await import("@cometchat/calls-sdk-javascript");
  const { CometChat } = await import("@cometchat/chat-sdk-javascript");

  try {
    const existingCallsUser = await CometChatCalls.getLoggedInUser();
    if (existingCallsUser && existingCallsUser.uid === uid) {
      console.log("[CometChat] Calls SDK already logged in for UID:", uid);
      callsSdkLoggedIn = true;
      return;
    }
  } catch (e) {
    console.warn("[CometChat] Failed to get logged in Calls user, proceeding with login:", e);
  }

  // Retrieve active auth token directly from Chat SDK
  let token = null;
  try {
    const loggedInUser = await CometChat.getLoggedinUser();
    if (loggedInUser && typeof loggedInUser.getAuthToken === "function") {
      token = loggedInUser.getAuthToken();
    }
  } catch (e) {
    console.warn("[CometChat] Failed to get logged in user's auth token:", e);
  }

  // Fallback to user object getAuthToken method
  if (!token && typeof user?.getAuthToken === "function") {
    token = user.getAuthToken();
  }

  if (token) {
    try {
      await CometChatCalls.loginWithAuthToken(token);
      console.log("[CometChat] Calls SDK logged in with Auth Token");
      callsSdkLoggedIn = true;
      return;
    } catch (err) {
      console.warn("[CometChat] Calls SDK loginWithAuthToken failed, trying with Auth Key:", err);
    }
  }
  if (AUTH_KEY) {
    await CometChatCalls.login(uid, AUTH_KEY);
    console.log("[CometChat] Calls SDK logged in with Auth Key");
    callsSdkLoggedIn = true;
  }
}

async function ensureLoggedIn(uid: string, isRetry = false, userName?: string): Promise<void> {
  const { CometChatUIKit } = await import("@cometchat/chat-uikit-react");
  const existing = await CometChatUIKit.getLoggedinUser();
  if (existing) {
    if (existing.getUid() === uid) {
      await loginCallsSDK(uid, existing);
      return;
    }
    console.log(`[CometChat] User mismatch: existing=${existing.getUid()}, requested=${uid}. Logging out first.`);
    await CometChatUIKit.logout();
    const { CometChatCalls } = await import("@cometchat/calls-sdk-javascript");
    try {
      await CometChatCalls.leaveSession();
    } catch (e) {}
    callsSdkLoggedIn = false;
  }
  if (loginInFlight) {
    await loginInFlight;
    return;
  }
  loginInFlight = CometChatUIKit.login(uid);
  try {
    const loggedInUser = await loginInFlight;
    await loginCallsSDK(uid, loggedInUser);
  } catch (err: any) {
    // CometChat returns 404 when the user doesn't exist in their system.
    // Auto-sync: ask the backend to create this user in CometChat, then retry once.
    const code = err?.code ?? err?.message ?? "";
    const is404 = String(code).includes("404") || String(code).includes("ERR_UID_NOT_FOUND") || String(code).includes("not found");
    if (!isRetry && is404) {
      console.warn("[CometChat] User not found in CometChat (404). Triggering backend sync for UID:", uid);
      try {
        await fetch("/api/cometchat/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: userName }),
        });
      } catch (syncErr) {
        console.warn("[CometChat] Backend sync failed:", syncErr);
      }
      // Retry login once after sync
      loginInFlight = null;
      return ensureLoggedIn(uid, true, userName);
    }
    throw err;
  } finally {
    loginInFlight = null;
  }
}

// ─── Provider Component ───────────────────────────────────────────────────────

export function CometChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCallSender, setActiveCallSender] = useState<string | null>(null);

  const ringIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startRinging = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      
      const playBeep = () => {
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Dual frequency standard telephone tone (440 Hz + 480 Hz)
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, audioCtx.currentTime);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.4);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.45);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 0.45);
        osc2.stop(audioCtx.currentTime + 0.45);
      };

      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      playBeep();
      ringIntervalRef.current = setInterval(playBeep, 2000);
    } catch (err) {
      console.warn("[CometChat] Failed to play ringtone:", err);
    }
  }, []);

  const stopRinging = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Skip init entirely if credentials are not configured (keeps the app usable).
    if (!APP_ID || !AUTH_KEY) {
      return;
    }
    initCometChat()
      .then(() => setIsInitialized(true))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "CometChat initialization failed";
        setError(msg);
        console.error("[CometChat] Init error:", e);
      });

    // Swallow ResizeObserver layout errors from the Calling SDK to prevent crashing dev mode
    const handleResizeObserverError = (event: ErrorEvent) => {
      if (event.message && event.message.includes("Container dimensions and number of tiles must be positive")) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };
    window.addEventListener("error", handleResizeObserverError);
    return () => {
      window.removeEventListener("error", handleResizeObserverError);
    };
  }, []);

  // Web Audio Ringtone player / listener logic when user is logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    let isCancelled = false;
    let cometchatInstance: any = null;
    const LISTENER_ID = "provider-call-ringing-listener";

    const setupListener = async () => {
      const { CometChat } = await import("@cometchat/chat-sdk-javascript");
      if (isCancelled) return;
      cometchatInstance = CometChat;
      
      console.log("[CometChat] Registering CallListener with ID:", LISTENER_ID);
      // 1. Listen for 1-on-1 calls — for logging only; CometChatIncomingCall/OutgoingCall
      //    UIKit components internally manage their own ringing and accept/reject UI.
      CometChat.addCallListener(
        LISTENER_ID,
        new CometChat.CallListener({
          onIncomingCallReceived: (call: any) => {
            console.log("[CometChat] Incoming call received:", call);
            // Note: CometChatIncomingCall component handles ringing automatically
          },
          onIncomingCallCancelled: (call: any) => {
            console.log("[CometChat] Call cancelled:", call);
          },
          onOutgoingCallAccepted: (call: any) => {
            console.log("[CometChat] Call accepted:", call);
          },
          onOutgoingCallRejected: (call: any) => {
            console.log("[CometChat] Call rejected:", call);
          },
          onCallEndedMessageReceived: (call: any) => {
            console.log("[CometChat] Call ended:", call);
          }
        })
      );

      console.log("[CometChat] Registering MessageListener with ID:", LISTENER_ID + "-group-call");
      // 2. Listen for Group Calls (meeting custom messages)
      CometChat.addMessageListener(
        LISTENER_ID + "-group-call",
        new CometChat.MessageListener({
          onTextMessageReceived: (msg: any) => {
            console.log("[CometChat] onTextMessageReceived fired:", msg);
          },
          onCustomMessageReceived: (msg: any) => {
            console.log("[CometChat] onCustomMessageReceived fired:", msg);
            console.log("[CometChat] Message category:", msg.getCategory(), "type:", msg.getType());
            if (msg.getCategory() !== CometChat.CATEGORY_CUSTOM) return;
            if (msg.getType() !== "meeting") return;

            const sender = msg.getSender();
            console.log("[CometChat] Group call message sender:", sender?.getName(), "UID:", sender?.getUid());
            CometChat.getLoggedInUser().then((u) => {
              console.log("[CometChat] Logged in user:", u?.getName(), "UID:", u?.getUid());
              if (u && sender && sender.getUid() !== u.getUid()) {
                console.log("[CometChat] Incoming group call notification triggered!");
                startRinging();
                setActiveCallSender(sender.getName() || "A team member");
                
                // Automatically stop ringing and close banner after 15 seconds
                setTimeout(() => {
                  stopRinging();
                  setActiveCallSender(null);
                }, 15000);
              } else {
                console.log("[CometChat] Group call notification skipped: same user or user not found");
              }
            }).catch((err) => {
              console.error("[CometChat] Error getting logged in user:", err);
            });
          }
        })
      );

      console.log("[CometChat] All call and message listeners successfully registered");
    };

    setupListener();

    return () => {
      isCancelled = true;
      stopRinging();
      console.log("[CometChat] Cleaning up listeners...");
      if (cometchatInstance) {
        cometchatInstance.removeCallListener(LISTENER_ID);
        cometchatInstance.removeMessageListener(LISTENER_ID + "-group-call");
        console.log("[CometChat] Listeners cleaned up");
      } else {
        import("@cometchat/chat-sdk-javascript").then(({ CometChat }) => {
          CometChat.removeCallListener(LISTENER_ID);
          CometChat.removeMessageListener(LISTENER_ID + "-group-call");
          console.log("[CometChat] Listeners cleaned up fallback");
        });
      }
    };
  }, [isLoggedIn, startRinging, stopRinging]);

  const loginUser = useCallback(
    async (uid: string, name?: string) => {
      if (!isInitialized) {
        return;
      }
      try {
        await ensureLoggedIn(uid, false, name);
        setIsLoggedIn(true);
        setError(null);
      } catch (e) {
        // Log but don't surface CometChat errors to the UI — the app works
        // fine without CometChat (chat features are just unavailable).
        console.error("[CometChat] Login error:", e);
      }
    },
    [isInitialized]
  );

  const logoutUser = useCallback(async () => {
    try {
      const { CometChatUIKit } = await import("@cometchat/chat-uikit-react");
      await CometChatUIKit.logout();
      const { CometChatCalls } = await import("@cometchat/calls-sdk-javascript");
      try {
        await CometChatCalls.leaveSession();
      } catch (e) {}
      setIsLoggedIn(false);
      callsSdkLoggedIn = false;
    } catch (e) {
      console.error("[CometChat] Logout error:", e);
    }
  }, []);

  // Auto-login / session synchronization with CometChat based on active platform session
  useEffect(() => {
    if (!isInitialized) return;

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.id) {
          loginUser(data.id, data.name);
        } else {
          // If no platform user session exists, ensure logged out of CometChat
          if (isLoggedIn) {
            logoutUser();
          }
        }
      })
      .catch((err) => {
        console.error("[CometChatProvider] Auth sync error:", err);
      });
  }, [isInitialized, pathname, isLoggedIn, loginUser, logoutUser]);

  return (
    <CometChatContext.Provider value={{ isInitialized, isLoggedIn, error, loginUser, logoutUser }}>
      {children}
      {isInitialized && isLoggedIn && <CometChatIncomingCall />}
      {isInitialized && isLoggedIn && <CometChatOutgoingCall />}

      {/* Floating group call alert banner */}
      {activeCallSender && (
        <div 
          className="fixed top-6 right-6 z-[9999] glass border border-blue-500/20 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-top duration-300 max-w-sm" 
          style={{ background: "rgba(11, 15, 25, 0.8)", backdropFilter: "blur(8px)" }}
        >
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center animate-pulse shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Live Group Call</h4>
            <p className="text-[11px] text-slate-300 mt-0.5 truncate">{activeCallSender} started a video call.</p>
          </div>
          <button
            onClick={() => {
              setActiveCallSender(null);
              stopRinging();
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
          >
            View Chat
          </button>
        </div>
      )}
    </CometChatContext.Provider>
  );
}
