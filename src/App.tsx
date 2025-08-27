import React, { useState, useEffect } from 'react'
import { Upload, Camera, ArrowLeftRight, Download, Menu } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useKV } from '@github/spark/hooks'
import { toast, Toaster } from 'sonner'
import { FileUpload } from '@/components/FileUpload'
import { ReceiptUpload } from '@/components/ReceiptUpload'
import { TransactionMatching } from '@/components/TransactionMatching'
import { ExportData } from '@/components/ExportData'
import { matchTransactions } from '@/lib/parser'
import type { BankTransaction, PhonePeReceipt, TransactionMatch, Category } from '@/lib/types'

function App() {
  const [bankTransactions, setBankTransactions] = useKV<BankTransaction[]>('bank-transactions', [])
  const [receipts, setReceipts] = useKV<PhonePeReceipt[]>('phonepe-receipts', [])
  const [matches, setMatches] = useState<TransactionMatch[]>([])
  
  useEffect(() => {
    if (bankTransactions.length > 0 && receipts.length > 0) {
      const newMatches = matchTransactions(bankTransactions, receipts)
      setMatches(newMatches)
    } else {
      setMatches([])
    }
  }, [bankTransactions, receipts])
  
  const handleTransactionsUploaded = (newTransactions: BankTransaction[]) => {
    setBankTransactions((current) => {
      const existing = new Set(current.map(t => t.id))
      const uniqueNew = newTransactions.filter(t => !existing.has(t.id))
      return [...current, ...uniqueNew]
    })
  }
  
  const handleReceiptsUpdate = (newReceipts: PhonePeReceipt[]) => {
    setReceipts(newReceipts)
  }
  
  const handleMatchUpdate = (matchId: string, status: 'approved' | 'rejected', category?: Category) => {
    setMatches((currentMatches) =>
      currentMatches.map(match => {
        if (match.bankTransaction.id === matchId) {
          const updatedMatch = { ...match, status }
          
          if (status === 'approved' && category) {
            setBankTransactions((currentTxns) =>
              currentTxns.map(txn =>
                txn.id === matchId
                  ? { 
                      ...txn, 
                      category, 
                      matched: true, 
                      matchedReceiptId: match.suggestedReceipt?.id 
                    }
                  : txn
              )
            )
            
            if (match.suggestedReceipt) {
              setReceipts((currentReceipts) =>
                currentReceipts.map(receipt =>
                  receipt.id === match.suggestedReceipt?.id
                    ? { ...receipt, matched: true, category }
                    : receipt
                )
              )
            }
          }
          
          return updatedMatch
        }
        return match
      })
    )
  }
  
  const totalTransactions = bankTransactions.length
  const totalReceipts = receipts.length
  const pendingMatches = matches.filter(m => m.status === 'pending').length
  const approvedMatches = matches.filter(m => m.status === 'approved').length
  
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
                  <p className="font-semibold text-lg">{totalTransactions}</p>
                  <p className="text-muted-foreground">Bank Txns</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">{totalReceipts}</p>
                  <p className="text-muted-foreground">Receipts</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg text-green-600">{approvedMatches}</p>
                  <p className="text-muted-foreground">Matched</p>
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
              Match ({pendingMatches})
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download size={16} />
              Export
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <FileUpload onTransactionsUploaded={handleTransactionsUploaded} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Transactions</CardTitle>
                  <CardDescription>
                    {totalTransactions} bank transactions loaded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bankTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Upload size={32} className="mx-auto mb-4" />
                      <p>No bank transactions uploaded yet</p>
                      <p className="text-sm mt-1">Upload a CSV file to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-xl font-bold">
                            ₹{bankTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Date Range</p>
                          <p className="text-sm">
                            {bankTransactions.length > 0 && (
                              <>
                                {Math.min(...bankTransactions.map(t => new Date(t.date).getTime())) !== Infinity
                                  ? new Date(Math.min(...bankTransactions.map(t => new Date(t.date).getTime()))).toLocaleDateString()
                                  : 'N/A'} - {Math.max(...bankTransactions.map(t => new Date(t.date).getTime())) !== -Infinity
                                  ? new Date(Math.max(...bankTransactions.map(t => new Date(t.date).getTime()))).toLocaleDateString()
                                  : 'N/A'}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="max-h-40 overflow-y-auto space-y-2 border rounded p-3">
                        {bankTransactions.slice(0, 5).map((transaction) => (
                          <div key={transaction.id} className="flex justify-between items-center text-sm">
                            <div>
                              <p className="font-medium">₹{transaction.amount.toFixed(2)}</p>
                              <p className="text-muted-foreground text-xs">{transaction.description.substring(0, 30)}...</p>
                            </div>
                            <span className="text-muted-foreground">{transaction.date}</span>
                          </div>
                        ))}
                        {bankTransactions.length > 5 && (
                          <p className="text-center text-xs text-muted-foreground">
                            +{bankTransactions.length - 5} more transactions
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="receipts">
            <ReceiptUpload receipts={receipts} onReceiptsUpdate={handleReceiptsUpdate} />
          </TabsContent>
          
          <TabsContent value="matching">
            <TransactionMatching matches={matches} onMatchUpdate={handleMatchUpdate} />
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