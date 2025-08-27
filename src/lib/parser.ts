import { BankTransaction, PhonePeReceipt, TransactionMatch } from './types'

/**
 * Parse a bank statement file (CSV or Excel) and extract transactions
 */
export async function parseBankStatement(file: File): Promise<BankTransaction[]> {
  const text = await file.text()
  
  if (file.name.toLowerCase().endsWith('.csv')) {
    return parseCSV(text)
  } else {
    // For Excel files, we'll use a simplified CSV-like parsing
    // In a real implementation, you might want to use a library like xlsx
    throw new Error('Excel files not yet supported. Please convert to CSV format.')
  }
}

export function parseCSV(csvText: string): BankTransaction[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  
  const transactions: BankTransaction[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    if (values.length < 3) continue
    
    const dateIndex = headers.findIndex(h => h.includes('date'))
    const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('debit'))
    const descIndex = headers.findIndex(h => h.includes('desc') || h.includes('narration'))
    const utrIndex = headers.findIndex(h => h.includes('utr') || h.includes('ref'))
    
    if (dateIndex === -1 || amountIndex === -1) continue
    
    const transaction: BankTransaction = {
      id: `bank_${Date.now()}_${i}`,
      date: parseDate(values[dateIndex]),
      amount: parseFloat(values[amountIndex].replace(/[^\d.-]/g, '')),
      description: values[descIndex] || values[1] || '',
      utr: utrIndex !== -1 ? values[utrIndex] : undefined
    }
    
    if (!isNaN(transaction.amount) && transaction.amount > 0) {
      transactions.push(transaction)
    }
  }
  
  return transactions
}

export function parseDate(dateStr: string): string {
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{1,2})-(\d{1,2})-(\d{4})/
  ]
  
  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      const [, a, b, c] = match
      if (c.length === 4) {
        return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
      }
    }
  }
  
  return new Date().toISOString().split('T')[0]
}

export function extractReceiptData(text: string): Partial<PhonePeReceipt> {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  
  let amount = 0
  let merchant = ''
  let utr = ''
  let date = ''
  
  // Enhanced patterns for PhonePe receipts
  const amountPatterns = [
    /₹\s*([\d,]+(?:\.\d{1,2})?)/g,  // ₹1,250.00 or ₹1250
    /(?:Amount|Paid|Rs\.?)\s*:?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /(?:Total|Amount)\s+₹\s*([\d,]+(?:\.\d{1,2})?)/gi
  ]
  
  const utrPatterns = [
    /(?:UPI Transaction ID|Transaction ID|Txn ID|UTR|Reference)\s*:?\s*(\d{12})/gi,
    /(\d{12})/g  // Any 12-digit number as fallback
  ]
  
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/g,     // DD/MM/YYYY
    /(\d{1,2}-\d{1,2}-\d{4})/g,      // DD-MM-YYYY  
    /(\d{4}-\d{1,2}-\d{1,2})/g,      // YYYY-MM-DD
    /(\d{1,2}\s+\w+\s+\d{4})/g       // 15 Dec 2023
  ]
  
  const merchantPatterns = [
    /(?:To|Merchant|Paid to)\s*:?\s*([A-Za-z0-9\s&.'-]+)$/gmi,
    /^([A-Za-z][A-Za-z0-9\s&.'-]{2,30})$/gm  // Line that looks like merchant name
  ]
  
  const fullText = text.toLowerCase()
  
  // Extract amount
  for (const pattern of amountPatterns) {
    const matches = Array.from(text.matchAll(pattern))
    for (const match of matches) {
      const extractedAmount = parseFloat(match[1].replace(/,/g, ''))
      if (!isNaN(extractedAmount) && extractedAmount > 0) {
        amount = Math.max(amount, extractedAmount) // Take the largest amount found
      }
    }
  }
  
  // Extract UTR/Transaction ID
  for (const pattern of utrPatterns) {
    const matches = Array.from(text.matchAll(pattern))
    if (matches.length > 0) {
      utr = matches[0][1]
      break
    }
  }
  
  // Extract date
  for (const pattern of datePatterns) {
    const matches = Array.from(text.matchAll(pattern))
    if (matches.length > 0) {
      date = parseDate(matches[0][1])
      break
    }
  }
  
  // Extract merchant name - more sophisticated approach
  const excludeWords = ['phonepe', 'payment', 'successful', 'paid', 'amount', 'total', 'transaction', 'upi', 'date', 'from', 'via', 'receipt', 'id', 'ref']
  
  for (const line of lines) {
    if (line.length < 3 || line.length > 50) continue
    
    const cleanLine = line.toLowerCase()
    
    // Skip lines that contain excluded words or patterns
    if (excludeWords.some(word => cleanLine.includes(word))) continue
    if (cleanLine.match(/[₹@]/)) continue
    if (cleanLine.match(/\d{6,}/)) continue // Skip lines with long numbers
    if (cleanLine.match(/^\d+$/)) continue // Skip pure numbers
    
    // Look for lines that might be merchant names
    if (line.match(/^[A-Za-z][A-Za-z0-9\s&.'-]{2,}$/)) {
      merchant = line
      break
    }
  }
  
  // Enhanced merchant extraction using patterns
  if (!merchant) {
    for (const pattern of merchantPatterns) {
      const matches = Array.from(text.matchAll(pattern))
      if (matches.length > 0) {
        const extractedMerchant = matches[0][1].trim()
        if (extractedMerchant.length > 2 && extractedMerchant.length < 50) {
          merchant = extractedMerchant
          break
        }
      }
    }
  }
  
  // Apply common merchant name corrections
  merchant = cleanMerchantName(merchant)
  
  return {
    amount: amount || 0,
    merchant: merchant || 'Unknown Merchant',
    utr,
    date: date || new Date().toISOString().split('T')[0]
  }
}

/**
 * Clean and standardize merchant names
 */
function cleanMerchantName(merchant: string): string {
  if (!merchant) return ''
  
  // Remove common prefixes/suffixes
  let cleaned = merchant
    .replace(/^(To:|Paid to:|Merchant:)/gi, '')
    .replace(/\s+(Online|Digital|Payments?|Services?)$/gi, '')
    .trim()
  
  // Capitalize first letter of each word
  cleaned = cleaned.replace(/\b\w+/g, word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  )
  
  // Handle common merchant aliases
  const merchantAliases = {
    'Swiggy': ['swgy', 'swiggy online'],
    'Zomato': ['zomato online', 'zomato digital'],
    'Amazon': ['amazon pay', 'amazon payments', 'amzn'],
    'Flipkart': ['flipkart pay', 'fkrt'],
    'Paytm': ['paytm payments'],
    'Google Pay': ['gpay', 'google payments'],
    'Uber': ['uber india', 'uber technologies'],
    'Ola': ['ola cabs', 'ola mobility']
  }
  
  for (const [standard, aliases] of Object.entries(merchantAliases)) {
    if (aliases.some(alias => cleaned.toLowerCase().includes(alias.toLowerCase()))) {
      return standard
    }
  }
  
  return cleaned
}

export function matchTransactions(
  bankTransactions: BankTransaction[],
  receipts: PhonePeReceipt[]
): TransactionMatch[] {
  const matches: TransactionMatch[] = []
  
  for (const bankTx of bankTransactions) {
    if (bankTx.matched) continue
    
    let bestMatch: PhonePeReceipt | undefined
    let bestScore = 0
    let matchReasons: string[] = []
    
    for (const receipt of receipts) {
      if (receipt.matched) continue
      
      let score = 0
      const reasons: string[] = []
      
      if (Math.abs(bankTx.amount - receipt.amount) < 0.01) {
        score += 50
        reasons.push('Exact amount match')
      }
      
      if (bankTx.date === receipt.date) {
        score += 30
        reasons.push('Same date')
      } else {
        const bankDate = new Date(bankTx.date)
        const receiptDate = new Date(receipt.date)
        const daysDiff = Math.abs((bankDate.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff <= 1) {
          score += 20
          reasons.push('Date within 1 day')
        }
      }
      
      if (bankTx.utr && receipt.utr && bankTx.utr === receipt.utr) {
        score += 40
        reasons.push('UTR match')
      }
      
      if (score > bestScore && score >= 50) {
        bestMatch = receipt
        bestScore = score
        matchReasons = reasons
      }
    }
    
    matches.push({
      bankTransaction: bankTx,
      suggestedReceipt: bestMatch,
      matchScore: bestScore,
      matchReasons,
      status: 'pending'
    })
  }
  
  return matches.sort((a, b) => b.matchScore - a.matchScore)
}