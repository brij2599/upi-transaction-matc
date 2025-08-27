import { useState, useCallback } from 'react'

interface OCRResult {
  text: string
  confidence: number
}

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false)
  
  const processImage = useCallback(async (file: File): Promise<OCRResult> => {
    setIsProcessing(true)
    
    try {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockTexts = [
            `PhonePe
            Payment Successful
            ₹1,250.00
            To: Swiggy
            UPI Transaction ID: 432109876543
            Date: 15/12/2023
            From: your-account@paytm`,
            
            `PhonePe
            Paid ₹850.50
            To: Zomato Online
            Transaction ID: 987654321098
            15th Dec 2023
            Payment via UPI`,
            
            `PhonePe Receipt
            Amount: ₹2,100
            Merchant: Amazon Pay
            UPI ID: amazon@paytm
            Txn ID: 123456789012
            Date: 14/12/2023`,
          ]
          
          const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)]
          resolve({
            text: randomText,
            confidence: Math.random() * 0.3 + 0.7
          })
          setIsProcessing(false)
        }, 1500)
      })
    } catch (error) {
      setIsProcessing(false)
      throw error
    }
  }, [])
  
  return { processImage, isProcessing }
}