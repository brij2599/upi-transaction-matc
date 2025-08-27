import { BankTransaction, PhonePeReceipt, TransactionMatch } from './types'

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
  
  for (const line of lines) {
    if (line.match(/₹\s*[\d,]+/)) {
      const match = line.match(/₹\s*([\d,]+(?:\.\d{2})?)/)
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''))
      }
    }
    
    if (line.match(/\d{12}/)) {
      utr = line.match(/(\d{12})/)?.[1] || ''
    }
    
    if (line.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
      date = parseDate(line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] || '')
    }
    
    if (!merchant && line.length > 3 && !line.includes('PhonePe') && !line.includes('₹') && !line.match(/\d{6,}/)) {
      merchant = line
    }
  }
  
  return {
    amount: amount || 0,
    merchant: merchant || 'Unknown Merchant',
    utr,
    date: date || new Date().toISOString().split('T')[0]
  }
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