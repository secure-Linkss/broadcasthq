"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Phone, Send, Paperclip, MoreVertical, CheckCircle2, UserCircle2, Clock, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Conversation {
  contactId: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  lastMessage: string | null;
  lastStatus: string;
  sentAt: string;
  readAt: string | null;
}

interface Message {
  id: string;
  content: string | null;
  status: string;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  errorReason: string | null;
}

function contactName(c: Conversation) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.phone;
}

function formatTime(isoDate: string) {
  const d = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const [activeTab, setActiveTab]         = useState<"messages" | "notes">("messages");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [activeConv, setActiveConv]       = useState<Conversation | null>(null);
  const [loadingList, setLoadingList]     = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [search, setSearch]               = useState("");

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/inbox");
      const data = await res.json();
      const convs: Conversation[] = data.conversations ?? [];
      setConversations(convs);
      if (convs.length > 0 && !activeConv) setActiveConv(convs[0]);
    } catch {
      // keep empty state
    } finally {
      setLoadingList(false);
    }
  }, [activeConv]);

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (!activeConv) return;
    setLoadingThread(true);
    fetch(`/api/inbox/${activeConv.contactId}`)
      .then(r => r.json())
      .then(data => setMessages(data.messages ?? []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingThread(false));
  }, [activeConv?.contactId]);

  const filtered = conversations.filter(c =>
    search === "" ||
    contactName(c).toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex border border-border rounded-xl overflow-hidden bg-card">
      {/* Left Panel: Conversation List */}
      <div className="w-80 flex flex-col border-r border-border bg-card/50">
        <div className="p-4 border-b border-border space-y-4">
          <h2 className="font-bold text-lg">Inbox</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9 bg-background"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20">
              All ({conversations.length})
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 border-b border-border flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))
            : filtered.length === 0
              ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                  <p>No conversations yet.</p>
                  <p className="text-xs mt-1">Messages from campaigns appear here.</p>
                </div>
              )
              : filtered.map(conv => (
                <div
                  key={conv.contactId}
                  onClick={() => setActiveConv(conv)}
                  className={cn(
                    "p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors flex gap-3",
                    activeConv?.contactId === conv.contactId ? "bg-muted/50 border-l-2 border-l-primary" : ""
                  )}
                >
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback>{contactName(conv).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-sm font-medium text-foreground truncate">{contactName(conv)}</h4>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatTime(conv.sentAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage ?? "—"}</p>
                  </div>
                  {conv.lastStatus === "failed" && (
                    <div className="h-2 w-2 rounded-full bg-red-500 shrink-0 mt-1" />
                  )}
                </div>
              ))
          }
        </div>
      </div>

      {/* Middle Panel: Chat Thread */}
      <div className="flex-1 flex flex-col bg-[#0b1020]">
        {activeConv ? (
          <>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback>{contactName(activeConv).charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm">{contactName(activeConv)}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {activeConv.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Open</Badge>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingThread
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={cn("flex flex-col max-w-[70%]", i % 2 === 0 ? "" : "ml-auto items-end")}>
                      <Skeleton className="h-12 w-56 rounded-2xl" />
                    </div>
                  ))
                : messages.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                      <p className="text-sm">No messages in this thread.</p>
                    </div>
                  )
                  : messages.map(msg => (
                    <div key={msg.id} className="flex flex-col max-w-[75%] ml-auto items-end">
                      <span className="text-[10px] text-muted-foreground mb-1 mr-1 flex items-center gap-1">
                        <UserCircle2 className="h-3 w-3" /> Broadcast
                      </span>
                      <div className="p-3 rounded-2xl rounded-tr-sm text-sm bg-primary/20 border border-primary/30 text-foreground">
                        {msg.content ?? "—"}
                      </div>
                      <div className="flex items-center gap-1 mt-1 mr-1">
                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.sentAt)}</span>
                        {msg.readAt && <CheckCircle2 className="h-3 w-3 text-primary" />}
                        {msg.status === "failed" && <span className="text-[10px] text-red-500">Failed</span>}
                      </div>
                    </div>
                  ))
              }
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2 mb-2">
                <button
                  className={cn("text-xs font-medium px-3 py-1.5 rounded-md transition-colors", activeTab === "messages" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                  onClick={() => setActiveTab("messages")}
                >
                  Reply
                </button>
                <button
                  className={cn("text-xs font-medium px-3 py-1.5 rounded-md transition-colors", activeTab === "notes" ? "bg-yellow-500/10 text-yellow-500" : "text-muted-foreground hover:bg-muted")}
                  onClick={() => setActiveTab("notes")}
                >
                  Internal Note
                </button>
              </div>
              <div className={cn(
                "flex items-end gap-2 p-2 border rounded-xl bg-background focus-within:ring-1 focus-within:ring-primary transition-shadow",
                activeTab === "notes" ? "border-yellow-500/50 bg-yellow-500/5" : "border-border"
              )}>
                <Button variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground hover:text-foreground">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <textarea
                  className="flex-1 bg-transparent border-0 resize-none outline-none min-h-[40px] max-h-[120px] text-sm py-2"
                  placeholder={activeTab === "messages" ? "Type a message..." : "Internal note (customer won't see this)..."}
                  rows={1}
                />
                <Button size="icon" className="shrink-0 rounded-full">
                  <Send className="h-4 w-4 ml-0.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Replies are sent via WhatsApp Business API. Contact must have messaged you first (24h window).
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Choose a contact from the left panel.</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Contact Details */}
      {activeConv && (
        <div className="w-64 border-l border-border bg-card hidden lg:block overflow-y-auto">
          <div className="p-6 text-center border-b border-border">
            <Avatar className="h-20 w-20 mx-auto mb-4 border-2 border-primary/20">
              <AvatarFallback className="text-2xl">{contactName(activeConv).charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <h3 className="font-bold">{contactName(activeConv)}</h3>
            <p className="text-sm text-muted-foreground mt-1">{activeConv.phone}</p>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-mono text-xs">{activeConv.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last msg</span>
                  <span className="text-xs">{formatTime(activeConv.sentAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Read</span>
                  <span className="text-xs">{activeConv.readAt ? formatTime(activeConv.readAt) : "—"}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Activity</h4>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="mt-0.5">
                    {activeConv.readAt
                      ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                      : <Clock className="h-3 w-3 text-primary" />
                    }
                  </div>
                  <div>
                    <p className="text-xs font-medium">{activeConv.readAt ? "Read message" : "Delivered"}</p>
                    <p className="text-[10px] text-muted-foreground">{formatTime(activeConv.sentAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
