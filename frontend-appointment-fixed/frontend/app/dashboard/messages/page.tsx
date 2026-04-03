'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { useApp } from '@/lib/app-context'
import { getConversation, getConversationList, sendMessage, Message } from '@/services/messageService'
import { getAllDoctors } from '@/services/doctorService'
import { Send, Search, User, Loader2, MessageSquare } from 'lucide-react'

interface Contact {
  userId: string
  name: string
  role: string
  lastMessage?: string
  unreadCount: number
}

export default function MessagesPage() {
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
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isAuthenticated || !currentUser) { router.push('/login'); return }
    loadContacts()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [currentUser, isAuthenticated])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (selectedContact) {
      loadConversation(selectedContact.userId)
      // Poll for new messages every 5 seconds
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(() => loadConversation(selectedContact.userId), 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedContact])

  const loadContacts = async () => {
    setLoading(true)
    try {
      if (currentUser?.role === 'patient') {
        // Patient only sees doctors they have appointments with
        const { getMyAppointments } = await import('@/services/appointmentService')
        const myAppointments = await getMyAppointments()
        const uniqueDoctorIds = [...new Set(myAppointments.map((a: any) => a.doctorId))]

        // If no appointments, no contacts
        if (uniqueDoctorIds.length === 0) {
          setContacts([])
          return
        }

        // Fetch those specific doctors via Feathers $in array syntax (needs [])
        const filterStr = (uniqueDoctorIds as string[]).map(id => `userId[$in][]=${id}`).join('&')
        const { default: api } = await import('@/services/api')
        const res = await api.get(`/doctors?${filterStr}&$limit=50`)
        const doctors = res.data?.data || res.data || []
        
        const allMessages = await getConversationList()

        setContacts(doctors.map((d: any) => {
          const convMessages = allMessages.filter((m: Message) =>
            (m.senderId === d.userId || m.receiverId === d.userId)
          )
          const last = convMessages[convMessages.length - 1]
          const unread = convMessages.filter((m: Message) => m.senderId === d.userId && !m.read).length
          return {
            userId: d.userId,
            name: `Dr. ${d.name || 'Unknown'}`,
            role: 'doctor',
            lastMessage: last?.text,
            unreadCount: unread
          }
        }))
      } else {
        // Doctor sees all their patients from messages
        const allMessages = await getConversationList()
        const uniqueUserIds = [...new Set(allMessages.map((m: Message) =>
          m.senderId === currentUser?._id ? m.receiverId : m.senderId
        ))]
        setContacts(uniqueUserIds.map(uid => ({
          userId: uid,
          name: 'Patient',
          role: 'patient',
          lastMessage: allMessages.find((m: Message) => m.senderId === uid || m.receiverId === uid)?.text,
          unreadCount: allMessages.filter((m: Message) => m.senderId === uid && !m.read).length
        })))
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadConversation = async (userId: string) => {
    try {
      const data = await getConversation(userId)
      // Sort oldest first for chat display
      const sorted = [...data].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      setMessages(sorted)
    } catch (err) { console.error(err) }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedContact || sending) return
    setSending(true)
    try {
      const msg = await sendMessage(selectedContact.userId, newMessage.trim())
      setMessages(prev => [...prev, msg])
      setNewMessage('')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex overflow-hidden ml-0 pt-14 lg:ml-64 lg:pt-0">
        {/* Contacts List */}
        <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-sm text-foreground/50">
                No contacts yet
              </div>
            ) : (
              filteredContacts.map(contact => (
                <button
                  key={contact.userId}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full flex items-center gap-3 px-4 py-4 border-b border-border text-left hover:bg-muted/50 transition-colors ${
                    selectedContact?.userId === contact.userId ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground text-sm truncate">{contact.name}</p>
                      {contact.unreadCount > 0 && (
                        <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center shrink-0">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                    {contact.lastMessage && (
                      <p className="text-xs text-foreground/50 truncate mt-0.5">{contact.lastMessage}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-border bg-card flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedContact.name}</p>
                  <p className="text-xs text-foreground/50 capitalize">{selectedContact.role}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-foreground/40 text-sm">Start a conversation...</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.senderId === currentUser?._id
                    return (
                      <div key={msg._id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        }`}>
                          <p>{msg.text}</p>
                          <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-foreground/50'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-3">
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
                    className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
                <p className="text-foreground/50">Select a contact to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
