import type { BankTransaction, PhonePeReceipt } from './types'

/**
 * Generate sample bank transactions for testing purposes
 */
export function generateSampleBankTransactions(): BankTransaction[] {
  const transactions: BankTransaction[] = [
    {
      id: 'bank_1',
      date: '2024-01-15',
      amount: 1250.00,
      description: 'UPI-SWIGGY-MERCHANT@PAYTM',
      utr: '432109876543',
      vpa: 'swiggy.merchant@paytm',
    },
    {
      id: 'bank_2',
      date: '2024-01-15',
      amount: 850.50,
      description: 'UPI-ZOMATO ONLINE-ZOMATO@PAYTM',
      utr: '987654321098',
      vpa: 'zomato@paytm',
    },
    {
      id: 'bank_3',
      date: '2024-01-14',
      amount: 2100.00,
      description: 'UPI-AMAZON PAY-AMAZON@PAYTM',
      utr: '123456789012',
      vpa: 'amazon@paytm',
    },
    {
      id: 'bank_4',
      date: '2024-01-14',
      amount: 450.00,
      description: 'UPI-UBER INDIA-UBER@PAYTM',
      utr: '456789012345',
      vpa: 'uber.india@paytm',
    },
    {
      id: 'bank_5',
      date: '2024-01-13',
      amount: 75.00,
      description: 'UPI-COFFEE DAY-CAFE@PAYTM',
      utr: '789012345678',
      vpa: 'cafecoffeeday@paytm',
    },
    {
      id: 'bank_6',
      date: '2024-01-12',
      amount: 3200.00,
      description: 'UPI-FLIPKART-FLIPKART@PAYTM',
      utr: '321098765432',
      vpa: 'flipkart@paytm',
    },
    {
      id: 'bank_7',
      date: '2024-01-11',
      amount: 180.00,
      description: 'UPI-OLA CABS-OLA@PAYTM',
      utr: '654321098765',
      vpa: 'ola.cabs@paytm',
    },
    {
      id: 'bank_8',
      date: '2024-01-10',
      amount: 599.00,
      description: 'UPI-NETFLIX-NETFLIX@PAYTM',
      utr: '147258369014',
      vpa: 'netflix@paytm',
    }
  ]
  
  return transactions
}

/**
 * Generate sample PhonePe receipts for testing purposes
 */
export function generateSampleReceipts(): PhonePeReceipt[] {
  const receipts: PhonePeReceipt[] = [
    {
      id: 'receipt_1',
      date: '2024-01-15',
      amount: 1250.00,
      merchant: 'Swiggy',
      utr: '432109876543',
      category: 'Food & Dining',
      extractedData: {
        confidence: 0.92,
        rawText: 'PhonePe Payment Successful ₹1,250.00 To: Swiggy UPI Transaction ID: 432109876543 Date: 15/01/2024'
      }
    },
    {
      id: 'receipt_2', 
      date: '2024-01-15',
      amount: 850.50,
      merchant: 'Zomato Online',
      utr: '987654321098',
      category: 'Food & Dining',
      extractedData: {
        confidence: 0.88,
        rawText: 'PhonePe Paid ₹850.50 To: Zomato Online Transaction ID: 987654321098 15th Jan 2024'
      }
    },
    {
      id: 'receipt_3',
      date: '2024-01-14',
      amount: 2100.00,
      merchant: 'Amazon Pay',
      utr: '123456789012',
      category: 'Shopping',
      extractedData: {
        confidence: 0.95,
        rawText: 'PhonePe Receipt Amount: ₹2,100 Merchant: Amazon Pay UPI ID: amazon@paytm Txn ID: 123456789012 Date: 14/01/2024'
      }
    },
    {
      id: 'receipt_4',
      date: '2024-01-14',
      amount: 450.00,
      merchant: 'Uber India',
      utr: '456789012345',
      category: 'Travel & Transport',
      extractedData: {
        confidence: 0.85,
        rawText: 'PhonePe Payment ₹450.00 To: Uber India Txn: 456789012345 Date: 14/01/2024'
      }
    },
    {
      id: 'receipt_5',
      date: '2024-01-13',
      amount: 75.00,
      merchant: 'Café Coffee Day',
      utr: '789012345678',
      category: 'Food & Dining',
      extractedData: {
        confidence: 0.78,
        rawText: 'PhonePe ₹75 Café Coffee Day Transaction ID: 789012345678 13/01/2024'
      }
    },
    {
      id: 'receipt_6',
      date: '2024-01-12',
      amount: 3200.00,
      merchant: 'Flipkart',
      utr: '321098765432',
      category: 'Shopping',
      extractedData: {
        confidence: 0.91,
        rawText: 'PhonePe Payment Successful ₹3,200 To: Flipkart UTR: 321098765432 Date: 12/01/2024'
      }
    },
    {
      id: 'receipt_7',
      date: '2024-01-11',
      amount: 180.00,
      merchant: 'Ola Cabs',
      utr: '654321098765',
      category: 'Travel & Transport',
      extractedData: {
        confidence: 0.82,
        rawText: 'PhonePe Paid ₹180 Ola Cabs Transaction: 654321098765 11/01/2024'
      }
    }
  ]
  
  return receipts
}

/**
 * Helper function to load demo data for testing
 */
export function loadDemoData() {
  const bankTransactions = generateSampleBankTransactions()
  const receipts = generateSampleReceipts()
  
  return {
    bankTransactions,
    receipts,
    message: `Loaded ${bankTransactions.length} bank transactions and ${receipts.length} receipts for demo`
  }
}