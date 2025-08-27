import React, { useState, useMemo } from 'react'
import { TrendUp, Calendar, ChartPie, ChartBar, ArrowUpRight, ArrowDownRight } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TransactionMatch, Category } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'

interface SpendingReportProps {
  matches: TransactionMatch[]
}

type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all'

interface CategorySpending {
  category: Category | 'Uncategorized'
  amount: number
  count: number
  percentage: number
  trend?: 'up' | 'down' | 'stable'
  avgTransactionSize: number
}

interface MonthlySpending {
  month: string
  amount: number
  categories: Record<string, number>
}

export function SpendingReport({ matches }: SpendingReportProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const approvedMatches = matches.filter(m => m.status === 'approved')
  
  // Filter matches based on time range
  const filteredMatches = useMemo(() => {
    if (timeRange === 'all') return approvedMatches
    
    const now = new Date()
    const startDate = new Date()
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }
    
    return approvedMatches.filter(match => 
      new Date(match.bankTransaction.date) >= startDate
    )
  }, [approvedMatches, timeRange])

  // Calculate category spending
  const categorySpending = useMemo((): CategorySpending[] => {
    const spending: Record<string, { amount: number; count: number }> = {}
    
    filteredMatches.forEach(match => {
      const category = match.bankTransaction.category || 'Uncategorized'
      if (!spending[category]) {
        spending[category] = { amount: 0, count: 0 }
      }
      spending[category].amount += match.bankTransaction.amount
      spending[category].count += 1
    })
    
    const totalAmount = Object.values(spending).reduce((sum, s) => sum + s.amount, 0)
    
    return Object.entries(spending).map(([category, data]) => ({
      category: category as Category | 'Uncategorized',
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      avgTransactionSize: data.count > 0 ? data.amount / data.count : 0,
      trend: 'stable' as const // We'll implement trend calculation later
    })).sort((a, b) => b.amount - a.amount)
  }, [filteredMatches])

  // Calculate monthly spending trend
  const monthlySpending = useMemo((): MonthlySpending[] => {
    const monthly: Record<string, MonthlySpending> = {}
    
    filteredMatches.forEach(match => {
      const date = new Date(match.bankTransaction.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      if (!monthly[monthKey]) {
        monthly[monthKey] = {
          month: monthName,
          amount: 0,
          categories: {}
        }
      }
      
      const category = match.bankTransaction.category || 'Uncategorized'
      monthly[monthKey].amount += match.bankTransaction.amount
      monthly[monthKey].categories[category] = (monthly[monthKey].categories[category] || 0) + match.bankTransaction.amount
    })
    
    return Object.values(monthly).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }, [filteredMatches])

  const totalSpending = categorySpending.reduce((sum, cat) => sum + cat.amount, 0)
  const avgTransactionSize = filteredMatches.length > 0 ? totalSpending / filteredMatches.length : 0
  const largestCategory = categorySpending[0]

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getCategoryColor = (category: string, index: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-red-100 text-red-800',
      'bg-orange-100 text-orange-800'
    ]
    return colors[index % colors.length]
  }

  if (filteredMatches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <ChartBar size={48} className="mx-auto mb-4 opacity-50" />
            <p>No approved transactions to analyze yet.</p>
            <p className="text-sm mt-1">Approve some transaction matches to generate spending reports.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Spending Analysis</h2>
          <p className="text-muted-foreground">
            Insights from {filteredMatches.length} approved transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(totalSpending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredMatches.length} transactions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(avgTransactionSize)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per transaction
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{largestCategory?.category || 'None'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {largestCategory ? formatAmount(largestCategory.amount) : '₹0'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorySpending.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active categories
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>
                Breakdown of expenses across different categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorySpending.map((cat, index) => (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getCategoryColor(cat.category, index)}>
                          {cat.category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {cat.count} transactions
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatAmount(cat.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {cat.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <Progress value={cat.percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      Avg: {formatAmount(cat.avgTransactionSize)} per transaction
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Spending Trend</CardTitle>
              <CardDescription>
                Track your spending patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlySpending.map((month, index) => (
                  <div key={month.month} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <div className="font-medium">{month.month}</div>
                      <div className="text-sm text-muted-foreground">
                        {Object.keys(month.categories).length} categories
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatAmount(month.amount)}</div>
                      {index > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          {month.amount > monthlySpending[index - 1].amount ? (
                            <>
                              <ArrowUpRight size={12} className="text-red-500" />
                              <span className="text-red-600">
                                +{(((month.amount - monthlySpending[index - 1].amount) / monthlySpending[index - 1].amount) * 100).toFixed(1)}%
                              </span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight size={12} className="text-green-500" />
                              <span className="text-green-600">
                                {(((month.amount - monthlySpending[index - 1].amount) / monthlySpending[index - 1].amount) * 100).toFixed(1)}%
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendUp size={18} />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">Spending Pattern</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Your largest expense category is {largestCategory?.category}, accounting for {largestCategory?.percentage.toFixed(1)}% of total spending.
                  </p>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800">Transaction Behavior</p>
                  <p className="text-xs text-green-600 mt-1">
                    You typically spend {formatAmount(avgTransactionSize)} per transaction across {categorySpending.length} different categories.
                  </p>
                </div>
                
                {categorySpending.some(c => c.category === 'Food & Dining' && c.percentage > 30) && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm font-medium text-yellow-800">Food Spending Alert</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Food & dining represents a significant portion of your spending. Consider tracking meal expenses more closely.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Spending Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p>Based on your spending patterns:</p>
                  <ul className="space-y-1 text-muted-foreground text-xs ml-4">
                    <li>• Set monthly budgets for your top 3 categories</li>
                    <li>• Track {largestCategory?.category} expenses more closely</li>
                    <li>• Consider using merchant-specific payment methods for better tracking</li>
                    <li>• Review transactions with low match confidence regularly</li>
                  </ul>
                </div>
                
                <Button variant="outline" className="w-full mt-4">
                  <Calendar size={14} className="mr-2" />
                  Set Category Budgets
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}