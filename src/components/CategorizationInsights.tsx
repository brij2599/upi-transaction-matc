import React from 'react'
import { TrendingUp, Bot, Target, CheckCircle } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { TransactionMatch, CategoryRule } from '@/lib/types'
import { getCategorizationStats } from '@/lib/categorization'

interface CategorizationInsightsProps {
  matches: TransactionMatch[]
  categoryRules: CategoryRule[]
}

export function CategorizationInsights({ matches, categoryRules }: CategorizationInsightsProps) {
  const stats = getCategorizationStats(categoryRules)
  
  const totalTransactions = matches.length
  const categorizedTransactions = matches.filter(m => 
    m.bankTransaction.category || m.suggestedReceipt?.category
  ).length
  
  const approvedMatches = matches.filter(m => m.status === 'approved').length
  const categorizationRate = totalTransactions > 0 ? Math.round((categorizedTransactions / totalTransactions) * 100) : 0
  const matchingRate = totalTransactions > 0 ? Math.round((approvedMatches / totalTransactions) * 100) : 0
  
  const categoryBreakdown = matches.reduce((acc, match) => {
    const category = match.bankTransaction.category || match.suggestedReceipt?.category
    if (category) {
      acc[category] = (acc[category] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
  
  const mostPopularCategory = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b - a)[0]
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Categorization Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Auto-Categorization</CardTitle>
          <Bot className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categorizationRate}%</div>
          <p className="text-xs text-muted-foreground">
            {categorizedTransactions} of {totalTransactions} transactions
          </p>
          <div className="mt-3">
            <Progress value={categorizationRate} className="h-2" />
          </div>
        </CardContent>
      </Card>
      
      {/* Matching Success */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Match Success</CardTitle>
          <Target className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{matchingRate}%</div>
          <p className="text-xs text-muted-foreground">
            {approvedMatches} approved matches
          </p>
          <div className="mt-3">
            <Progress value={matchingRate} className="h-2" />
          </div>
        </CardContent>
      </Card>
      
      {/* Rule Effectiveness */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalRules}</div>
          <p className="text-xs text-muted-foreground">
            {stats.systemRules} system + {stats.userRules} custom
          </p>
          <div className="mt-3 flex gap-1">
            <Badge variant="secondary" className="text-xs">
              {stats.systemRules} System
            </Badge>
            <Badge variant="outline" className="text-xs">
              {stats.userRules} Custom
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Top Category */}
      {mostPopularCategory && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
            <CardDescription>Transaction distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Top Category:</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {mostPopularCategory[0]} ({mostPopularCategory[1]} transactions)
                </Badge>
              </div>
              
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(categoryBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 6)
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between text-sm">
                      <span className="truncate">{category}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded">
                          <div 
                            className="h-full bg-primary rounded" 
                            style={{ 
                              width: `${(count / Math.max(...Object.values(categoryBreakdown))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-6">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}