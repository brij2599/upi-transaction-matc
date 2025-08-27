import React from 'react'
import { TrendUp, Robot, Target, CheckCircle, Brain, Lightbulb, Lightning, Activity } from '@phosphor-icons/react'
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
  const pendingMatches = matches.filter(m => m.status === 'pending').length
  const highConfidenceMatches = matches.filter(m => m.matchScore >= 80).length
  const needsTraining = matches.filter(m => m.matchScore < 60 && m.status === 'pending').length
  
  const categorizationRate = totalTransactions > 0 ? Math.round((categorizedTransactions / totalTransactions) * 100) : 0
  const matchingRate = totalTransactions > 0 ? Math.round((approvedMatches / totalTransactions) * 100) : 0
  const confidenceRate = totalTransactions > 0 ? Math.round((highConfidenceMatches / totalTransactions) * 100) : 0
  
  const categoryBreakdown = matches.reduce((acc, match) => {
    const category = match.bankTransaction.category || match.suggestedReceipt?.category
    if (category) {
      acc[category] = (acc[category] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
  
  const mostPopularCategory = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b - a)[0]
  
  // Calculate learning effectiveness
  const userRulesUsage = categoryRules
    .filter(r => r.createdBy === 'user')
    .reduce((sum, rule) => sum + rule.usageCount, 0)
  
  const systemRulesUsage = categoryRules
    .filter(r => r.createdBy === 'system')
    .reduce((sum, rule) => sum + rule.usageCount, 0)
  
  return (
    <div className="space-y-4">
      {/* Training Progress Indicator */}
      {pendingMatches > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm">System Training Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{pendingMatches}</p>
                <p className="text-xs text-muted-foreground">Waiting for Review</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{highConfidenceMatches}</p>
                <p className="text-xs text-muted-foreground">High Confidence</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-orange-600">{needsTraining}</p>
                <p className="text-xs text-muted-foreground">Needs Training</p>
              </div>
            </div>
            {needsTraining > 0 && (
              <div className="mt-3 p-2 bg-orange-50 rounded-md">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <Lightbulb size={14} />
                  <span>{needsTraining} transactions need manual review to improve accuracy</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Auto-Categorization Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Categorization</CardTitle>
            <Robot className="h-4 w-4 text-blue-500" />
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
        
        {/* Match Confidence */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Match Confidence</CardTitle>
            <Lightning className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confidenceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {highConfidenceMatches} high-confidence matches
            </p>
            <div className="mt-3">
              <Progress value={confidenceRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
        
        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
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
        
        {/* Learning Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Progress</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userRules}</div>
            <p className="text-xs text-muted-foreground">
              Custom rules learned
            </p>
            <div className="mt-3 flex gap-1">
              <Badge variant="secondary" className="text-xs">
                {userRulesUsage} uses
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Category Breakdown */}
      {mostPopularCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Distribution</CardTitle>
            <CardDescription>Transaction breakdown and learning insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Most Common:</span>
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
              
              {/* Learning Effectiveness Insights */}
              {stats.userRules > 0 && (
                <div className="pt-3 border-t">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Brain size={14} />
                      Learning Insights
                    </h4>
                    <div className="grid gap-2 md:grid-cols-2 text-xs">
                      <div className="flex justify-between">
                        <span>System Rules Used:</span>
                        <Badge variant="secondary" className="text-xs">{systemRulesUsage}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Custom Rules Used:</span>
                        <Badge variant="outline" className="text-xs">{userRulesUsage}</Badge>
                      </div>
                    </div>
                    {userRulesUsage > systemRulesUsage * 0.3 && (
                      <div className="p-2 bg-green-50 rounded-md">
                        <p className="text-xs text-green-700 flex items-center gap-1">
                          <CheckCircle size={12} />
                          Custom rules are actively improving categorization
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}