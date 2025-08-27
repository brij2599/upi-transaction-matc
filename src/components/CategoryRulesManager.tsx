import React, { useState } from 'react'
import { Plus, Trash2, Bot, User, TrendingUp } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import type { CategoryRule, Category } from '@/lib/types'
import { CATEGORIES } from '@/lib/types'
import { getCategorizationStats, type CategorizationStats } from '@/lib/categorization'

interface CategoryRulesManagerProps {
  rules: CategoryRule[]
  onRulesUpdate: (rules: CategoryRule[]) => void
}

export function CategoryRulesManager({ rules, onRulesUpdate }: CategoryRulesManagerProps) {
  const [isAddingRule, setIsAddingRule] = useState(false)
  const [newRule, setNewRule] = useState({
    name: '',
    category: '' as Category,
    patterns: '',
    keywords: ''
  })
  
  const stats = getCategorizationStats(rules)
  
  const handleAddRule = () => {
    if (!newRule.name.trim() || !newRule.category) {
      toast.error('Please fill in rule name and category')
      return
    }
    
    const rule: CategoryRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newRule.name.trim(),
      category: newRule.category,
      patterns: newRule.patterns.split(',').map(p => p.trim()).filter(p => p.length > 0),
      keywords: newRule.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0),
      confidence: 0.8,
      createdBy: 'user',
      usageCount: 0
    }
    
    onRulesUpdate([...rules, rule])
    setNewRule({ name: '', category: '' as Category, patterns: '', keywords: '' })
    setIsAddingRule(false)
    toast.success('Categorization rule added successfully')
  }
  
  const handleDeleteRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId)
    if (rule?.createdBy === 'system') {
      toast.error('Cannot delete system rules')
      return
    }
    
    onRulesUpdate(rules.filter(r => r.id !== ruleId))
    toast.success('Rule deleted')
  }
  
  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`
  }
  
  const getRuleIcon = (createdBy: 'system' | 'user') => {
    return createdBy === 'system' ? (
      <Bot size={14} className="text-blue-500" />
    ) : (
      <User size={14} className="text-green-500" />
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp size={16} className="text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalRules}</p>
                <p className="text-xs text-muted-foreground">Total Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot size={16} className="text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.systemRules}</p>
                <p className="text-xs text-muted-foreground">System Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User size={16} className="text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.userRules}</p>
                <p className="text-xs text-muted-foreground">User Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp size={16} className="text-accent" />
              <div>
                <p className="text-2xl font-bold">
                  {stats.mostUsedRules.length > 0 ? stats.mostUsedRules[0].usageCount : 0}
                </p>
                <p className="text-xs text-muted-foreground">Most Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Category Distribution</CardTitle>
          <CardDescription>Number of rules per category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.categoryDistribution).map(([category, count]) => (
              <Badge key={category} variant="secondary" className="px-3 py-1">
                {category}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Add New Rule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categorization Rules</CardTitle>
              <CardDescription>
                Manage automatic categorization patterns and keywords
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAddingRule(!isAddingRule)}
              variant={isAddingRule ? "outline" : "default"}
            >
              <Plus size={16} className="mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isAddingRule && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    placeholder="e.g., Food Delivery Apps"
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rule-category">Category</Label>
                  <Select
                    value={newRule.category}
                    onValueChange={(value: Category) => setNewRule(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-patterns">Merchant Patterns</Label>
                <Input
                  id="rule-patterns"
                  placeholder="e.g., zomato, swiggy, uber eats (comma-separated)"
                  value={newRule.patterns}
                  onChange={(e) => setNewRule(prev => ({ ...prev, patterns: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-keywords">Keywords</Label>
                <Input
                  id="rule-keywords"
                  placeholder="e.g., food, delivery, restaurant (comma-separated)"
                  value={newRule.keywords}
                  onChange={(e) => setNewRule(prev => ({ ...prev, keywords: e.target.value }))}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddRule}>Add Rule</Button>
                <Button variant="outline" onClick={() => setIsAddingRule(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          <Separator />
          
          {/* Rules List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot size={32} className="mx-auto mb-4" />
                  <p>No categorization rules found</p>
                  <p className="text-sm">Add rules to enable automatic categorization</p>
                </div>
              ) : (
                rules.map(rule => (
                  <Card key={rule.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getRuleIcon(rule.createdBy)}
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {rule.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {formatConfidence(rule.confidence)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          {rule.patterns.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Patterns: </span>
                              <span className="text-sm">{rule.patterns.join(', ')}</span>
                            </div>
                          )}
                          
                          {rule.keywords.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Keywords: </span>
                              <span className="text-sm">{rule.keywords.join(', ')}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Used: {rule.usageCount} times</span>
                          {rule.lastUsed && (
                            <span>Last used: {new Date(rule.lastUsed).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      
                      {rule.createdBy === 'user' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}