import api from './api'

export interface Message {
  _id: string
  senderId: string
  receiverId: string
  text: string
  read: boolean
  createdAt: string
}

export interface Conversation {
  userId: string
  name: string
  role: string
  lastMessage?: string
  lastMessageTime?: string
  unread: number
}

// Get conversation between current user and another user
export const getConversation = async (otherUserId: string): Promise<Message[]> => {
  const res = await api.get('/messages', { params: { otherUserId } })
  return res.data?.data || res.data || []
}

// Send a message
export const sendMessage = async (receiverId: string, text: string): Promise<Message> => {
  const res = await api.post('/messages', { receiverId, text })
  return res.data
}

// Get all conversations (unique participants)
export const getConversationList = async (): Promise<Message[]> => {
  const res = await api.get('/messages')
  return res.data?.data || res.data || []
}
