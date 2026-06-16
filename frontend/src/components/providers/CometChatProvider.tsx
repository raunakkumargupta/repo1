"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { CometChatUIKit, UIKitSettingsBuilder } from "@cometchat/chat-uikit-react";

// ─── Configuration ────────────────────────────────────────────────────────────

const APP_ID = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID || "";
const REGION = process.env.NEXT_PUBLIC_COMETCHAT_REGION || "in";
const AUTH_KEY = process.env.NEXT_PUBLIC_COMETCHAT_AUTH_KEY || "";

// ─── Types ────────────────────────────────────────────────────────────────────

type CometChatContextValue = {
  isInitialized: boolean;
  isLoggedIn: boolean;
  error: string | null;
  loginUser: (uid: string) => Promise<void>;
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

async function initCometChat(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!APP_ID || !REGION || !AUTH_KEY) {
      throw new Error("CometChat credentials not configured. Set NEXT_PUBLIC_COMETCHAT_APP_ID, NEXT_PUBLIC_COMETCHAT_REGION, NEXT_PUBLIC_COMETCHAT_AUTH_KEY in .env.local");
    }

    const settings = new UIKitSettingsBuilder()
      .setAppId(APP_ID)
      .setRegion(REGION)
      .setAuthKey(AUTH_KEY)
      .subscribePresenceForAllUsers()
      .build();

    await CometChatUIKit.init(settings);
    initialized = true;
  })();

  return initPromise;
}

// ─── Module-level login guard (prevents concurrent login race) ────────────────

let loginInFlight: Promise<unknown> | null = null;

async function ensureLoggedIn(uid: string): Promise<void> {
  const existing = await CometChatUIKit.getLoggedinUser();
  if (existing) return;
  if (loginInFlight) {
    await loginInFlight;
    return;
  }
  loginInFlight = CometChatUIKit.login(uid);
  try {
    await loginInFlight;
  } finally {
    loginInFlight = null;
  }
}

// ─── Provider Component ───────────────────────────────────────────────────────

export function CometChatProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initCometChat()
      .then(() => setIsInitialized(true))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "CometChat initialization failed";
        setError(msg);
        console.error("[CometChat] Init error:", e);
      });
  }, []);

  const loginUser = useCallback(async (uid: string) => {
    if (!isInitialized) {
      setError("CometChat not initialized yet");
      return;
    }
    try {
      await ensureLoggedIn(uid);
      setIsLoggedIn(true);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "CometChat login failed";
      setError(msg);
      console.error("[CometChat] Login error:", e);
    }
  }, [isInitialized]);

  const logoutUser = useCallback(async () => {
    try {
      await CometChatUIKit.logout();
      setIsLoggedIn(false);
    } catch (e) {
      console.error("[CometChat] Logout error:", e);
    }
  }, []);

  return (
    <CometChatContext.Provider value={{ isInitialized, isLoggedIn, error, loginUser, logoutUser }}>
      {children}
    </CometChatContext.Provider>
  );
}
