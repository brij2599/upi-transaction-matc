import type { BankTransaction, PhonePeReceipt, TransactionMatch } from './types'

/**
 * Transaction matching service that finds potential PhonePe receipt matches 
 * for bank transactions using multiple criteria and scoring
 */

interface MatchCriteria {
  exactAmountMatch: boolean
  dateMatch: boolean
  utrMatch: boolean
  merchantMatch: boolean
}

/**
 * Calculate match score between a bank transaction and PhonePe receipt
 */
function calculateMatchScore(
  bankTxn: BankTransaction, 
  receipt: PhonePeReceipt,
  criteria: MatchCriteria
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  
  // Exact amount match (highest weight - 40 points)
  if (criteria.exactAmountMatch) {
    score += 40
    reasons.push('Exact amount match')
  }
  
  // Date match (30 points)
  if (criteria.dateMatch) {
    score += 30
    reasons.push('Date match')
  }
  
  // UTR match (25 points) - strongest identifier when available
  if (criteria.utrMatch) {
    score += 25
    reasons.push('UTR match')
  }
  
  // Merchant/description similarity (15 points)
  if (criteria.merchantMatch) {
    score += 15
    reasons.push('Merchant match')
  }
  
  return { score, reasons }
}

/**
 * Check if two dates are the same day
 */
function isSameDate(date1: string, date2: string): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return d1.toDateString() === d2.toDateString()
}

/**
 * Check if merchant name matches transaction description
 * Simple fuzzy matching using lowercase and word overlap
 */
function checkMerchantMatch(description: string, merchant: string): boolean {
  if (!description || !merchant) return false
  
  const descWords = description.toLowerCase().split(/\s+/)
  const merchantWords = merchant.toLowerCase().split(/\s+/)
  
  // Check for any word overlap
  return merchantWords.some(word => 
    word.length > 3 && descWords.some(descWord => 
      descWord.includes(word) || word.includes(descWord)
    )
  )
}

/**
 * Find the best matching receipt for a bank transaction
 */
function findBestMatch(
  bankTxn: BankTransaction, 
  receipts: PhonePeReceipt[]
): { receipt: PhonePeReceipt; score: number; reasons: string[] } | null {
  let bestMatch: { receipt: PhonePeReceipt; score: number; reasons: string[] } | null = null
  
  for (const receipt of receipts) {
    // Skip already matched receipts
    if (receipt.matched) continue
    
    const criteria: MatchCriteria = {
      exactAmountMatch: Math.abs(bankTxn.amount - receipt.amount) < 0.01,
      dateMatch: isSameDate(bankTxn.date, receipt.date),
      utrMatch: !!(bankTxn.utr && receipt.utr && bankTxn.utr === receipt.utr),
      merchantMatch: checkMerchantMatch(bankTxn.description, receipt.merchant)
    }
    
    const { score, reasons } = calculateMatchScore(bankTxn, receipt, criteria)
    
    // Only consider matches with minimum score threshold
    if (score >= 40 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { receipt, score, reasons }
    }
  }
  
  return bestMatch
}

/**
 * Generate transaction matches between bank statements and receipts
 */
export function generateMatches(
  bankTransactions: BankTransaction[], 
  receipts: PhonePeReceipt[]
): TransactionMatch[] {
  const matches: TransactionMatch[] = []
  
  // Filter out already matched transactions
  const unmatchedBankTxns = bankTransactions.filter(txn => !txn.matched)
  const availableReceipts = [...receipts] // Create copy to track matches
  
  for (const bankTxn of unmatchedBankTxns) {
    const bestMatch = findBestMatch(bankTxn, availableReceipts)
    
    if (bestMatch) {
      matches.push({
        bankTransaction: bankTxn,
        suggestedReceipt: bestMatch.receipt,
        matchScore: bestMatch.score,
        matchReasons: bestMatch.reasons,
        status: 'pending'
      })
      
      // Mark receipt as temporarily matched to avoid duplicates
      const receiptIndex = availableReceipts.findIndex(r => r.id === bestMatch.receipt.id)
      if (receiptIndex >= 0) {
        availableReceipts[receiptIndex] = { ...bestMatch.receipt, matched: true }
      }
    } else {
      // Include unmatched transactions too
      matches.push({
        bankTransaction: bankTxn,
        suggestedReceipt: undefined,
        matchScore: 0,
        matchReasons: ['No suitable match found'],
        status: 'pending'
      })
    }
  }
  
  return matches.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Apply approved matches to update transaction and receipt data
 */
export function applyMatches(
  matches: TransactionMatch[],
  bankTransactions: BankTransaction[],
  receipts: PhonePeReceipt[]
): { 
  updatedBankTransactions: BankTransaction[]; 
  updatedReceipts: PhonePeReceipt[] 
} {
  const approvedMatches = matches.filter(m => m.status === 'approved')
  
  const updatedBankTransactions = bankTransactions.map(txn => {
    const match = approvedMatches.find(m => m.bankTransaction.id === txn.id)
    if (match && match.suggestedReceipt) {
      return {
        ...txn,
        matched: true,
        matchedReceiptId: match.suggestedReceipt.id,
        category: txn.category || match.suggestedReceipt.category
      }
    }
    return txn
  })
  
  const updatedReceipts = receipts.map(receipt => {
    const match = approvedMatches.find(m => m.suggestedReceipt?.id === receipt.id)
    if (match) {
      return {
        ...receipt,
        matched: true
      }
    }
    return receipt
  })
  
  return { updatedBankTransactions, updatedReceipts }
}