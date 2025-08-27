import React, { useState, useCallback } from 'react'
import { Camera, Upload, Image as ImageIcon, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { useOCR } from '@/hooks/use-ocr'
import { extractReceiptData } from '@/lib/parser'
import type { PhonePeReceipt } from '@/lib/types'

interface ReceiptUploadProps {
  receipts: PhonePeReceipt[]
  onReceiptsUpdate: (receipts: PhonePeReceipt[]) => void
}

export function ReceiptUpload({ receipts, onReceiptsUpdate }: ReceiptUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const { processImage, isProcessing } = useOCR()
  
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    )
    
    if (imageFiles.length === 0) {
      toast.error('Please upload image files or PDFs')
      return
    }
    
    for (const file of imageFiles) {
      try {
        const ocrResult = await processImage(file)
        const extractedData = extractReceiptData(ocrResult.text)
        
        const receipt: PhonePeReceipt = {
          id: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          date: extractedData.date || new Date().toISOString().split('T')[0],
          amount: extractedData.amount || 0,
          merchant: extractedData.merchant || 'Unknown Merchant',
          utr: extractedData.utr,
          imageUrl: URL.createObjectURL(file),
          extractedData: {
            confidence: ocrResult.confidence,
            rawText: ocrResult.text
          }
        }
        
        onReceiptsUpdate([...receipts, receipt])
        toast.success(`Processed receipt: ${receipt.merchant}`)
        
      } catch (error) {
        toast.error(`Failed to process ${file.name}`)
        console.error(error)
      }
    }
  }, [receipts, onReceiptsUpdate, processImage])
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])
  
  const removeReceipt = useCallback((receiptId: string) => {
    const updatedReceipts = receipts.filter(r => r.id !== receiptId)
    onReceiptsUpdate(updatedReceipts)
    toast.success('Receipt removed')
  }, [receipts, onReceiptsUpdate])
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera size={20} />
            Upload PhonePe Receipts
          </CardTitle>
          <CardDescription>
            Upload screenshots or PDFs of PhonePe transaction receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isProcessing ? (
              <div className="space-y-4">
                <div className="animate-spin mx-auto">
                  <ImageIcon size={32} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium">Processing receipt...</p>
                  <p className="text-sm text-muted-foreground">Extracting transaction data</p>
                </div>
              </div>
            ) : (
              <>
                <ImageIcon size={32} className="mx-auto text-muted-foreground mb-4" />
                <p className="font-medium mb-2">Drop receipt images here</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports PNG, JPG, and PDF files
                </p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                  id="receipt-upload"
                />
                <Button asChild>
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    Select Images
                  </label>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      {receipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processed Receipts ({receipts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="border rounded-lg p-4 space-y-3">
                  {receipt.imageUrl && (
                    <div className="aspect-video bg-muted rounded-md overflow-hidden">
                      <img 
                        src={receipt.imageUrl} 
                        alt="Receipt" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">{receipt.merchant}</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeReceipt(receipt.id)}
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">₹{receipt.amount.toFixed(2)}</span>
                      <span className="text-muted-foreground">{receipt.date}</span>
                    </div>
                    {receipt.utr && (
                      <p className="text-xs text-muted-foreground">UTR: {receipt.utr}</p>
                    )}
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        receipt.extractedData.confidence > 0.8 
                          ? 'border-green-500 text-green-700' 
                          : 'border-yellow-500 text-yellow-700'
                      }`}
                    >
                      {Math.round(receipt.extractedData.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}