"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Send, X, Sparkles, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const sendMessage = useCallback(
    async (userMessage: string) => {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage,
      }

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      const assistantId = `assistant-${Date.now()}`
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }])

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to send message")
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error("No response body")

        let fullContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n").filter((line) => line.trim())

          for (const line of lines) {
            // Parse AI SDK data stream format: 0:"content"
            if (line.startsWith("0:")) {
              try {
                const content = JSON.parse(line.slice(2))
                fullContent += content
                setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)))
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        console.error("[v0] Chat error:", error)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "Sorry, I encountered an error. Please try again." } : m,
          ),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [messages],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput("")
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105 z-50",
          "bg-emerald-600 hover:bg-emerald-700 text-primary-foreground",
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-[380px] transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none",
        )}
      >
        <Card className="border-border shadow-2xl overflow-hidden">
          {/* Header */}
          <CardHeader className="bg-emerald-600 text-primary-foreground p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-emerald-400">
                <AvatarFallback className="bg-emerald-500 text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">Sparkle Assistant</h3>
                <p className="text-sm text-emerald-100">Your cleaning service helper</p>
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="p-0">
            <ScrollArea className="h-[350px] p-4" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mb-4 text-emerald-500" />
                  <p className="font-medium">Welcome!</p>
                  <p className="text-sm mt-1">How can I help you with our cleaning services today?</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                    >
                      {message.role === "assistant" && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700">
                            <Sparkles className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2 max-w-[75%] text-sm",
                          message.role === "user"
                            ? "bg-emerald-600 text-primary-foreground"
                            : "bg-muted text-foreground",
                        )}
                      >
                        {message.content || (
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                          </div>
                        )}
                      </div>
                      {message.role === "user" && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <CardFooter className="p-3 border-t border-border">
            <form onSubmit={handleSubmit} className="flex gap-2 w-full">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about our cleaning services..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-primary-foreground shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
