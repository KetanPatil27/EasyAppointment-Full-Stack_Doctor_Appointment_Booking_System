'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DoctorSidebar } from '@/components/doctor-sidebar'
import { useApp } from '@/lib/app-context'
import { getConversation, getConversationList, sendMessage, Message } from '@/services/messageService'
import { Send, User, Loader2, MessageSquare } from 'lucide-react'
import api from '@/services/api'

interface Contact {
  userId: string
  name: string
  lastMessage?: string
}

export default function DoctorMessagesPage() {
  const { currentUser, isAuthenticated } = useApp()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { router.push('/login'); return }
    if (currentUser.role !== 'doctor') { router.push('/'); return }
    loadContacts()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [currentUser, isAuthenticated])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!selectedContact) return
    loadConversation(selectedContact.userId)
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => loadConversation(selectedContact.userId), 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedContact])

  const loadContacts = async () => {
    setLoading(true)
    try {
      // Fetch all messages this doctor has sent or received
      const allMessages = await getConversationList()
      const myId = currentUser?._id

      // Extract unique partner IDs (the other person in each conversation)
      const partnerIds: string[] = []
      const seen = new Set<string>()
      for (const m of allMessages) {
        const otherId = m.senderId === myId ? m.receiverId : m.senderId
        if (!seen.has(otherId)) {
          seen.add(otherId)
          partnerIds.push(otherId)
        }
      }

      if (partnerIds.length === 0) {
        setContacts([])
        setLoading(false)
        return
      }

      // Fetch names for each partner
      const contactData: Contact[] = await Promise.all(
        partnerIds.map(async (uid) => {
          try {
            const res = await api.get(`/users/${uid}`)
            // Get the last message in conversation with this user
            const conv = allMessages.filter(
              m => (m.senderId === uid && m.receiverId === myId) ||
                   (m.senderId === myId && m.receiverId === uid)
            )
            const last = conv[conv.length - 1]
            return { userId: uid, name: res.data.name || 'Patient', lastMessage: last?.text }
          } catch {
            return { userId: uid, name: 'Patient' }
          }
        })
      )
      setContacts(contactData)
    } catch (err) {
      console.error('Failed to load contacts:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadConversation = async (userId: string) => {
    try {
      const data = await getConversation(userId)
      // Sort oldest first for chat display
      const sorted = [...data].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      setMessages(sorted)
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedContact || sending) return
    setSending(true)
    try {
      const msg = await sendMessage(selectedContact.userId, newMessage.trim())
      setMessages(prev => [...prev, msg])
      setNewMessage('')
      // Update last message in contact list
      setContacts(prev => prev.map(c =>
        c.userId === selectedContact.userId ? { ...c, lastMessage: newMessage.trim() } : c
      ))
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DoctorSidebar />
      <div className="flex-1 flex overflow-hidden ml-0 pt-14 lg:ml-64 lg:pt-0">

        {/* Contacts panel */}
        <div className="w-72 border-r border-border bg-card flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-5 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Messages</h2>
            <p className="text-xs text-foreground/50 mt-0.5">Patient conversations</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-10 w-10 text-foreground/15 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground/50">No conversations yet</p>
                <p className="text-xs text-foreground/35 mt-1">Patients can message you from the Messages page</p>
              </div>
            ) : (
              contacts.map(contact => (
                <button
                  key={contact.userId}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full flex items-center gap-3 px-4 py-4 border-b border-border/60 text-left hover:bg-muted/50 transition-colors ${
                    selectedContact?.userId === contact.userId
                      ? 'bg-primary/8 border-l-2 border-l-primary'
                      : ''
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{contact.name}</p>
                    {contact.lastMessage && (
                      <p className="text-xs text-foreground/50 truncate mt-0.5">{contact.lastMessage}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedContact ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-border bg-card flex items-center gap-3 shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedContact.name}</p>
                  <p className="text-xs text-foreground/50">Patient</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-foreground/40 text-sm">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.senderId === currentUser?._id
                    return (
                      <div key={msg._id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        }`}>
                          <p>{msg.text}</p>
                          <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-foreground/45'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border bg-card shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-14 w-14 text-foreground/15 mx-auto mb-4" />
                <p className="text-foreground/50 font-medium">Select a patient to view messages</p>
                <p className="text-foreground/35 text-sm mt-1">Your conversations will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
