"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send, Bot, User, ChevronDown, ChevronRight, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: Array<{
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface ChatProps {
  documentId: string;
}

export function Chat({ documentId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleToolCall = (toolCallId: string) => {
    setExpandedToolCalls((prev) => {
      const next = new Set(prev);
      if (next.has(toolCallId)) {
        next.delete(toolCallId);
      } else {
        next.add(toolCallId);
      }
      return next;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load existing messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/chat/messages?documentId=${encodeURIComponent(documentId)}`);
        if (response.ok) {
          const data = await response.json();
          const loadedMessages: Message[] = data.messages
            .filter((msg: any) => msg.role !== "system") // Filter out system messages
            .map((msg: any) => {
              let toolCalls: Message["toolCalls"] = undefined;
              if (msg.toolCalls) {
                // toolCalls is stored as JSON in the database, Prisma returns it as parsed object/array
                if (Array.isArray(msg.toolCalls)) {
                  toolCalls = msg.toolCalls;
                } else if (msg.toolCalls && typeof msg.toolCalls === "object") {
                  // If it's a single object, wrap it in an array
                  toolCalls = [msg.toolCalls];
                }
              }
              return {
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content,
                toolCalls,
              };
            });
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [documentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message.content || "I couldn't generate a response.",
        toolCalls: data.toolCalls,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Document Chat
        </CardTitle>
        <CardDescription>
          Ask questions about this document. I can search through the content and extracted data.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-50 animate-pulse" />
              <p className="text-sm">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Start a conversation by asking a question about the document.</p>
              <p className="text-xs mt-2">Try: "What information was extracted?" or "Summarize the key points"</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="space-y-2">
                {message.role === "user" ? (
                  <div className="flex gap-3 justify-end">
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary text-primary-foreground">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className="shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-start">
                    <div className="shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="max-w-[80%] space-y-2">
                      {/* Tool Calls */}
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="space-y-1">
                          {message.toolCalls.map((toolCall) => {
                            const isExpanded = expandedToolCalls.has(toolCall.id);
                            let parsedArgs: any = {};
                            try {
                              parsedArgs = JSON.parse(toolCall.function.arguments || "{}");
                            } catch {
                              parsedArgs = { raw: toolCall.function.arguments };
                            }

                            return (
                              <div
                                key={toolCall.id}
                                className="rounded-lg border border-border/50 bg-muted/50 overflow-hidden"
                              >
                                <button
                                  onClick={() => toggleToolCall(toolCall.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/80 transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs font-medium text-foreground">
                                    {toolCall.function.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {Object.keys(parsedArgs).length > 0
                                      ? `${Object.keys(parsedArgs).length} arg${Object.keys(parsedArgs).length !== 1 ? "s" : ""}`
                                      : "no args"}
                                  </span>
                                </button>
                                {isExpanded && (
                                  <div className="px-3 pb-3 pt-1 border-t border-border/50 bg-background/50">
                                    <div className="mt-2 space-y-2">
                                      <div className="text-xs font-medium text-muted-foreground">
                                        Arguments:
                                      </div>
                                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                        {JSON.stringify(parsedArgs, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Message Content */}
                      <div className="rounded-lg px-4 py-2 bg-muted">
                        <div className="text-sm [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mt-3 [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mt-2 [&>h3]:mb-1 [&>p]:my-2 [&>ul]:my-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:my-2 [&>ol]:list-decimal [&>ol]:ml-4 [&>li]:my-1 [&>code]:bg-muted-foreground/10 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-xs [&>code]:font-mono [&>pre]:bg-muted-foreground/10 [&>pre]:border [&>pre]:border-border [&>pre]:rounded [&>pre]:p-2 [&>pre]:overflow-x-auto [&>pre]:my-2 [&>pre>code]:bg-transparent [&>pre>code]:p-0 [&>strong]:font-semibold [&>em]:italic [&>a]:text-primary [&>a]:underline">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary animate-pulse" />
                </div>
              </div>
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about the document..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

