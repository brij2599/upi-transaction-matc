import type { BankTransaction, PhonePeReceipt, Category, CategoryRule } from './types'

/**
 * Automatic transaction categorization service based on merchant patterns,
 * keywords, and user-defined rules that learn from approved matches
 */

// Default categorization rules based on common merchant patterns
const DEFAULT_RULES: Omit<CategoryRule, 'id' | 'usageCount' | 'lastUsed'>[] = [
  // Food & Dining
  {
    name: 'Food Delivery',
    category: 'Food & Dining',
    patterns: ['zomato', 'swiggy', 'uber eats', 'dominos', 'pizza hut', 'mcdonalds', 'kfc', 'subway'],
    keywords: ['food', 'restaurant', 'cafe', 'delivery', 'kitchen', 'biryani', 'pizza', 'burger'],
    confidence: 0.9,
    createdBy: 'system'
  },
  {
    name: 'Grocery & Supermarkets',
    category: 'Food & Dining',
    patterns: ['big bazaar', 'reliance fresh', 'more supermarket', 'dmart', 'spencer', 'grofers', 'blinkit'],
    keywords: ['grocery', 'supermarket', 'vegetables', 'fruits', 'provisions'],
    confidence: 0.85,
    createdBy: 'system'
  },
  
  // Travel & Transport
  {
    name: 'Taxi & Ride Share',
    category: 'Travel & Transport',
    patterns: ['uber', 'ola', 'rapido', 'auto rickshaw'],
    keywords: ['taxi', 'cab', 'ride', 'auto', 'transport'],
    confidence: 0.95,
    createdBy: 'system'
  },
  {
    name: 'Fuel Stations',
    category: 'Travel & Transport',
    patterns: ['iocl', 'hpcl', 'bpcl', 'reliance petrol', 'shell', 'essar'],
    keywords: ['petrol', 'diesel', 'fuel', 'gas station'],
    confidence: 0.9,
    createdBy: 'system'
  },
  {
    name: 'Public Transport',
    category: 'Travel & Transport',
    patterns: ['irctc', 'metro', 'bmtc', 'best', 'dtc'],
    keywords: ['train', 'metro', 'bus', 'ticket', 'transport'],
    confidence: 0.85,
    createdBy: 'system'
  },
  
  // Utilities & Bills
  {
    name: 'Electricity Bills',
    category: 'Utilities & Bills',
    patterns: ['bescom', 'msedcl', 'tneb', 'kseb', 'electricity board'],
    keywords: ['electricity', 'power', 'energy', 'bill'],
    confidence: 0.95,
    createdBy: 'system'
  },
  {
    name: 'Mobile & Internet',
    category: 'Utilities & Bills',
    patterns: ['airtel', 'jio', 'vi', 'vodafone', 'bsnl', 'broadband'],
    keywords: ['mobile', 'recharge', 'internet', 'broadband', 'telecom'],
    confidence: 0.9,
    createdBy: 'system'
  },
  {
    name: 'Water & Gas Bills',
    category: 'Utilities & Bills',
    patterns: ['bwssb', 'water board', 'gas agency', 'indane', 'hp gas'],
    keywords: ['water', 'gas', 'cylinder', 'municipal'],
    confidence: 0.85,
    createdBy: 'system'
  },
  
  // Shopping
  {
    name: 'Online Shopping',
    category: 'Shopping',
    patterns: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'paytm mall'],
    keywords: ['shopping', 'purchase', 'order', 'delivery'],
    confidence: 0.9,
    createdBy: 'system'
  },
  {
    name: 'Fashion & Apparel',
    category: 'Shopping',
    patterns: ['max fashion', 'lifestyle', 'pantaloons', 'westside', 'brand factory'],
    keywords: ['clothing', 'apparel', 'fashion', 'dress', 'shoes'],
    confidence: 0.85,
    createdBy: 'system'
  },
  
  // Entertainment
  {
    name: 'Movies & Events',
    category: 'Entertainment',
    patterns: ['bookmyshow', 'pvr', 'inox', 'cinepolis', 'carnival'],
    keywords: ['movie', 'cinema', 'ticket', 'show', 'event'],
    confidence: 0.9,
    createdBy: 'system'
  },
  {
    name: 'Streaming Services',
    category: 'Entertainment',
    patterns: ['netflix', 'amazon prime', 'hotstar', 'spotify', 'youtube premium'],
    keywords: ['streaming', 'subscription', 'music', 'video'],
    confidence: 0.95,
    createdBy: 'system'
  },
  
  // Healthcare
  {
    name: 'Pharmacy & Medicine',
    category: 'Healthcare',
    patterns: ['apollo pharmacy', 'medplus', 'netmeds', '1mg', 'pharmeasy'],
    keywords: ['medicine', 'pharmacy', 'medical', 'health', 'drug'],
    confidence: 0.9,
    createdBy: 'system'
  },
  {
    name: 'Hospitals & Clinics',
    category: 'Healthcare',
    patterns: ['hospital', 'clinic', 'diagnostic', 'pathology'],
    keywords: ['doctor', 'treatment', 'consultation', 'checkup', 'lab'],
    confidence: 0.85,
    createdBy: 'system'
  },
  
  // Education
  {
    name: 'Online Learning',
    category: 'Education',
    patterns: ['byju', 'unacademy', 'vedantu', 'coursera', 'udemy'],
    keywords: ['education', 'course', 'learning', 'class', 'tutorial'],
    confidence: 0.9,
    createdBy: 'system'
  }
]

/**
 * Generate unique ID for category rules
 */
function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Initialize default categorization rules
 */
export function initializeDefaultRules(): CategoryRule[] {
  return DEFAULT_RULES.map(rule => ({
    ...rule,
    id: generateRuleId(),
    usageCount: 0
  }))
}

/**
 * Match text against category rule patterns and keywords
 */
function matchesRule(text: string, rule: CategoryRule): { matches: boolean; confidence: number } {
  if (!text) return { matches: false, confidence: 0 }
  
  const normalizedText = text.toLowerCase().trim()
  
  // Check exact pattern matches (higher confidence)
  const patternMatches = rule.patterns.some(pattern => 
    normalizedText.includes(pattern.toLowerCase())
  )
  
  if (patternMatches) {
    return { matches: true, confidence: rule.confidence }
  }
  
  // Check keyword matches (lower confidence)
  const keywordMatches = rule.keywords.filter(keyword => 
    normalizedText.includes(keyword.toLowerCase())
  ).length
  
  if (keywordMatches > 0) {
    // Confidence decreases with fewer keyword matches
    const keywordConfidence = Math.min(rule.confidence * 0.7, 
      (keywordMatches / rule.keywords.length) * rule.confidence)
    return { matches: true, confidence: keywordConfidence }
  }
  
  return { matches: false, confidence: 0 }
}

/**
 * Categorize a transaction based on description and merchant info
 */
export function categorizeTransaction(
  transaction: BankTransaction | PhonePeReceipt,
  rules: CategoryRule[]
): { category: Category | null; confidence: number; matchedRule?: CategoryRule } {
  if (rules.length === 0) {
    return { category: null, confidence: 0 }
  }
  
  const textToAnalyze = 'merchant' in transaction 
    ? `${transaction.merchant}`.trim()
    : transaction.description || ''
  
  let bestMatch: { category: Category; confidence: number; rule: CategoryRule } | null = null
  
  for (const rule of rules) {
    const match = matchesRule(textToAnalyze, rule)
    
    if (match.matches && (!bestMatch || match.confidence > bestMatch.confidence)) {
      bestMatch = {
        category: rule.category,
        confidence: match.confidence,
        rule
      }
    }
  }
  
  if (bestMatch && bestMatch.confidence >= 0.5) {
    return {
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      matchedRule: bestMatch.rule
    }
  }
  
  return { category: null, confidence: 0 }
}

/**
 * Learn new categorization patterns from user-approved matches with enhanced training feedback
 */
export function learnFromApprovedMatch(
  transaction: BankTransaction,
  receipt: PhonePeReceipt | undefined,
  approvedCategory: Category,
  existingRules: CategoryRule[],
  trainingFeedback?: string
): CategoryRule[] {
  const updatedRules = [...existingRules]
  
  // Extract patterns from merchant name and transaction description
  const merchantName = receipt?.merchant || ''
  const description = transaction.description || ''
  
  // Parse training feedback for additional insights
  const isBulkTraining = trainingFeedback?.includes('[BULK_TRAINING:')
  const shouldCreateRule = !trainingFeedback?.includes('[TRAINING:') || 
                          !trainingFeedback?.includes('[BULK_TRAINING:') || 
                          trainingFeedback.includes('Create new categorization rule') ||
                          trainingFeedback.includes('Create bulk categorization rules')
  const isRecurring = trainingFeedback?.includes('This is a recurring transaction') || 
                     trainingFeedback?.includes('These are recurring transactions') || false
  const applyToSimilar = trainingFeedback?.includes('Apply to similar future transactions') || false
  const confidenceLevel = trainingFeedback?.includes('Confidence: high') ? 'high' :
                          trainingFeedback?.includes('Confidence: low') ? 'low' : 'medium'
  
  // Create new keywords from the transaction and feedback
  const baseKeywords = [
    ...merchantName.toLowerCase().split(/\s+/).filter(word => word.length > 3),
    ...description.toLowerCase().split(/\s+/).filter(word => word.length > 3)
  ]
  
  // Extract additional keywords from training feedback
  const feedbackKeywords = trainingFeedback ? 
    trainingFeedback.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !word.includes('[') && !word.includes(':'))
      .slice(0, 3) : [] // Limit to prevent noise
  
  const allKeywords = [...baseKeywords, ...feedbackKeywords]
    .filter((word, index, array) => array.indexOf(word) === index) // Remove duplicates
    .filter(word => !['training', 'system', 'transaction', 'payment'].includes(word)) // Filter common noise words
  
  if (allKeywords.length === 0 && !shouldCreateRule) return updatedRules
  
  // Determine confidence based on training feedback
  let baseConfidence = 0.7
  if (confidenceLevel === 'high') baseConfidence = 0.9
  else if (confidenceLevel === 'low') baseConfidence = 0.5
  
  // Boost confidence for recurring transactions
  if (isRecurring) baseConfidence = Math.min(0.95, baseConfidence + 0.1)
  
  // Boost confidence for bulk training with similar pattern application
  if (isBulkTraining && applyToSimilar) baseConfidence = Math.min(0.95, baseConfidence + 0.05)
  
  // Find existing rule for this category that might be enhanced
  const existingRule = updatedRules.find(rule => 
    rule.category === approvedCategory && 
    rule.createdBy === 'user' &&
    (allKeywords.some(keyword => 
      rule.keywords.includes(keyword) || rule.patterns.some(pattern => pattern.includes(keyword))
    ) || (merchantName && rule.patterns.some(pattern => pattern.includes(merchantName.toLowerCase()))))
  )
  
  if (existingRule && shouldCreateRule) {
    // Enhance existing rule with training feedback
    const enhancedKeywords = [...existingRule.keywords, ...allKeywords.filter(k => !existingRule.keywords.includes(k))].slice(0, 15)
    const enhancedPatterns = merchantName ? 
      [...existingRule.patterns, merchantName.toLowerCase()].filter((p, i, arr) => arr.indexOf(p) === i).slice(0, 10) : 
      existingRule.patterns
    
    const enhancedRule = {
      ...existingRule,
      name: isRecurring ? `${existingRule.name} (Recurring)` : 
            isBulkTraining ? `${existingRule.name} (Bulk Enhanced)` : existingRule.name,
      keywords: enhancedKeywords,
      patterns: enhancedPatterns,
      usageCount: existingRule.usageCount + 1,
      lastUsed: new Date().toISOString(),
      confidence: Math.min(0.95, Math.max(existingRule.confidence, baseConfidence)),
      metadata: {
        ...existingRule.metadata,
        isRecurring,
        applyToSimilar,
        isBulkTrained: isBulkTraining,
        trainingFeedback: trainingFeedback?.substring(0, 200), // Store first 200 chars of feedback
        lastTrainingUpdate: new Date().toISOString()
      }
    }
    
    const ruleIndex = updatedRules.findIndex(r => r.id === existingRule.id)
    updatedRules[ruleIndex] = enhancedRule
  } else if (shouldCreateRule) {
    // Create new user-defined rule with training insights
    const ruleName = isBulkTraining ? 
      `Bulk Rule - ${approvedCategory} (${merchantName || 'Multiple'})` :
      isRecurring ? 
        `Recurring ${approvedCategory} - ${merchantName || 'User Rule'}` :
        `User Rule - ${approvedCategory} (${merchantName || 'Custom'})`
    
    const newRule: CategoryRule = {
      id: generateRuleId(),
      name: ruleName.substring(0, 50), // Limit name length
      category: approvedCategory,
      patterns: merchantName ? [merchantName.toLowerCase()] : [],
      keywords: allKeywords.slice(0, 10), // Limit initial keywords
      confidence: baseConfidence,
      createdBy: 'user',
      usageCount: 1,
      lastUsed: new Date().toISOString(),
      metadata: {
        isRecurring,
        applyToSimilar,
        isBulkTrained: isBulkTraining,
        trainingFeedback: trainingFeedback?.substring(0, 200),
        createdFromTraining: true,
        confidenceLevel
      }
    }
    
    updatedRules.push(newRule)
  }
  
  // If this was a correction of auto-categorization, reduce confidence of conflicting rules
  const autoDetectedCategory = transaction.category || receipt?.category
  if (autoDetectedCategory && autoDetectedCategory !== approvedCategory) {
    updatedRules.forEach(rule => {
      if (rule.category === autoDetectedCategory) {
        const matchesCurrentTransaction = 
          allKeywords.some(keyword => rule.keywords.includes(keyword)) ||
          (merchantName && rule.patterns.some(pattern => pattern.includes(merchantName.toLowerCase())))
        
        if (matchesCurrentTransaction) {
          rule.confidence = Math.max(0.3, rule.confidence - 0.1)
          rule.metadata = {
            ...rule.metadata,
            lastCorrected: new Date().toISOString(),
            correctionCount: (rule.metadata?.correctionCount || 0) + 1
          }
        }
      }
    })
  }
  
  return updatedRules
}

/**
 * Update rule usage statistics
 */
export function updateRuleUsage(rules: CategoryRule[], ruleId: string): CategoryRule[] {
  return rules.map(rule => {
    if (rule.id === ruleId) {
      return {
        ...rule,
        usageCount: rule.usageCount + 1,
        lastUsed: new Date().toISOString()
      }
    }
    return rule
  })
}

/**
 * Get categorization statistics
 */
export interface CategorizationStats {
  totalRules: number
  systemRules: number
  userRules: number
  mostUsedRules: CategoryRule[]
  categoryDistribution: Record<Category, number>
}

export function getCategorizationStats(rules: CategoryRule[]): CategorizationStats {
  const systemRules = rules.filter(r => r.createdBy === 'system').length
  const userRules = rules.filter(r => r.createdBy === 'user').length
  const mostUsedRules = [...rules]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5)
  
  const categoryDistribution: Record<Category, number> = {} as Record<Category, number>
  rules.forEach(rule => {
    categoryDistribution[rule.category] = (categoryDistribution[rule.category] || 0) + 1
  })
  
  return {
    totalRules: rules.length,
    systemRules,
    userRules,
    mostUsedRules,
    categoryDistribution
  }
}