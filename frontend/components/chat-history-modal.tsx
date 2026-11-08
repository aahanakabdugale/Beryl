"use client";

import React from "react";
import { MessageSquare, Trash2, Clock, Plus, X, ChevronRight } from "lucide-react";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: any[];
}

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId?: string;
  onSelectSession: (session: ChatSession) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onClearAllSessions: () => void;
}

export function ChatHistoryModal({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearAllSessions,
}: ChatHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] bg-white dark:bg-[#0D1C17] border border-zinc-200 dark:border-[#1E3B2F] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-[#162E25] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B7A5A]/10 dark:bg-[#0B7A5A]/20 flex items-center justify-center text-[#0B7A5A] dark:text-[#3EE0A8]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Chat History
              </h2>
              <p className="text-xs text-zinc-500">
                {sessions.length === 0
                  ? "No previous conversations saved"
                  : `${sessions.length} conversation${sessions.length > 1 ? "s" : ""} saved`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0B7A5A] hover:bg-[#086147] text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#12241E] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-[#12241E] flex items-center justify-center mx-auto text-zinc-400">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                No past chats yet
              </p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Whenever you talk to Beryl, your conversations are automatically saved here so you can revisit them anytime.
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const userMessages = session.messages.filter((m: any) => m.sender === "user");
              const lastUserMessage = userMessages[userMessages.length - 1]?.text;
              const timeStr = session.updatedAt
                ? new Date(session.updatedAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recent";

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session);
                    onClose();
                  }}
                  className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isActive
                      ? "bg-[#0B7A5A]/5 dark:bg-[#0B7A5A]/15 border-[#0B7A5A]/40 dark:border-[#3EE0A8]/40"
                      : "bg-white dark:bg-[#07100D] border-zinc-200 dark:border-[#162E25] hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {session.title || "Shopping Chat"}
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#0B7A5A]/10 text-[#0B7A5A] dark:text-[#3EE0A8] dark:bg-[#0B7A5A]/20">
                          Active
                        </span>
                      )}
                    </div>
                    {lastUserMessage && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {lastUserMessage}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                      <span>{session.messages.length} messages</span>
                      <span>·</span>
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => onDeleteSession(session.id, e)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-80 group-hover:opacity-100"
                      title="Delete this chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {sessions.length > 0 && (
          <div className="px-6 py-3 border-t border-zinc-200 dark:border-[#162E25] bg-zinc-50 dark:bg-[#07100D] flex items-center justify-between text-xs text-zinc-500">
            <span>Conversations are securely saved in your browser</span>
            <button
              type="button"
              onClick={onClearAllSessions}
              className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer"
            >
              Clear all history
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
