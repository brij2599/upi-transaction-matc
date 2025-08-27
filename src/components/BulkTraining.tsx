import React, { useState, useMemo } from 'react'
import { Brain, Users, CheckSquare, Square, Target, TrendUp, Info, Zap, Filter } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { TransactionMatch, Category } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'

interface BulkTrainingProps {
  matches: TransactionMatch[]
  onBulkMatchUpdate: (matchIds: string[], status: 'approved' | 'rejected', category?: Category, feedback?: string) => void
}

interface BulkTrainingSession {
  selectedMatches: Set<string>
  category: Category | null
  feedback: string
  trainingOptions: {
    createRule: boolean
    isRecurring: boolean
    confidence: 'low' | 'medium' | 'high'
    applyToSimilar: boolean
  }
}

export function BulkTraining({ matches, onBulkMatchUpdate }: BulkTrainingProps) {
  const [session, setSession] = useState<BulkTrainingSession>({
    selectedMatches: new Set(),
    category: null,
    feedback: '',
    trainingOptions: {
      createRule: true,
      isRecurring: false,
      confidence: 'medium',
      applyToSimilar: true
    }
  })
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [merchantFilter, setMerchantFilter] = useState('')
  const [amountRange, setAmountRange] = useState({ min: '', max: '' })
  
  const pendingMatches = matches.filter(m => m.status === 'pending')
  
  // Group similar transactions for bulk processing suggestions
  const similarGroups = useMemo(() => {
    const groups: { [key: string]: TransactionMatch[] } = {}
    
    pendingMatches.forEach(match => {
      const key = match.suggestedReceipt?.merchant?.toLowerCase() || 
                  match.bankTransaction.description.toLowerCase().slice(0, 20)
      
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(match)
    })
    
    // Only return groups with 2+ transactions
    return Object.entries(groups)
      .filter(([_, transactions]) => transactions.length >= 2)
      .map(([key, transactions]) => ({
        key,
        transactions,
        merchantName: transactions[0].suggestedReceipt?.merchant || 
                     transactions[0].bankTransaction.description,
        totalAmount: transactions.reduce((sum, t) => sum + t.bankTransaction.amount, 0),
        suggestedCategory: transactions[0].suggestedReceipt?.category || 
                          transactions[0].bankTransaction.category
      }))
      .sort((a, b) => b.transactions.length - a.transactions.length)
  }, [pendingMatches])
  
  // Filter matches based on current filters
  const filteredMatches = useMemo(() => {
    let filtered = pendingMatches
    
    if (merchantFilter) {
      filtered = filtered.filter(match => 
        (match.suggestedReceipt?.merchant || match.bankTransaction.description)
          .toLowerCase().includes(merchantFilter.toLowerCase())
      )
    }
    
    if (amountRange.min) {
      const minAmount = parseFloat(amountRange.min)
      filtered = filtered.filter(match => match.bankTransaction.amount >= minAmount)
    }
    
    if (amountRange.max) {
      const maxAmount = parseFloat(amountRange.max)
      filtered = filtered.filter(match => match.bankTransaction.amount <= maxAmount)
    }
    
    return filtered
  }, [pendingMatches, merchantFilter, amountRange])
  
  const handleToggleSelection = (matchId: string) => {
    setSession(prev => {
      const newSelected = new Set(prev.selectedMatches)
      if (newSelected.has(matchId)) {
        newSelected.delete(matchId)
      } else {
        newSelected.add(matchId)
      }
      return { ...prev, selectedMatches: newSelected }
    })
  }
  
  const handleSelectGroup = (group: typeof similarGroups[0]) => {
    const groupIds = group.transactions.map(t => t.bankTransaction.id)
    setSession(prev => ({
      ...prev,
      selectedMatches: new Set([...prev.selectedMatches, ...groupIds]),
      category: group.suggestedCategory as Category || null
    }))
  }
  
  const handleSelectAll = () => {
    const allIds = filteredMatches.map(m => m.bankTransaction.id)
    setSession(prev => ({
      ...prev,
      selectedMatches: new Set(allIds)
    }))
  }
  
  const handleClearSelection = () => {
    setSession(prev => ({
      ...prev,
      selectedMatches: new Set()
    }))
  }
  
  const handleBulkApprove = () => {
    if (session.selectedMatches.size === 0) {
      toast.error('Please select transactions to process')
      return
    }
    
    if (!session.category) {
      toast.error('Please select a category for the selected transactions')
      return
    }
    
    // Construct enhanced feedback with training options
    const trainingDetails = []
    if (session.trainingOptions.createRule) trainingDetails.push('Create bulk categorization rules')
    if (session.trainingOptions.isRecurring) trainingDetails.push('Mark as recurring transactions')
    if (session.trainingOptions.applyToSimilar) trainingDetails.push('Apply to similar future transactions')
    trainingDetails.push(`Confidence: ${session.trainingOptions.confidence}`)
    
    const enhancedFeedback = `${session.feedback} [BULK_TRAINING: ${trainingDetails.join(', ')}]`.trim()
    
    const selectedIds = Array.from(session.selectedMatches)
    onBulkMatchUpdate(selectedIds, 'approved', session.category, enhancedFeedback)
    
    // Reset session
    setSession({
      selectedMatches: new Set(),
      category: null,
      feedback: '',
      trainingOptions: {
        createRule: true,
        isRecurring: false,
        confidence: 'medium',
        applyToSimilar: true
      }
    })
    setShowBulkDialog(false)
    
    toast.success(`Bulk approved ${selectedIds.length} transactions with enhanced training`)
  }
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }
  
  const selectedMatches = Array.from(session.selectedMatches)
    .map(id => matches.find(m => m.bankTransaction.id === id))
    .filter(Boolean) as TransactionMatch[]
  
  const totalSelectedAmount = selectedMatches.reduce((sum, match) => sum + match.bankTransaction.amount, 0)
  
  if (pendingMatches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>No pending transactions available for bulk training.</p>
            <p className="text-sm mt-1">Process individual transactions first or upload more data.</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Similar Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{similarGroups.length}</div>
            <p className="text-xs text-muted-foreground">Ready for bulk processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{session.selectedMatches.size}</div>
            <p className="text-xs text-muted-foreground">Transactions selected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-600">{formatAmount(totalSelectedAmount)}</div>
            <p className="text-xs text-muted-foreground">Selected amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMatches.length}</div>
            <p className="text-xs text-muted-foreground">Pending matches</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Similar Groups Quick Selection */}
      {similarGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              Similar Transaction Groups
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select entire groups of similar transactions for efficient bulk processing
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {similarGroups.slice(0, 6).map((group, index) => (
                <div
                  key={group.key}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSelectGroup(group)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{group.transactions.length} txns</Badge>
                      {group.suggestedCategory && (
                        <Badge variant="outline" className="text-xs">
                          {group.suggestedCategory}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{group.merchantName}</p>
                    <p className="text-sm text-muted-foreground">
                      Total: {formatAmount(group.totalAmount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter size={20} />
              Filter & Select Transactions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredMatches.length === 0}
              >
                <CheckSquare size={14} className="mr-1" />
                Select All Filtered
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={session.selectedMatches.size === 0}
              >
                <Square size={14} className="mr-1" />
                Clear Selection
              </Button>
              <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogTrigger asChild>
                  <Button
                    disabled={session.selectedMatches.size === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Brain size={14} className="mr-1" />
                    Bulk Train ({session.selectedMatches.size})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-500" />
                      Bulk Training Session
                    </DialogTitle>
                    <DialogDescription>
                      Train the system on {session.selectedMatches.size} selected transactions simultaneously
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Selected Transactions Preview */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Selected Transactions ({selectedMatches.length})</Label>
                      <div className="max-h-60 overflow-y-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Amount</TableHead>
                              <TableHead>Merchant/Description</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Current Category</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedMatches.map(match => (
                              <TableRow key={match.bankTransaction.id}>
                                <TableCell className="font-medium">
                                  {formatAmount(match.bankTransaction.amount)}
                                </TableCell>
                                <TableCell>
                                  {match.suggestedReceipt?.merchant || match.bankTransaction.description}
                                </TableCell>
                                <TableCell>{match.bankTransaction.date}</TableCell>
                                <TableCell>
                                  {match.bankTransaction.category || match.suggestedReceipt?.category || 'Uncategorized'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Total Selected Value: {formatAmount(totalSelectedAmount)}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Category Selection */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Apply Category to All Selected</Label>
                      <Select
                        value={session.category || ''}
                        onValueChange={(value: Category) => 
                          setSession(prev => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category for all transactions" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Separator />
                    
                    {/* Bulk Training Options */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Bulk Training Options</Label>
                      
                      <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="bulk-create-rule"
                            checked={session.trainingOptions.createRule}
                            onCheckedChange={(checked) => 
                              setSession(prev => ({
                                ...prev,
                                trainingOptions: {
                                  ...prev.trainingOptions,
                                  createRule: checked as boolean
                                }
                              }))
                            }
                          />
                          <Label htmlFor="bulk-create-rule" className="text-sm">
                            Create comprehensive categorization rules from this batch
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="bulk-recurring"
                            checked={session.trainingOptions.isRecurring}
                            onCheckedChange={(checked) => 
                              setSession(prev => ({
                                ...prev,
                                trainingOptions: {
                                  ...prev.trainingOptions,
                                  isRecurring: checked as boolean
                                }
                              }))
                            }
                          />
                          <Label htmlFor="bulk-recurring" className="text-sm">
                            These are recurring transactions (subscriptions, bills, etc.)
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="bulk-apply-similar"
                            checked={session.trainingOptions.applyToSimilar}
                            onCheckedChange={(checked) => 
                              setSession(prev => ({
                                ...prev,
                                trainingOptions: {
                                  ...prev.trainingOptions,
                                  applyToSimilar: checked as boolean
                                }
                              }))
                            }
                          />
                          <Label htmlFor="bulk-apply-similar" className="text-sm">
                            Apply learned patterns to similar future transactions automatically
                          </Label>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">Bulk training confidence level:</Label>
                          <Select
                            value={session.trainingOptions.confidence}
                            onValueChange={(value: 'low' | 'medium' | 'high') => 
                              setSession(prev => ({
                                ...prev,
                                trainingOptions: {
                                  ...prev.trainingOptions,
                                  confidence: value
                                }
                              }))
                            }
                          >
                            <SelectTrigger className="w-64">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low - Patterns may vary significantly</SelectItem>
                              <SelectItem value="medium">Medium - Generally consistent patterns</SelectItem>
                              <SelectItem value="high">High - Very consistent, apply rules broadly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Bulk Training Feedback */}
                    <div className="space-y-4">
                      <Label htmlFor="bulk-feedback" className="text-base font-medium">
                        Bulk Training Context & Patterns
                      </Label>
                      <Textarea
                        id="bulk-feedback"
                        placeholder="Describe common patterns across these transactions that will help the system learn:&#10;&#10;Examples:&#10;• 'All these transactions are from the same grocery chain but show different store names'&#10;• 'Monthly subscription payments that should always be categorized as subscriptions'&#10;• 'Business lunch expenses - all food purchases during work hours'&#10;• 'Family entertainment expenses from various venues'&#10;&#10;This bulk feedback will be applied to improve categorization for all similar future transactions."
                        value={session.feedback}
                        onChange={(e) => setSession(prev => ({ ...prev, feedback: e.target.value }))}
                        className="min-h-[100px]"
                      />
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <div className="text-sm">
                            <p className="font-medium mb-1">Bulk Training Impact:</p>
                            <ul className="text-xs space-y-1">
                              <li>• System will learn from {session.selectedMatches.size} transactions simultaneously</li>
                              {session.trainingOptions.createRule && <li>• Multiple categorization rules will be created/updated</li>}
                              {session.trainingOptions.isRecurring && <li>• Recurring transaction patterns will be prioritized</li>}
                              {session.trainingOptions.applyToSimilar && <li>• Rules will be applied to future similar transactions automatically</li>}
                              <li>• Confidence: {session.trainingOptions.confidence} - affects how broadly rules are applied</li>
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowBulkDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleBulkApprove}
                        disabled={!session.category}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <TrendUp size={14} className="mr-2" />
                        Bulk Approve & Train System ({session.selectedMatches.size})
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="space-y-2">
              <Label htmlFor="merchant-filter">Merchant/Description Filter</Label>
              <Input
                id="merchant-filter"
                placeholder="Filter by merchant name or description..."
                value={merchantFilter}
                onChange={(e) => setMerchantFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount-min">Min Amount</Label>
              <Input
                id="amount-min"
                type="number"
                placeholder="0"
                value={amountRange.min}
                onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount-max">Max Amount</Label>
              <Input
                id="amount-max"
                type="number"
                placeholder="10000"
                value={amountRange.max}
                onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
              />
            </div>
          </div>
          
          {/* Transaction Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Suggested Match</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.map((match) => (
                  <TableRow 
                    key={match.bankTransaction.id}
                    className={session.selectedMatches.has(match.bankTransaction.id) ? 'bg-blue-50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={session.selectedMatches.has(match.bankTransaction.id)}
                        onCheckedChange={() => handleToggleSelection(match.bankTransaction.id)}
                      />
                    </TableCell>
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
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No match</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        {match.bankTransaction.category || match.suggestedReceipt?.category || 'Uncategorized'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={match.matchScore >= 80 ? 'bg-green-100 text-green-800' : 
                                     match.matchScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                                     'bg-red-100 text-red-800'}>
                        {match.matchScore}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredMatches.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transactions match the current filters.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setMerchantFilter('')
                  setAmountRange({ min: '', max: '' })
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}