"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import {
  CometChatMessageHeader,
  CometChatMessageList,
  CometChatMessageComposer,
} from "@cometchat/chat-uikit-react";
import { useCometChat } from "@/components/providers/CometChatProvider";

type TeamGroupChatProps = {
  teamId: string;
  teamName?: string;
};

/**
 * Embedded Team Group Chat — shown on the /workspace/[hackathon_id]/project page
 * when the user is in a team. Uses the team_id as the CometChat Group GUID.
 */
export default function TeamGroupChat({ teamId, teamName }: TeamGroupChatProps) {
  const { isLoggedIn } = useCometChat();
  const [group, setGroup] = useState<CometChat.Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until the CometChat SDK is initialized AND the user is logged in.
    // Calling getGroup() before login throws "getAdminHost" errors.
    if (!teamId || !isLoggedIn) return;

    setLoading(true);
    setError(null);

    CometChat.getGroup(teamId)
      .then((g) => {
        setGroup(g);
        setLoading(false);
      })
      .catch(async (err) => {
        console.error("[TeamGroupChat] Failed to fetch group:", err);
        // The group might exist but the user isn't a member yet — try joining.
        try {
          await CometChat.joinGroup(teamId, CometChat.GroupType.Private, "");
          const g = await CometChat.getGroup(teamId);
          setGroup(g);
          setLoading(false);
        } catch (joinErr) {
          console.error("[TeamGroupChat] Join attempt failed:", joinErr);
          setError("Team chat not available. The group may not be synced yet.");
          setLoading(false);
        }
      });
  }, [teamId, isLoggedIn]);

  if (loading) {
    return (
      <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6 flex items-center justify-center h-64" data-theme="dark">
        <div className="text-slate-400 text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          {isLoggedIn ? "Loading team chat..." : "Connecting to chat..."}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl p-6" data-theme="dark">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Team Chat</h2>
        </div>
        <p className="text-xs text-red-400">{error}</p>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="glass border border-slate-200/60 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col h-[500px]" data-theme="dark">
      {/* Chat Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/40 dark:border-white/5 bg-white/40 dark:bg-slate-900/40">
        <MessageSquare className="w-4 h-4 text-blue-500" />
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          {teamName || "Team"} Chat
        </h3>
        <span className="ml-auto text-[9px] text-emerald-500 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Integrated CometChat Messages View */}
      <div className="flex-1 min-h-0 flex flex-col">
        <CometChatMessageHeader group={group} hideVideoCallButton={true} hideVoiceCallButton={true} />
        <div className="flex-1 min-h-0 flex flex-col">
          <CometChatMessageList group={group} />
        </div>
        <CometChatMessageComposer group={group} />
      </div>
    </div>
  );
}
