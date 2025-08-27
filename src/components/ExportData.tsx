import React from 'react'
import { Download, Calendar, Funnel } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { TransactionMatch } from '@/lib/types'

interface ExportDataProps {
  matches: TransactionMatch[]
}

export function ExportData({ matches }: ExportDataProps) {
  const approvedMatches = matches.filter(m => m.status === 'approved')
  const totalTransactions = matches.length
  const matchedTransactions = approvedMatches.length
  const matchRate = totalTransactions > 0 ? (matchedTransactions / totalTransactions) * 100 : 0
  
  const generateCSV = () => {
    if (approvedMatches.length === 0) {
      toast.error('No approved matches to export')
      return
    }
    
    const headers = [
      'Date',
      'Amount',
      'UTR',
      'Merchant',
      'VPA', 
      'City',
      'Category',
      'Bank Description',
      'PhonePe Receipt',
      'Match Score',
      'Notes'
    ]
    
    const rows = approvedMatches.map(match => [
      match.bankTransaction.date,
      match.bankTransaction.amount.toFixed(2),
      match.bankTransaction.utr || '',
      match.suggestedReceipt?.merchant || '',
      match.bankTransaction.vpa || '',
      match.bankTransaction.city || '',
      match.bankTransaction.category || 'Uncategorized',
      `"${match.bankTransaction.description}"`,
      match.suggestedReceipt ? 'Yes' : 'No',
      match.matchScore,
      match.matchReasons.join('; ')
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `upi-transactions-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success(`Exported ${approvedMatches.length} transactions`)
  }
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }
  
  const totalAmount = approvedMatches.reduce((sum, match) => sum + match.bankTransaction.amount, 0)
  
  const categoryBreakdown = approvedMatches.reduce((acc, match) => {
    const category = match.bankTransaction.category || 'Uncategorized'
    acc[category] = (acc[category] || 0) + match.bankTransaction.amount
    return acc
  }, {} as Record<string, number>)
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download size={20} />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{totalTransactions}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Matched</p>
              <p className="text-2xl font-bold text-green-600">{matchedTransactions}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Match Rate</p>
              <p className="text-2xl font-bold">{matchRate.toFixed(1)}%</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{formatAmount(totalAmount)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button onClick={generateCSV} disabled={approvedMatches.length === 0}>
              <Download size={16} className="mr-2" />
              Download CSV
            </Button>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {Object.keys(categoryBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryBreakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{category}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {approvedMatches.filter(m => (m.bankTransaction.category || 'Uncategorized') === category).length} transactions
                    </span>
                  </div>
                  <span className="font-medium">{formatAmount(amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {approvedMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Export Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <p className="mb-2">Your export will include:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Transaction date and amount</li>
                <li>• UTR and VPA information</li>
                <li>• Merchant names from PhonePe receipts</li>
                <li>• Assigned categories</li>
                <li>• Match confidence scores</li>
                <li>• Bank transaction descriptions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}