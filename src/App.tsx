import React, { useState, useEffect, useMemo } from 'react'
import { Upload, Camera, ArrowsLeftRight, Download, ChartBar, Play, Gear } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast, Toaster } from 'sonner'
import { FileUploadSimple } from '@/components/FileUploadSimple'
import { ReceiptUpload } from '@/components/ReceiptUpload'
import { TransactionMatching } from '@/components/TransactionMatching'
import { ExportData } from '@/components/ExportData'
import { SpendingReport } from '@/components/SpendingReport'
import { CategoryRulesManager } from '@/components/CategoryRulesManager'
import { CategorizationInsights } from '@/components/CategorizationInsights'
import { useKV } from '@github/spark/hooks'
import type { PhonePeReceipt, BankTransaction, TransactionMatch, Category, CategoryRule } from '@/lib/types'
import { generateMatches, applyMatches } from '@/lib/matching'
import { loadDemoData } from '@/lib/demo-data'
import { initializeDefaultRules, learnFromApprovedMatch, updateRuleUsage } from '@/lib/categorization'

function App() {
  const [transactionCount, setTransactionCount] = useState(0)
  const [receipts, setReceipts] = useKV<PhonePeReceipt[]>('phonepe-receipts', [])
  const [bankTransactions, setBankTransactions] = useKV<BankTransaction[]>('bank-transactions', [])
  const [matches, setMatches] = useKV<TransactionMatch[]>('transaction-matches', [])
  const [categoryRules, setCategoryRules] = useKV<CategoryRule[]>('category-rules', [])
  
  // Initialize default categorization rules on first load
  useEffect(() => {
    if (categoryRules && categoryRules.length === 0) {
      const defaultRules = initializeDefaultRules()
      setCategoryRules(defaultRules)
      toast.success(`Initialized ${defaultRules.length} categorization rules`)
    }
  }, [categoryRules?.length, setCategoryRules])
  
  // Generate matches when bank transactions, receipts, or rules change
  const generatedMatches = useMemo(() => {
    if (!bankTransactions || !receipts || !categoryRules || bankTransactions.length === 0 || receipts.length === 0) {
      return []
    }
    return generateMatches(bankTransactions, receipts, categoryRules)
  }, [bankTransactions, receipts, categoryRules])
  
  // Update matches when new matches are generated
  useEffect(() => {
    if (generatedMatches.length > 0 && matches && JSON.stringify(generatedMatches) !== JSON.stringify(matches)) {
      setMatches(generatedMatches)
      
      // Count auto-categorized transactions
      const categorizedCount = generatedMatches.filter(match => 
        match.bankTransaction.category || match.suggestedReceipt?.category
      ).length
      
      if (categorizedCount > 0) {
        toast.success(`Found ${generatedMatches.length} potential matches with ${categorizedCount} auto-categorized`)
      } else {
        toast.success(`Found ${generatedMatches.length} potential matches`)
      }
    }
  }, [generatedMatches, matches, setMatches])
  
  const handleMatchUpdate = (matchId: string, status: 'approved' | 'rejected', category?: Category, feedback?: string) => {
    if (!matches) return
    
    setMatches(currentMatches => {
      if (!currentMatches) return []
      return currentMatches.map(match => {
        if (match.bankTransaction.id === matchId) {
          return { 
            ...match, 
            status,
            bankTransaction: category ? { ...match.bankTransaction, category } : match.bankTransaction
          }
        }
        return match
      })
    })
    
    // If approved, update bank transactions, receipts, and learn from the match
    if (status === 'approved') {
      const currentMatch = matches.find(m => m.bankTransaction.id === matchId)
      
      if (currentMatch && category && categoryRules) {
        // Learn from the approved categorization with training feedback
        const updatedRules = learnFromApprovedMatch(
          currentMatch.bankTransaction,
          currentMatch.suggestedReceipt,
          category,
          categoryRules,
          feedback // Pass the training feedback
        )
        setCategoryRules(updatedRules)
        
        // Show different success messages based on feedback complexity
        if (feedback && feedback.includes('[TRAINING:')) {
          toast.success(`Match approved with advanced training - enhanced system learning from detailed feedback`)
        } else if (feedback && feedback.trim()) {
          toast.success(`Match approved with training feedback - system will learn from this pattern`)
        } else {
          toast.success(`Match approved and categorization learned`)
        }
      }
      
      if (bankTransactions && receipts) {
        const { updatedBankTransactions, updatedReceipts } = applyMatches(
          matches.map(m => m.bankTransaction.id === matchId ? { ...m, status } : m),
          bankTransactions,
          receipts
        )
        setBankTransactions(updatedBankTransactions)
        setReceipts(updatedReceipts)
      }
    }
  }
  
  const handleBankTransactionsUploaded = (transactions: BankTransaction[]) => {
    setBankTransactions(transactions)
    setTransactionCount(transactions.length)
  }
  
  const handleLoadDemoData = () => {
    const { bankTransactions, receipts, message } = loadDemoData()
    setBankTransactions(bankTransactions)
    setReceipts(receipts)
    setTransactionCount(bankTransactions.length)
    toast.success(message)
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
                  <p className="font-semibold text-lg">{receipts?.length || 0}</p>
                  <p className="text-muted-foreground">Receipts</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg text-green-600">
                    {matches?.filter(m => m.status === 'approved').length || 0}
                  </p>
                  <p className="text-muted-foreground">Matched</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg text-orange-600">
                    {matches?.filter(m => m.status === 'pending').length || 0}
                  </p>
                  <p className="text-muted-foreground">Pending</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg text-blue-600">
                    {matches?.filter(m => m.bankTransaction.category || m.suggestedReceipt?.category).length || 0}
                  </p>
                  <p className="text-muted-foreground">Auto-Cat</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg text-purple-600">{categoryRules?.length || 0}</p>
                  <p className="text-muted-foreground">Rules</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload size={16} />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Camera size={16} />
              <span className="hidden sm:inline">Receipts</span>
            </TabsTrigger>
            <TabsTrigger value="matching" className="flex items-center gap-2">
              <ArrowsLeftRight size={16} />
              <span className="hidden sm:inline">Match</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Gear size={16} />
              <span className="hidden sm:inline">Rules</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <ChartBar size={16} />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
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
                    <div className="text-center py-8 text-muted-foreground space-y-4">
                      <Upload size={32} className="mx-auto mb-4" />
                      <div>
                        <p>No bank transactions uploaded yet</p>
                        <p className="text-sm mt-1">Upload a CSV file to get started</p>
                      </div>
                      <div className="pt-4">
                        <Button onClick={handleLoadDemoData} variant="outline" className="w-full">
                          <Play size={16} className="mr-2" />
                          Load Demo Data
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Try the app with sample transactions and receipts
                        </p>
                      </div>
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
                            {bankTransactions?.filter(t => t.matched).length || 0}
                          </p>
                        </div>
                      </div>
                      <div className="pt-4">
                        <Button onClick={handleLoadDemoData} variant="outline" size="sm">
                          <Play size={14} className="mr-2" />
                          Reset with Demo Data
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="receipts">
            <ReceiptUpload 
              receipts={receipts || []} 
              onReceiptsUpdate={(newReceipts) => setReceipts(newReceipts)} 
            />
          </TabsContent>
          
          <TabsContent value="matching">
            <div className="space-y-6">
              <CategorizationInsights matches={matches || []} categoryRules={categoryRules || []} />
              <TransactionMatching 
                matches={matches || []}
                onMatchUpdate={handleMatchUpdate}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="categories">
            <CategoryRulesManager 
              rules={categoryRules || []}
              onRulesUpdate={setCategoryRules}
            />
          </TabsContent>
          
          <TabsContent value="reports">
            <SpendingReport matches={matches || []} />
          </TabsContent>
          
          <TabsContent value="export">
            <ExportData matches={matches || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App