"use client";

import React, { useEffect, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import {
  CometChatMessageHeader,
  CometChatMessageList,
  CometChatMessageComposer,
} from "@cometchat/chat-uikit-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCometChat } from "@/components/providers/CometChatProvider";

type ChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetUid: string;
  targetName?: string;
};

/**
 * 1-on-1 Chat Modal — used on the "Find a Team" page
 * to let hackers message each other directly.
 *
 * FIX: Prevents self-messaging by checking that targetUid ≠ logged-in UID.
 *      Uses CometChat.getUser(targetUid) to fetch the correct CometChat.User
 *      object that the UIKit components require for scoping the conversation.
 */
export default function ChatModal({ isOpen, onClose, targetUid, targetName }: ChatModalProps) {
  const { isLoggedIn } = useCometChat();
  const [user, setUser] = useState<CometChat.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for CometChat login before querying — avoids "getAdminHost" errors.
    if (!isOpen || !targetUid || !isLoggedIn) return;

    setLoading(true);
    setError(null);
    setUser(null);

    // Guard: prevent self-messaging
    const selfCheck = async () => {
      const loggedInUser = await CometChat.getLoggedInUser();
      if (loggedInUser && loggedInUser.getUid() === targetUid) {
        setError("You cannot message yourself.");
        setLoading(false);
        return;
      }

      CometChat.getUser(targetUid)
        .then((u) => {
          setUser(u);
          setLoading(false);
        })
        .catch((err) => {
          console.error("[ChatModal] Failed to fetch user:", err);
          setError("Could not load user for chat. They may not be synced yet.");
          setLoading(false);
        });
    };

    selfCheck();
  }, [isOpen, targetUid, isLoggedIn]);

  // Reset state when modal closes so next open starts fresh
  useEffect(() => {
    if (!isOpen) {
      setUser(null);
      setError(null);
      setLoading(true);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="w-full max-w-2xl h-[70vh] bg-[#0B0F19] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-theme="dark"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Chat with {targetName || targetUid}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Direct message — 1 on 1</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {loading && (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping mr-2" />
                  Loading conversation...
                </div>
              )}

              {error && (
                <div className="flex-1 flex flex-col items-center justify-center text-red-400 text-xs px-4 text-center gap-2">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  {error}
                </div>
              )}

              {!loading && !error && user && (
                <div className="flex-1 flex flex-col min-h-0">
                  <CometChatMessageHeader user={user} />
                  <div className="flex-1 min-h-0 flex flex-col">
                    <CometChatMessageList user={user} />
                  </div>
                  <CometChatMessageComposer user={user} />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
