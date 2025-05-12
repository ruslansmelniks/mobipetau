"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Send, Paperclip, Phone, Video, Search, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// Mock conversation data - in a real app, this would come from your backend
const conversations = [
  {
    id: "APT-25061001",
    pet: {
      name: "Twinnie",
      type: "Gray rabbit",
    },
    vet: {
      id: "v1",
      name: "Dr. Sarah Johnson",
      image: "/professional-woman-diverse.png",
      status: "online", // online, offline, away
    },
    service: "After hours home visit",
    lastMessageTime: "2025-06-08T14:52:00Z",
    messages: [
      {
        id: "1",
        sender: "vet",
        text: "Hello! I'll be your vet for the upcoming appointment. I see you've booked for Twinnie. Could you tell me more about what's concerning you?",
        timestamp: "2025-06-08T14:30:00Z",
      },
      {
        id: "2",
        sender: "owner",
        text: "Hi Dr. Johnson! Twinnie hasn't been eating much for the past two days and seems lethargic. I'm worried about her.",
        timestamp: "2025-06-08T14:35:00Z",
      },
      {
        id: "3",
        sender: "vet",
        text: "I understand your concern. Has Twinnie had any other symptoms like unusual droppings or difficulty breathing?",
        timestamp: "2025-06-08T14:38:00Z",
      },
      {
        id: "4",
        sender: "owner",
        text: "Her droppings have been smaller than usual, but I haven't noticed any breathing issues.",
        timestamp: "2025-06-08T14:42:00Z",
      },
      {
        id: "5",
        sender: "vet",
        text: "Thank you for that information. It could be a digestive issue, which is common in rabbits. I'll bring the necessary equipment to check her thoroughly. In the meantime, make sure fresh water is always available and monitor if she eats any hay.",
        timestamp: "2025-06-08T14:45:00Z",
      },
      {
        id: "6",
        sender: "owner",
        text: "Will do. She did nibble on some hay this morning, but not much.",
        timestamp: "2025-06-08T14:48:00Z",
      },
      {
        id: "7",
        sender: "vet",
        text: "That's actually a good sign. Keep offering small amounts of her favorite greens too. I'll see you tomorrow at 8 AM. If her condition worsens before then, please let me know immediately.",
        timestamp: "2025-06-08T14:52:00Z",
      },
    ],
  },
  {
    id: "APT-25052801",
    pet: {
      name: "Max",
      type: "Golden Retriever",
    },
    vet: {
      id: "v2",
      name: "Dr. Michael Chen",
      image: "/professional-man.png",
      status: "offline", // online, offline, away
    },
    service: "Regular checkup",
    lastMessageTime: "2025-05-26T10:35:00Z",
    messages: [
      {
        id: "1",
        sender: "vet",
        text: "Hello! I'm Dr. Chen and I'll be seeing Max for his regular checkup. Is there anything specific you'd like me to look at?",
        timestamp: "2025-05-26T10:15:00Z",
      },
      {
        id: "2",
        sender: "owner",
        text: "Hi Dr. Chen! Max has been scratching his ears a lot lately. Could you take a look at them during the checkup?",
        timestamp: "2025-05-26T10:20:00Z",
      },
      {
        id: "3",
        sender: "vet",
        text: "Absolutely, I'll make sure to examine his ears thoroughly. Ear issues are common in Golden Retrievers. Has he been swimming recently?",
        timestamp: "2025-05-26T10:25:00Z",
      },
      {
        id: "4",
        sender: "owner",
        text: "Yes, we took him to the lake last weekend. Could that be related?",
        timestamp: "2025-05-26T10:30:00Z",
      },
      {
        id: "5",
        sender: "vet",
        text: "It's possible. Water trapped in the ears can lead to infections. I'll check for that specifically. See you tomorrow at 2 PM!",
        timestamp: "2025-05-26T10:35:00Z",
      },
    ],
  },
  {
    id: "APT-25040501",
    pet: {
      name: "Whiskers",
      type: "Tabby Cat",
    },
    vet: {
      id: "v3",
      name: "Dr. Emily Rodriguez",
      image: "/professional-woman-diverse.png",
      status: "away", // online, offline, away
    },
    service: "Vaccination",
    lastMessageTime: "2025-04-05T15:20:00Z",
    messages: [
      {
        id: "1",
        sender: "vet",
        text: "Hello! I'll be administering Whiskers' vaccinations tomorrow. Just wanted to check if you have any questions before our appointment?",
        timestamp: "2025-04-05T15:10:00Z",
      },
      {
        id: "2",
        sender: "owner",
        text: "Hi Dr. Rodriguez! Will there be any side effects I should watch for after the vaccination?",
        timestamp: "2025-04-05T15:15:00Z",
      },
      {
        id: "3",
        sender: "vet",
        text: "Great question! Some cats may be a bit lethargic for 24-48 hours after vaccination. A small, firm lump at the injection site is also normal and should disappear within a few weeks. If you notice any vomiting, diarrhea, or difficulty breathing, please contact us immediately as these could indicate an allergic reaction.",
        timestamp: "2025-04-05T15:20:00Z",
      },
    ],
  },
]

export default function MessagesPage() {
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get("appointment") || conversations[0].id
  const [activeConversation, setActiveConversation] = useState(
    conversations.find((conv) => conv.id === appointmentId) || conversations[0],
  )
  const [newMessage, setNewMessage] = useState("")
  const [messages, setMessages] = useState(activeConversation.messages)
  const [searchTerm, setSearchTerm] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const conversation = conversations.find((conv) => conv.id === appointmentId) || conversations[0]
    setActiveConversation(conversation)
    setMessages(conversation.messages)
  }, [appointmentId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const newMsg = {
      id: `new-${Date.now()}`,
      sender: "owner",
      text: newMessage,
      timestamp: new Date().toISOString(),
    }

    setMessages([...messages, newMsg as any])
    setNewMessage("")

    // Simulate vet response after 1 second
    setTimeout(() => {
      const vetResponse = {
        id: `new-${Date.now() + 1}`,
        sender: "vet",
        text: "Thank you for your message. I'll get back to you as soon as possible.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, vetResponse as any])
    }, 1000)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
  }

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return formatTime(timestamp)
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "long" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-400"
      default:
        return "bg-gray-400"
    }
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.vet.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row h-[calc(100vh-12rem)] bg-white rounded-lg border shadow-sm overflow-hidden">
        {/* Left sidebar - Conversations list */}
        <div className="w-full md:w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filteredConversations.map((conversation) => {
                const isActive = conversation.id === activeConversation.id
                const lastMessage = conversation.messages[conversation.messages.length - 1]
                const lastMessagePreview =
                  lastMessage.text.length > 40 ? `${lastMessage.text.substring(0, 40)}...` : lastMessage.text

                return (
                  <button
                    key={conversation.id}
                    className={cn(
                      "w-full text-left p-4 hover:bg-gray-50 transition-colors",
                      isActive && "bg-gray-50 border-l-4 border-teal-500",
                    )}
                    onClick={() => setActiveConversation(conversation)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <Image
                            src={conversation.vet.image || "/placeholder.svg"}
                            alt={conversation.vet.name}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                            getStatusColor(conversation.vet.status),
                          )}
                        ></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-medium truncate">{conversation.vet.name}</h3>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatLastMessageTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{lastMessagePreview}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {conversation.pet.name} • {conversation.service}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right side - Chat window */}
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                  <Image
                    src={activeConversation.vet.image || "/placeholder.svg"}
                    alt={activeConversation.vet.name}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium">{activeConversation.vet.name}</h2>
                    <span className={cn("w-2 h-2 rounded-full", getStatusColor(activeConversation.vet.status))}></span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span>{activeConversation.service}</span>
                    <span>•</span>
                    <span>
                      {activeConversation.pet.name} ({activeConversation.pet.type})
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-gray-500">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-500">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-500 md:hidden">
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Chat messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div className="flex justify-center my-4">
                <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full flex items-center">
                  <span className="mr-2">Appointment</span>
                  <span className="font-medium">{activeConversation.id}</span>
                </div>
              </div>

              {messages.map((message, index) => {
                const isOwner = message.sender === "owner"
                const showDate =
                  index === 0 ||
                  new Date(message.timestamp).toDateString() !== new Date(messages[index - 1].timestamp).toDateString()

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                          {formatDate(message.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", isOwner ? "justify-end" : "justify-start")}>
                      <div className="flex items-end gap-2 max-w-[80%]">
                        {!isOwner && (
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                              src={activeConversation.vet.image || "/placeholder.svg"}
                              alt={activeConversation.vet.name}
                              width={32}
                              height={32}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        )}
                        <div
                          className={cn(
                            "px-4 py-2 rounded-lg",
                            isOwner
                              ? "bg-teal-500 text-white rounded-br-none"
                              : "bg-gray-100 text-gray-800 rounded-bl-none",
                          )}
                        >
                          <p className="text-sm">{message.text}</p>
                          <span className={cn("text-xs mt-1 block", isOwner ? "text-teal-50" : "text-gray-500")}>
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Chat input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="text-gray-500">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim()}
                className="bg-[#4e968f] hover:bg-[#43847e] text-white"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
