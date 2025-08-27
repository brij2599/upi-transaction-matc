import * as XLSX from 'xlsx'
import { BankTransaction, PhonePeReceipt, TransactionMatch } from './types'

/**
 * Parse a bank statement file (CSV or Excel) and extract transactions
 */
export async function parseBankStatement(file: File): Promise<BankTransaction[]> {
  const lower = file.name.toLowerCase()

  if (lower.endsWith('.csv')) {
    const text = await file.text()
    return parseCSV(text)
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseExcel(file)
  }

  throw new Error('Unsupported file type. Please upload a CSV or Excel (.xlsx/.xls) file.')
}

/**
 * Parse CSV (simple splitter; assumes no embedded commas in quoted fields)
 */
export function parseCSV(csvText: string): BankTransaction[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => normalizeHeader(h))
  const transactions: BankTransaction[] = []

  // Precompute common column indices
  const idx = computeHeaderIndices(headers)

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())

    // Skip if line too short
    if (values.length < 2) continue

    const rawDate = pick(values, idx.date)
    if (!rawDate) continue

    const date = parseDate(rawDate)
    const description = pick(values, idx.description) || values[1] || ''
    const utrFromCol = pick(values, idx.utr)
    const debitStr = pick(values, idx.debit)
    const creditStr = pick(values, idx.credit)
    const amountStr = pick(values, idx.amount)

    const amount = normalizeAmount({ amountStr, debitStr, creditStr })

    // Try to enrich from UPI narration pattern
    const upi = parseUPINarration(description)
    const utr = utrFromCol || upi?.utr

    if (!isNaN(amount) && amount > 0) {
      transactions.push({
        id: `bank_${Date.now()}_${i}`,
        date,
        amount,
        description,
        utr,
        vpa: upi?.vpa,
        city: upi?.city
      })
    }
  }

  return transactions
}

/**
 * Parse Excel workbook using xlsx and map headers to canonical fields
 */
export async function parseExcel(file: File): Promise<BankTransaction[]> {
  const ab = await file.arrayBuffer()
  const wb = XLSX.read(ab, { type: 'array', cellDates: true })
  const firstSheetName = wb.SheetNames[0]
  if (!firstSheetName) return []

  const ws = wb.Sheets[firstSheetName]
  // Convert to JSON rows using the first row as headers
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, {
    defval: '',
    raw: false // format numbers/dates as strings; we’ll normalize below
  })

  if (rows.length === 0) return []

  const headerKeys = Object.keys(rows[0] || {}).map(k => k?.toString() ?? '')
  const headers = headerKeys.map(normalizeHeader)
  const idx = computeHeaderIndices(headers)

  const transactions: BankTransaction[] = []

  rows.forEach((row, i) => {
    const vals = headerKeys.map(k => row[k])

    const rawDate = pick(vals, idx.date)
    if (!rawDate) return

    const date = parseDate(rawDate)
    const description = (pick(vals, idx.description) as string) || ''
    const utrFromCol = (pick(vals, idx.utr) as string) || ''
    const debitStr = (pick(vals, idx.debit) as string) || ''
    const creditStr = (pick(vals, idx.credit) as string) || ''
    const amountStr = (pick(vals, idx.amount) as string) || ''

    const amount = normalizeAmount({ amountStr, debitStr, creditStr })

    // Enrich from UPI narration if present
    const upi = parseUPINarration(description)
    const utr = utrFromCol || upi?.utr

    if (!isNaN(amount) && amount > 0) {
      transactions.push({
        id: `bank_${Date.now()}_${i}`,
        date,
        amount,
        description,
        utr,
        vpa: upi?.vpa,
        city: upi?.city
      })
    }
  })

  return transactions
}

/**
 * Normalize amount based on amount/debit/credit columns, absolute value.
 * Preference: explicit amount > credit > debit
 */
function normalizeAmount(input: { amountStr?: string | number; debitStr?: string | number; creditStr?: string | number }): number {
  const a = toNumberOrNaN(input.amountStr)
  const c = toNumberOrNaN(input.creditStr)
  const d = toNumberOrNaN(input.debitStr)

  let chosen = NaN
  if (!isNaN(a) && a !== 0) chosen = a
  else if (!isNaN(c) && c !== 0) chosen = c
  else if (!isNaN(d) && d !== 0) chosen = d

  return isNaN(chosen) ? NaN : Math.abs(chosen)
}

function toNumberOrNaN(v: string | number | undefined): number {
  if (v === undefined || v === null) return NaN
  if (typeof v === 'number') return v
  const s = String(v).trim()
  if (!s) return NaN
  // Handle Excel numeric date mistakenly here? We only care amount; strip non-numeric currency markers
  const cleaned = s.replace(/[^0-9.-]/g, '')
  if (!cleaned) return NaN
  const n = parseFloat(cleaned)
  return isNaN(n) ? NaN : n
}

/**
 * Convert various date formats to ISO YYYY-MM-DD.
 * Handles:
 * - dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
 * - dd/mmm/yyyy, dd-mmm-yyyy (mmm = Jan, Feb, ...)
 * - dd mmm yyyy
 * - Excel serial date numbers (as string or number)
 */
export function parseDate(input: string | number | Date): string {
  // If Date object
  if (input instanceof Date) {
    if (!isNaN(input.getTime())) return toISODate(input)
    return fallbackToday()
  }

  // Excel serial date
  if (typeof input === 'number' && isFinite(input)) {
    const d = excelSerialToDate(input)
    return toISODate(d)
  }

  const raw = String(input).trim()
  if (!raw) return fallbackToday()

  // Try pure YYYY-MM-DD or similar, let Date parse if iso-like
  // But prefer our own parsing for numeric variants.

  // yyyy-mm-dd or yyyy/m/d
  let m = raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/)
  if (m) {
    const [, yyyy, mm, dd] = m
    return toISO(yyyy, mm, dd)
  }

  // dd/mm/yyyy or dd-mm-yyyy
  m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (m) {
    const [, dd, mm, yyyy] = m
    return toISO(yyyy, mm, dd)
  }

  // dd/mmm/yyyy or dd-mmm-yyyy or dd mmm yyyy
  m = raw.match(/^(\d{1,2})[\/\-\s]([A-Za-z]{3})[\/\-\s](\d{2,4})$/)
  if (m) {
    let [, dd, mon, y] = m
    const yyyy = y.length === 2 ? String(2000 + parseInt(y, 10)) : y
    const mm = monthToNumber(mon)
    if (mm) return toISO(yyyy, mm, dd)
  }

  // d mmm yyyy (with full month name)
  m = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/)
  if (m) {
    let [, dd, mon, y] = m
    const yyyy = y.length === 2 ? String(2000 + parseInt(y, 10)) : y
    const mm = monthToNumber(mon)
    if (mm) return toISO(yyyy, mm, dd)
  }

  // dd/mm/yy or dd-mm-yy
  m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2})$/)
  if (m) {
    const [, dd, mm, yy] = m
    const yyyy = String(2000 + parseInt(yy, 10))
    return toISO(yyyy, mm, dd)
  }

  // Excel serial provided as string (digits only, reasonable range)
  if (/^\d+$/.test(raw)) {
    const serial = parseInt(raw, 10)
    if (serial > 20000 && serial < 60000) {
      const d = excelSerialToDate(serial)
      return toISODate(d)
    }
  }

  // Fallback: try Date.parse
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return toISODate(d)

  return fallbackToday()
}

function monthToNumber(mon: string): string | null {
  const map: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  }
  const key = mon.toLowerCase()
  return map[key] || null
}

function toISO(yyyy: string | number, mm: string | number, dd: string | number): string {
  const y = String(yyyy)
  const m = String(mm).padStart(2, '0')
  const d = String(dd).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

// Excel serial date: days since 1899-12-30 (accounting for the Excel leap year bug)
function excelSerialToDate(serial: number): Date {
  // Excel's day 1 is 1900-01-01, but they consider 1900 a leap year (bug), so epoch is 1899-12-30
  const epoch = new Date(Date.UTC(1899, 11, 30))
  // serial may include a fractional part for time; keep date only
  const ms = Math.round(serial) * 86400000
  return new Date(epoch.getTime() + ms)
}

/**
 * Extract receipt data (existing)
 */
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
 * UPI narration parser for bank statement descriptions.
 * Example:
 * UPI/123456789012/DR/SOME MERCHANT/HDFC/user.name@okhdfcbank/Mumbai
 */
function parseUPINarration(desc: string): {
  utr?: string
  drcr?: 'DR' | 'CR'
  merchant?: string
  bank?: string
  vpa?: string
  city?: string
} | null {
  if (!desc) return null
  const re = /UPI\/(?<utr>\d{8,18})\/(?<drcr>DR|CR)\/(?<merchant>[^/]+)\/(?<bank>[A-Z]+)\/(?<vpa>[A-Za-z0-9._-]+@[A-Za-z]+)(?:\/(?<city>[A-Za-z]+))?/i
  const m = desc.match(re)
  if (!m || !m.groups) return null
  const { utr, drcr, merchant, bank, vpa, city } = m.groups as Record<string, string>
  return {
    utr,
    drcr: (drcr as 'DR' | 'CR'),
    merchant,
    bank,
    vpa,
    city
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
    if ((bankTx as any).matched) continue
    
    let bestMatch: PhonePeReceipt | undefined
    let bestScore = 0
    let matchReasons: string[] = []
    
    for (const receipt of receipts) {
      if ((receipt as any).matched) continue
      
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

/* =========================
   Helpers for header mapping
   ========================= */
function normalizeHeader(h: string): string {
  return (h || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
}

function computeHeaderIndices(headers: string[]) {
  return {
    date: findHeaderIndex(headers, [
      'date', 'txn date', 'transaction date', 'value date', 'date of transaction', 'posting date', 'date posted'
    ]),
    amount: findHeaderIndex(headers, [
      'amount', 'transaction amount', 'amt', 'amount (inr)', 'inr amount'
    ]),
    debit: findHeaderIndex(headers, [
      'debit', 'debit amt', 'debit amount', 'withdrawal', 'withdrawal amount', 'dr'
    ]),
    credit: findHeaderIndex(headers, [
      'credit', 'credit amt', 'credit amount', 'deposit', 'deposit amount', 'cr'
    ]),
    description: findHeaderIndex(headers, [
      'description', 'desc', 'narration', 'remarks', 'particulars', 'details'
    ]),
    utr: findHeaderIndex(headers, [
      'utr', 'reference', 'reference no', 'ref', 'ref no', 'transaction id', 'txn id', 'upi transaction id'
    ]),
  }
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  // exact first
  for (const c of candidates) {
    const idx = headers.indexOf(c)
    if (idx !== -1) return idx
  }
  // contains fallback
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]
    if (candidates.some(c => h.includes(c))) return i
  }
  return -1
}

function pick<T>(arr: T[], idx: number): T | '' {
  if (idx < 0) return '' as any
  return arr[idx]
}

function fallbackToday(): string {
  return new Date().toISOString().split('T')[0]
}