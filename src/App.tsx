import React, { useState, useEffect, useMemo } from 'react'
import { Upload, Camera, ArrowLeftRight, Download } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast, Toaster } from 'sonner'
import { FileUploadSimple } from '@/components/FileUploadSimple'
import { ReceiptUpload } from '@/components/ReceiptUpload'
import { TransactionMatching } from '@/components/TransactionMatching'
import { ExportData } from '@/components/ExportData'
import { useKV } from '@github/spark/hooks'
import type { PhonePeReceipt, BankTransaction, TransactionMatch, Category } from '@/lib/types'
import { generateMatches, applyMatches } from '@/lib/matching'

function App() {
  const [transactionCount, setTransactionCount] = useState(0)
  const [receipts, setReceipts] = useKV<PhonePeReceipt[]>('phonepe-receipts', [])
  const [bankTransactions, setBankTransactions] = useKV<BankTransaction[]>('bank-transactions', [])
  const [matches, setMatches] = useKV<TransactionMatch[]>('transaction-matches', [])
  
  // Generate matches when bank transactions or receipts change
  const generatedMatches = useMemo(() => {
    if (bankTransactions.length === 0 || receipts.length === 0) {
      return []
    }
    return generateMatches(bankTransactions, receipts)
  }, [bankTransactions, receipts])
  
  // Update matches when new matches are generated
  useEffect(() => {
    if (generatedMatches.length > 0 && JSON.stringify(generatedMatches) !== JSON.stringify(matches)) {
      setMatches(generatedMatches)
      toast.success(`Found ${generatedMatches.length} potential matches`)
    }
  }, [generatedMatches, matches, setMatches])
  
  const handleMatchUpdate = (matchId: string, status: 'approved' | 'rejected', category?: Category) => {
    setMatches(currentMatches => 
      currentMatches.map(match => {
        if (match.bankTransaction.id === matchId) {
          return { 
            ...match, 
            status,
            bankTransaction: category ? { ...match.bankTransaction, category } : match.bankTransaction
          }
        }
        return match
      })
    )
    
    // If approved, update bank transactions and receipts
    if (status === 'approved') {
      const { updatedBankTransactions, updatedReceipts } = applyMatches(
        matches.map(m => m.bankTransaction.id === matchId ? { ...m, status } : m),
        bankTransactions,
        receipts
      )
      setBankTransactions(updatedBankTransactions)
      setReceipts(updatedReceipts)
    }
  }
  
  const handleBankTransactionsUploaded = (transactions: BankTransaction[]) => {
    setBankTransactions(transactions)
    setTransactionCount(transactions.length)
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">UPI Matcher</h1>
              <p className="text-muted-foreground">Reconcile bank statements with PhonePe receipts</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-lg">{transactionCount}</p>
                  <p className="text-muted-foreground">Bank Txns</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">{receipts.length}</p>
                  <p className="text-muted-foreground">Receipts</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg text-green-600">
                    {matches.filter(m => m.status === 'approved').length}
                  </p>
                  <p className="text-muted-foreground">Matched</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg text-orange-600">
                    {matches.filter(m => m.status === 'pending').length}
                  </p>
                  <p className="text-muted-foreground">Pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload size={16} />
              Upload
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Camera size={16} />
              Receipts
            </TabsTrigger>
            <TabsTrigger value="matching" className="flex items-center gap-2">
              <ArrowLeftRight size={16} />
              Match
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download size={16} />
              Export
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <FileUploadSimple onFilesUploaded={handleBankTransactionsUploaded} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Transactions</CardTitle>
                  <CardDescription>
                    {transactionCount} bank transactions loaded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionCount === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Upload size={32} className="mx-auto mb-4" />
                      <p>No bank transactions uploaded yet</p>
                      <p className="text-sm mt-1">Upload a CSV file to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Transactions</p>
                          <p className="text-xl font-bold">{transactionCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Matched</p>
                          <p className="text-xl font-bold text-green-600">
                            {bankTransactions.filter(t => t.matched).length}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="receipts">
            <ReceiptUpload 
              receipts={receipts} 
              onReceiptsUpdate={(newReceipts) => setReceipts(newReceipts)} 
            />
          </TabsContent>
          
          <TabsContent value="matching">
            <TransactionMatching 
              matches={matches}
              onMatchUpdate={handleMatchUpdate}
            />
          </TabsContent>
          
          <TabsContent value="export">
            <ExportData matches={matches} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App