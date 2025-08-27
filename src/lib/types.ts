export interface BankTransaction {
  id: string
  date: string
  amount: number
  utr?: string
  vpa?: string
  description: string
  city?: string
  category?: Category
  matched?: boolean
  matchedReceiptId?: string
}

export interface PhonePeReceipt {
  id: string
  date: string
  amount: number
  utr?: string
  merchant: string
  category?: Category
  imageUrl?: string
  extractedData: {
    confidence: number
    rawText: string
  }
  matched?: boolean
}

export interface TransactionMatch {
  bankTransaction: BankTransaction
  suggestedReceipt?: PhonePeReceipt
  matchScore: number
  matchReasons: string[]
  status: 'pending' | 'approved' | 'rejected'
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'viewer' | 'editor'
}

export const CATEGORIES = [
  'Food & Dining',
  'Travel & Transport',
  'Utilities & Bills',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Education',
  'Miscellaneous'
] as const

export type Category = typeof CATEGORIES[number]