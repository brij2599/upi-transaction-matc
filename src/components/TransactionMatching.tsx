import React, { useState } from 'react'
import { Check, X, Eye, ArrowRight, Lightning, Eye as EyeIcon, Robot, Brain, TrendUp, Target, Info, CheckCircle } from '@phosphor-icons/react'
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
import { toast } from 'sonner'
import type { TransactionMatch, Category } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'

interface TransactionMatchingProps {
  matches: TransactionMatch[]
  onMatchUpdate: (matchId: string, status: 'approved' | 'rejected', category?: Category, feedback?: string) => void
}

export function TransactionMatching({ matches, onMatchUpdate }: TransactionMatchingProps) {
  const [selectedCategory, setSelectedCategory] = useState<{[key: string]: Category}>({})
  const [showRejected, setShowRejected] = useState(false)
  const [feedbackText, setFeedbackText] = useState<{[key: string]: string}>({})
  const [showTrainingDialog, setShowTrainingDialog] = useState<string | null>(null)
  const [trainingOptions, setTrainingOptions] = useState<{[key: string]: {
    createRule: boolean;
    isRecurring: boolean;
    confidence: 'low' | 'medium' | 'high';
  }}>({})
  
  const pendingMatches = matches.filter(m => m.status === 'pending')
  const approvedMatches = matches.filter(m => m.status === 'approved')
  const rejectedMatches = matches.filter(m => m.status === 'rejected')
  
  // Calculate training metrics
  const autoCategorizationRate = matches.length > 0 
    ? Math.round((matches.filter(m => m.bankTransaction.category || m.suggestedReceipt?.category).length / matches.length) * 100)
    : 0
  
  const highConfidenceMatches = pendingMatches.filter(m => m.matchScore >= 80 && m.suggestedReceipt)
  const needsReviewMatches = pendingMatches.filter(m => m.matchScore < 60 || !m.suggestedReceipt)
  
  const handleApprove = (matchId: string, withFeedback = false) => {
    const match = matches.find(m => m.bankTransaction.id === matchId)
    if (!match) return
    
    const category = selectedCategory[matchId] || 
                    (match.suggestedReceipt?.category as Category) || 
                    'Miscellaneous'
    
    if (withFeedback) {
      setShowTrainingDialog(matchId)
      return
    }
    
    const feedback = feedbackText[matchId]
    onMatchUpdate(matchId, 'approved', category, feedback)
    
    // Clear local state
    setSelectedCategory(prev => {
      const { [matchId]: _, ...rest } = prev
      return rest
    })
    setFeedbackText(prev => {
      const { [matchId]: _, ...rest } = prev
      return rest
    })
    
    toast.success(`Transaction approved and categorized as ${category}`)
  }
  
  const handleApproveWithTraining = (matchId: string) => {
    const match = matches.find(m => m.bankTransaction.id === matchId)
    if (!match) return
    
    const category = selectedCategory[matchId] || 
                    (match.suggestedReceipt?.category as Category) || 
                    'Miscellaneous'
    
    // Construct detailed feedback with training options
    const trainingInfo = trainingOptions[matchId]
    const userFeedback = feedbackText[matchId]
    
    let enhancedFeedback = userFeedback || ''
    
    if (trainingInfo) {
      const trainingDetails = []
      if (trainingInfo.createRule) trainingDetails.push('Create new categorization rule')
      if (trainingInfo.isRecurring) trainingDetails.push('This is a recurring transaction')
      trainingDetails.push(`Confidence level: ${trainingInfo.confidence}`)
      
      enhancedFeedback = `${enhancedFeedback} [TRAINING: ${trainingDetails.join(', ')}]`.trim()
    }
    
    onMatchUpdate(matchId, 'approved', category, enhancedFeedback)
    
    // Clear state and close dialog
    setSelectedCategory(prev => {
      const { [matchId]: _, ...rest } = prev
      return rest
    })
    setFeedbackText(prev => {
      const { [matchId]: _, ...rest } = prev
      return rest
    })
    setTrainingOptions(prev => {
      const { [matchId]: _, ...rest } = prev
      return rest
    })
    setShowTrainingDialog(null)
    
    toast.success('Match approved with detailed training feedback - system learning enhanced')
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
      onMatchUpdate(match.bankTransaction.id, 'approved', category, 'Bulk approved - high confidence match')
    })
    
    if (highConfidenceMatches.length > 0) {
      toast.success(`Auto-approved ${highConfidenceMatches.length} high-confidence matches`)
    } else {
      toast.info('No high-confidence matches found for bulk approval')
    }
  }
  
  const guessCategory = (merchantOrDescription: string): Category => {
    // This function is now deprecated since we have proper categorization rules
    // But keeping it as a fallback
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
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Auto-Categorized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{autoCategorizationRate}%</div>
            <p className="text-xs text-muted-foreground">System confidence</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{highConfidenceMatches.length}</div>
            <p className="text-xs text-muted-foreground">Ready for bulk approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{needsReviewMatches.length}</div>
            <p className="text-xs text-muted-foreground">Manual verification needed</p>
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
                  <Lightning size={14} className="mr-1" />
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
                      <div className="space-y-1">
                        <Select
                          value={selectedCategory[match.bankTransaction.id] || 
                                 match.bankTransaction.category ||
                                 match.suggestedReceipt?.category ||
                                 guessCategory(match.suggestedReceipt?.merchant || match.bankTransaction.description)}
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
                        {(match.bankTransaction.category || match.suggestedReceipt?.category) && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <Robot size={12} />
                            <span>Auto-categorized</span>
                          </div>
                        )}
                      </div>
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
                          <Check size={14} className="mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(match.bankTransaction.id, true)}
                          className="border-green-200 text-green-700 hover:bg-green-50"
                        >
                          <Brain size={14} className="mr-1" />
                          Train
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
      
      {/* Training Feedback Dialog */}
      {showTrainingDialog && (
        <Dialog open={!!showTrainingDialog} onOpenChange={() => setShowTrainingDialog(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                Advanced Training Mode
              </DialogTitle>
              <DialogDescription>
                Provide detailed feedback to improve automatic categorization and matching accuracy.
              </DialogDescription>
            </DialogHeader>
            
            {(() => {
              const match = matches.find(m => m.bankTransaction.id === showTrainingDialog)
              if (!match) return null
              
              const currentCategory = selectedCategory[showTrainingDialog] || 
                                    (match.suggestedReceipt?.category as Category) || 
                                    'Miscellaneous'
              
              const currentTrainingOptions = trainingOptions[showTrainingDialog] || {
                createRule: true,
                isRecurring: false,
                confidence: 'medium' as const
              }
              
              return (
                <div className="space-y-6">
                  {/* Transaction Details */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Bank Transaction</Label>
                      <div className="p-3 bg-muted rounded-lg space-y-1">
                        <p className="font-medium">{formatAmount(match.bankTransaction.amount)}</p>
                        <p className="text-sm text-muted-foreground">{match.bankTransaction.date}</p>
                        <p className="text-sm">{match.bankTransaction.description}</p>
                        {match.bankTransaction.utr && (
                          <p className="text-xs text-muted-foreground">UTR: {match.bankTransaction.utr}</p>
                        )}
                      </div>
                    </div>
                    
                    {match.suggestedReceipt && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Matched Receipt</Label>
                        <div className="p-3 bg-muted rounded-lg space-y-1">
                          <p className="font-medium">{match.suggestedReceipt.merchant}</p>
                          <p className="text-sm text-muted-foreground">{match.suggestedReceipt.date}</p>
                          <p className="text-sm">{formatAmount(match.suggestedReceipt.amount)}</p>
                          {match.suggestedReceipt.utr && (
                            <p className="text-xs text-muted-foreground">UTR: {match.suggestedReceipt.utr}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Match Quality Assessment */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p><strong>Match Quality:</strong> {match.matchScore}% confidence</p>
                        <p><strong>Reasons:</strong> {match.matchReasons.join(', ')}</p>
                        {(match.bankTransaction.category || match.suggestedReceipt?.category) && (
                          <p className="flex items-center gap-1 text-blue-600">
                            <Robot size={12} />
                            <strong>Auto-detected category:</strong> {match.bankTransaction.category || match.suggestedReceipt?.category}
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <Separator />
                  
                  {/* Category Selection */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Confirm Category</Label>
                      <Select
                        value={currentCategory}
                        onValueChange={(value: Category) => 
                          setSelectedCategory(prev => ({
                            ...prev,
                            [showTrainingDialog]: value
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(match.bankTransaction.category || match.suggestedReceipt?.category) && 
                       currentCategory !== (match.bankTransaction.category || match.suggestedReceipt?.category) && (
                        <p className="text-sm text-orange-600">
                          <Target size={12} className="inline mr-1" />
                          You're overriding the system's automatic categorization
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Training Options */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Training Options</Label>
                    
                    <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="create-rule"
                          checked={currentTrainingOptions.createRule}
                          onCheckedChange={(checked) => 
                            setTrainingOptions(prev => ({
                              ...prev,
                              [showTrainingDialog]: {
                                ...currentTrainingOptions,
                                createRule: checked as boolean
                              }
                            }))
                          }
                        />
                        <Label htmlFor="create-rule" className="text-sm">
                          Create/update categorization rule for similar transactions
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="is-recurring"
                          checked={currentTrainingOptions.isRecurring}
                          onCheckedChange={(checked) => 
                            setTrainingOptions(prev => ({
                              ...prev,
                              [showTrainingDialog]: {
                                ...currentTrainingOptions,
                                isRecurring: checked as boolean
                              }
                            }))
                          }
                        />
                        <Label htmlFor="is-recurring" className="text-sm">
                          This is a recurring transaction (monthly bills, subscriptions, etc.)
                        </Label>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Training confidence level:</Label>
                        <Select
                          value={currentTrainingOptions.confidence}
                          onValueChange={(value: 'low' | 'medium' | 'high') => 
                            setTrainingOptions(prev => ({
                              ...prev,
                              [showTrainingDialog]: {
                                ...currentTrainingOptions,
                                confidence: value
                              }
                            }))
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low - Pattern might vary</SelectItem>
                            <SelectItem value="medium">Medium - Generally consistent</SelectItem>
                            <SelectItem value="high">High - Always categorize this way</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Detailed Feedback */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="detailed-feedback" className="text-base font-medium">
                        Detailed Training Feedback
                      </Label>
                      <Textarea
                        id="detailed-feedback"
                        placeholder="Provide specific context about this transaction that will help the system learn better patterns:&#10;&#10;Examples:&#10;• 'This merchant uses different names but always shows XYZ in description'&#10;• 'Monthly subscription payment - amount is always exactly ₹299'&#10;• 'Local grocery store - categorize all similar UPI payments to Food & Dining'&#10;• 'This is a business expense, not personal shopping'&#10;&#10;The more specific you are, the better the system will learn to handle similar cases automatically."
                        value={feedbackText[showTrainingDialog] || ''}
                        onChange={(e) => setFeedbackText(prev => ({
                          ...prev,
                          [showTrainingDialog]: e.target.value
                        }))}
                        className="min-h-[120px]"
                      />
                      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-700">
                          <p className="font-medium mb-1">Training Impact:</p>
                          <ul className="text-xs space-y-1">
                            {currentTrainingOptions.createRule && <li>• New categorization patterns will be learned</li>}
                            {currentTrainingOptions.isRecurring && <li>• System will prioritize consistency for this merchant</li>}
                            <li>• Confidence level: {currentTrainingOptions.confidence} - affects future auto-categorization</li>
                            <li>• Your feedback helps improve matching for similar transactions</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowTrainingDialog(null)}
                    >
                      Cancel
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleApprove(showTrainingDialog)}
                      >
                        <Check size={14} className="mr-2" />
                        Simple Approve
                      </Button>
                      <Button
                        onClick={() => handleApproveWithTraining(showTrainingDialog)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <TrendUp size={14} className="mr-2" />
                        Approve & Train System
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}