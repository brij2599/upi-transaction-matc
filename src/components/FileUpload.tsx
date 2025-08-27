import React, { useState, useCallback } from 'react'
import { Upload, FileText, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { parseCSV } from '@/lib/parser'
import type { BankTransaction } from '@/lib/types'

interface FileUploadProps {
  onTransactionsUploaded: (transactions: BankTransaction[]) => void
}

export function FileUpload({ onTransactionsUploaded }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    
    const file = files[0]
    if (!file.name.match(/\.(csv|xlsx?)$/i)) {
      toast.error('Please upload a CSV or Excel file')
      return
    }
    
    setUploading(true)
    setUploadProgress(0)
    
    try {
      const text = await file.text()
      
      setUploadProgress(50)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const transactions = parseCSV(text)
      setUploadProgress(100)
      
      if (transactions.length === 0) {
        toast.error('No valid transactions found in file')
        return
      }
      
      onTransactionsUploaded(transactions)
      toast.success(`Imported ${transactions.length} transactions`)
      
    } catch (error) {
      toast.error('Failed to process file')
      console.error(error)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [onTransactionsUploaded])
  
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
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText size={20} />
          Upload Bank Statement
        </CardTitle>
        <CardDescription>
          Upload your bank statement in CSV or Excel format
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="space-y-4">
              <div className="animate-spin mx-auto">
                <Upload size={32} className="text-primary" />
              </div>
              <div>
                <p className="font-medium">Processing file...</p>
                <Progress value={uploadProgress} className="mt-2" />
              </div>
            </div>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-muted-foreground mb-4" />
              <p className="font-medium mb-2">Drop your bank statement here</p>
              <p className="text-sm text-muted-foreground mb-4">
                Supports CSV and Excel (.xlsx, .xls) files
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <Button asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  Select File
                </label>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}