import React, { useState, useMemo } from 'react'
import { Search, Filter, Tag, Calendar, ArrowUpDown, Check, X, Edit2, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { BankTransaction, Category, CategoryRule } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { learnFromApprovedMatch } from '@/lib/categorization'

interface TransactionsListProps {
  transactions: BankTransaction[]
  onTransactionsUpdate: (transactions: BankTransaction[]) => void
  categoryRules: CategoryRule[]
  onRulesUpdate: (rules: CategoryRule[]) => void
}

const categoryColors: Record<Category, string> = {
  'Food & Dining': 'bg-orange-100 text-orange-800 border-orange-200',
  'Travel & Transport': 'bg-blue-100 text-blue-800 border-blue-200',
  'Utilities & Bills': 'bg-green-100 text-green-800 border-green-200',
  'Shopping': 'bg-purple-100 text-purple-800 border-purple-200',
  'Entertainment': 'bg-pink-100 text-pink-800 border-pink-200',
  'Healthcare': 'bg-teal-100 text-teal-800 border-teal-200',
  'Education': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Miscellaneous': 'bg-gray-100 text-gray-800 border-gray-200'
}

export function TransactionsList({ transactions, onTransactionsUpdate, categoryRules, onRulesUpdate }: TransactionsListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all' | 'uncategorized'>('all')
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'merchant'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null)
  const [editCategory, setEditCategory] = useState<Category>('Miscellaneous')
  const [editNotes, setEditNotes] = useState('')

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (
          !transaction.description?.toLowerCase().includes(searchLower) &&
          !transaction.vpa?.toLowerCase().includes(searchLower) &&
          !transaction.utr?.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'uncategorized') {
          if (transaction.category) return false
        } else {
          if (transaction.category !== categoryFilter) return false
        }
      }

      // Date range filter
      if (dateRange !== 'all') {
        const transactionDate = new Date(transaction.date)
        const now = new Date()
        const daysAgo = {
          '7d': 7,
          '30d': 30,
          '90d': 90
        }[dateRange]
        
        if (daysAgo) {
          const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
          if (transactionDate < cutoffDate) return false
        }
      }

      return true
    })

    // Sort transactions
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'merchant':
          comparison = (a.description || '').localeCompare(b.description || '')
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [transactions, searchTerm, categoryFilter, dateRange, sortBy, sortOrder])

  const handleEditTransaction = (transaction: BankTransaction) => {
    setEditingTransaction(transaction)
    setEditCategory(transaction.category || 'Miscellaneous')
    setEditNotes(transaction.notes || '')
  }

  const handleSaveTransaction = () => {
    if (!editingTransaction) return

    const updatedTransactions = transactions.map(t => 
      t.id === editingTransaction.id 
        ? { ...t, category: editCategory, notes: editNotes.trim() || undefined }
        : t
    )

    onTransactionsUpdate(updatedTransactions)

    // Learn from manual categorization
    if (editCategory !== editingTransaction.category) {
      const updatedRules = learnFromApprovedMatch(
        editingTransaction,
        null, // No receipt data for manual categorization
        editCategory,
        categoryRules,
        `Manual categorization: ${editNotes || 'User-assigned category'}`
      )
      onRulesUpdate(updatedRules)
      
      toast.success(`Transaction categorized as ${editCategory} and rule learned`)
    } else {
      toast.success('Transaction updated')
    }

    setEditingTransaction(null)
  }

  const handleQuickCategorize = (transactionId: string, category: Category) => {
    const transaction = transactions.find(t => t.id === transactionId)
    if (!transaction) return

    const updatedTransactions = transactions.map(t => 
      t.id === transactionId ? { ...t, category } : t
    )

    onTransactionsUpdate(updatedTransactions)

    // Learn from quick categorization
    const updatedRules = learnFromApprovedMatch(
      transaction,
      null, // No receipt data for manual categorization
      category,
      categoryRules,
      `Quick categorization: User selected ${category}`
    )
    onRulesUpdate(updatedRules)
    
    toast.success(`Transaction categorized as ${category}`)
  }

  const handleBulkCategorize = (category: Category) => {
    const uncategorizedTransactions = filteredAndSortedTransactions.filter(t => !t.category)
    
    if (uncategorizedTransactions.length === 0) {
      toast.error('No uncategorized transactions found in current filter')
      return
    }

    const updatedTransactions = transactions.map(t => 
      uncategorizedTransactions.some(ut => ut.id === t.id) 
        ? { ...t, category }
        : t
    )

    onTransactionsUpdate(updatedTransactions)
    toast.success(`Categorized ${uncategorizedTransactions.length} transactions as ${category}`)
  }

  const stats = useMemo(() => {
    const total = filteredAndSortedTransactions.length
    const categorized = filteredAndSortedTransactions.filter(t => t.category).length
    const totalAmount = filteredAndSortedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    return { total, categorized, uncategorized: total - categorized, totalAmount }
  }, [filteredAndSortedTransactions])

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)} total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categorized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.categorized}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.categorized / stats.total) * 100) : 0}% complete
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Uncategorized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.uncategorized}</div>
            <p className="text-xs text-muted-foreground">
              Need categorization
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={(value) => handleBulkCategorize(value as Category)}>
              <SelectTrigger>
                <SelectValue placeholder="Bulk categorize" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>
                    Categorize all as {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={(value: Category | 'all' | 'uncategorized') => setCategoryFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={(value: 'all' | '7d' | '30d' | '90d') => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={(value: 'date' | 'amount' | 'merchant') => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="merchant">Merchant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Order</Label>
              <Button 
                variant="outline" 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full justify-center"
              >
                <ArrowUpDown size={16} className="mr-2" />
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredAndSortedTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAndSortedTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search size={32} className="mx-auto mb-4" />
                <p>No transactions found matching your filters</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </div>
            ) : (
              filteredAndSortedTransactions.map(transaction => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{transaction.description || 'Unknown Merchant'}</p>
                      {transaction.category && (
                        <Badge variant="secondary" className={categoryColors[transaction.category]}>
                          {transaction.category}
                        </Badge>
                      )}
                      {transaction.matched && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                          <Check size={12} className="mr-1" />
                          Matched
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{formatDate(transaction.date)} • {transaction.vpa || 'No VPA'}</p>
                      {transaction.utr && <p>UTR: {transaction.utr}</p>}
                      {transaction.notes && <p className="italic">"{transaction.notes}"</p>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.amount < 0 ? 'Debit' : 'Credit'}
                      </p>
                    </div>
                    
                    {/* Quick Categorization */}
                    {!transaction.category && (
                      <div className="flex items-center gap-2">
                        {/* Quick category buttons for common categories */}
                        <div className="hidden lg:flex gap-1">
                          {['Food & Dining', 'Shopping', 'Travel & Transport'].map(category => (
                            <Button
                              key={category}
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickCategorize(transaction.id, category as Category)}
                              className="h-7 px-2 text-xs"
                              title={`Categorize as ${category}`}
                            >
                              {category === 'Food & Dining' && '🍽️'}
                              {category === 'Shopping' && '🛍️'}
                              {category === 'Travel & Transport' && '🚗'}
                            </Button>
                          ))}
                        </div>
                        
                        {/* Full category selector */}
                        <Select onValueChange={(category: Category) => handleQuickCategorize(transaction.id, category)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <Plus size={12} className="mr-1" />
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(category => (
                              <SelectItem key={category} value={category} className="text-xs">
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* Change existing category */}
                    {transaction.category && (
                      <Select 
                        value={transaction.category} 
                        onValueChange={(category: Category) => handleQuickCategorize(transaction.id, category)}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <Tag size={12} className="mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(category => (
                            <SelectItem key={category} value={category} className="text-xs">
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit2 size={14} />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Transaction</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Merchant</Label>
                            <p className="text-sm font-medium">{transaction.description || 'Unknown'}</p>
                          </div>
                          
                          <div>
                            <Label>Amount</Label>
                            <p className="text-sm font-medium">{formatCurrency(Math.abs(transaction.amount))}</p>
                          </div>
                          
                          <div>
                            <Label>Date</Label>
                            <p className="text-sm font-medium">{formatDate(transaction.date)}</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={editCategory} onValueChange={(value: Category) => setEditCategory(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(category => (
                                  <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              placeholder="Add notes or categorization details..."
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              rows={3}
                            />
                          </div>
                          
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditingTransaction(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleSaveTransaction}>
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}