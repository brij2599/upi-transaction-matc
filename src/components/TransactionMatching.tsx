import React, { useState } from 'react'
import { Check, X, Eye, ArrowRight, Zap, Eye as EyeIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { TransactionMatch, Category } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'

interface TransactionMatchingProps {
  matches: TransactionMatch[]
  onMatchUpdate: (matchId: string, status: 'approved' | 'rejected', category?: Category) => void
}

export function TransactionMatching({ matches, onMatchUpdate }: TransactionMatchingProps) {
  const [selectedCategory, setSelectedCategory] = useState<{[key: string]: Category}>({})
  const [showRejected, setShowRejected] = useState(false)
  
  const pendingMatches = matches.filter(m => m.status === 'pending')
  const approvedMatches = matches.filter(m => m.status === 'approved')
  const rejectedMatches = matches.filter(m => m.status === 'rejected')
  
  const handleApprove = (matchId: string) => {
    const match = matches.find(m => m.bankTransaction.id === matchId)
    if (!match) return
    
    const category = selectedCategory[matchId] || 
                    (match.suggestedReceipt?.category as Category) || 
                    'Miscellaneous'
    
    onMatchUpdate(matchId, 'approved', category)
    toast.success(`Transaction approved and categorized as ${category}`)
  }
  
  const handleReject = (matchId: string) => {
    onMatchUpdate(matchId, 'rejected')
    toast.success('Transaction match rejected')
  }
  
  const handleBulkApprove = () => {
    const highConfidenceMatches = pendingMatches.filter(m => m.matchScore >= 80 && m.suggestedReceipt)
    
    highConfidenceMatches.forEach(match => {
      const category = selectedCategory[match.bankTransaction.id] || 
                      (match.suggestedReceipt?.category as Category) ||
                      guessCategory(match.suggestedReceipt?.merchant || match.bankTransaction.description)
      onMatchUpdate(match.bankTransaction.id, 'approved', category)
    })
    
    if (highConfidenceMatches.length > 0) {
      toast.success(`Auto-approved ${highConfidenceMatches.length} high-confidence matches`)
    } else {
      toast.info('No high-confidence matches found for bulk approval')
    }
  }
  
  const guessCategory = (merchantOrDescription: string): Category => {
    const text = merchantOrDescription.toLowerCase()
    
    if (text.includes('swiggy') || text.includes('zomato') || text.includes('food') || text.includes('restaurant')) {
      return 'Food & Dining'
    }
    if (text.includes('uber') || text.includes('ola') || text.includes('metro') || text.includes('petrol') || text.includes('fuel')) {
      return 'Travel & Transport'
    }
    if (text.includes('amazon') || text.includes('flipkart') || text.includes('shop') || text.includes('mall')) {
      return 'Shopping'
    }
    if (text.includes('netflix') || text.includes('spotify') || text.includes('entertainment') || text.includes('movie')) {
      return 'Entertainment'
    }
    if (text.includes('electric') || text.includes('gas') || text.includes('water') || text.includes('bill') || text.includes('utility')) {
      return 'Utilities & Bills'
    }
    if (text.includes('hospital') || text.includes('medical') || text.includes('pharmacy') || text.includes('doctor')) {
      return 'Healthcare'
    }
    if (text.includes('school') || text.includes('education') || text.includes('course') || text.includes('fee')) {
      return 'Education'
    }
    
    return 'Miscellaneous'
  }
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }
  
  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }
  
  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>No transactions to match yet.</p>
            <p className="text-sm mt-1">Upload bank statements and receipts to get started.</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMatches.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedMatches.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedMatches.length}</div>
          </CardContent>
        </Card>
      </div>
      
      {pendingMatches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Matches</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkApprove}
                  variant="outline"
                  size="sm"
                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                >
                  <Zap size={14} className="mr-1" />
                  Auto-Approve High Confidence
                </Button>
                <Button
                  onClick={() => setShowRejected(!showRejected)}
                  variant="outline"
                  size="sm"
                >
                  <EyeIcon size={14} className="mr-1" />
                  {showRejected ? 'Hide' : 'Show'} Rejected
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank Transaction</TableHead>
                  <TableHead>Suggested Match</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingMatches.map((match) => (
                  <TableRow key={match.bankTransaction.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{formatAmount(match.bankTransaction.amount)}</p>
                        <p className="text-sm text-muted-foreground">{match.bankTransaction.date}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-48">
                          {match.bankTransaction.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {match.suggestedReceipt ? (
                        <div className="space-y-1">
                          <p className="font-medium">{match.suggestedReceipt.merchant}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatAmount(match.suggestedReceipt.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {match.suggestedReceipt.date}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No match found</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getMatchScoreColor(match.matchScore)}>
                        {match.matchScore}%
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {match.matchReasons.join(', ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={selectedCategory[match.bankTransaction.id] || guessCategory(match.suggestedReceipt?.merchant || match.bankTransaction.description)}
                        onValueChange={(value: Category) => 
                          setSelectedCategory(prev => ({
                            ...prev,
                            [match.bankTransaction.id]: value
                          }))
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {match.suggestedReceipt && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye size={14} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Receipt Preview</DialogTitle>
                                <DialogDescription>
                                  Review the matched receipt details
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                {match.suggestedReceipt.imageUrl && (
                                  <div className="max-h-96 overflow-hidden rounded-lg">
                                    <img
                                      src={match.suggestedReceipt.imageUrl}
                                      alt="Receipt"
                                      className="w-full object-contain"
                                    />
                                  </div>
                                )}
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <h4 className="font-medium mb-2">Bank Transaction</h4>
                                    <div className="space-y-1 text-sm">
                                      <p>Amount: {formatAmount(match.bankTransaction.amount)}</p>
                                      <p>Date: {match.bankTransaction.date}</p>
                                      <p>Description: {match.bankTransaction.description}</p>
                                      {match.bankTransaction.utr && <p>UTR: {match.bankTransaction.utr}</p>}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">PhonePe Receipt</h4>
                                    <div className="space-y-1 text-sm">
                                      <p>Merchant: {match.suggestedReceipt.merchant}</p>
                                      <p>Amount: {formatAmount(match.suggestedReceipt.amount)}</p>
                                      <p>Date: {match.suggestedReceipt.date}</p>
                                      {match.suggestedReceipt.utr && <p>UTR: {match.suggestedReceipt.utr}</p>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleApprove(match.bankTransaction.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(match.bankTransaction.id)}
                          className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {(approvedMatches.length > 0 || (rejectedMatches.length > 0 && showRejected)) && (
        <Card>
          <CardHeader>
            <CardTitle>Processed Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvedMatches.map((match) => (
                <div
                  key={match.bankTransaction.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <Check className="text-green-600" size={16} />
                    <div>
                      <p className="font-medium">
                        {formatAmount(match.bankTransaction.amount)} • {match.suggestedReceipt?.merchant}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {match.bankTransaction.date} • {match.bankTransaction.category || 'Uncategorized'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Approved
                  </Badge>
                </div>
              ))}
              
              {showRejected && rejectedMatches.map((match) => (
                <div
                  key={match.bankTransaction.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <X className="text-red-600" size={16} />
                    <div>
                      <p className="font-medium">
                        {formatAmount(match.bankTransaction.amount)} • Bank Transaction
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {match.bankTransaction.date} • No match accepted
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-red-700 border-red-300">
                    Rejected
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}