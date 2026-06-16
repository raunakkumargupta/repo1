"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import {
  CometChatMessageHeader,
  CometChatMessageList,
  CometChatMessageComposer,
} from "@cometchat/chat-uikit-react";
import { motion, AnimatePresence } from "framer-motion";

type ChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetUid: string;
  targetName?: string;
};

/**
 * 1-on-1 Chat Modal — used on the "Find a Team" page
 * to let hackers message each other directly.
 */
export default function ChatModal({ isOpen, onClose, targetUid, targetName }: ChatModalProps) {
  const [user, setUser] = useState<CometChat.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !targetUid) return;

    setLoading(true);
    setError(null);

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
  }, [isOpen, targetUid]);

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
                <div className="flex-1 flex items-center justify-center text-red-400 text-xs px-4 text-center">
                  {error}
                </div>
              )}

              {!loading && !error && user && (
                <>
                  <div className="border-b border-white/5">
                    <CometChatMessageHeader user={user} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <CometChatMessageList user={user} />
                  </div>
                  <div className="border-t border-white/5">
                    <CometChatMessageComposer user={user} />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
