import React, { useState } from 'react'
import { Plus, Trash, Edit3, Tag, Palette } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

export interface CategoryDefinition {
  id: string
  name: string
  description: string
  color: string
  icon: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  transactionCount?: number
}

interface CategoriesAdminProps {
  onCategoriesUpdate?: (categories: CategoryDefinition[]) => void
}

const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'food-dining',
    name: 'Food & Dining',
    description: 'Restaurants, food delivery, groceries, and dining expenses',
    color: '#ef4444',
    icon: '🍽️',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'travel-transport',
    name: 'Travel & Transport',
    description: 'Uber, Ola, flights, trains, buses, fuel, and travel expenses',
    color: '#3b82f6',
    icon: '🚗',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'utilities-bills',
    name: 'Utilities & Bills',
    description: 'Electricity, water, internet, phone, and other utility bills',
    color: '#f59e0b',
    icon: '💡',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'shopping',
    name: 'Shopping',
    description: 'Online shopping, retail purchases, clothing, electronics',
    color: '#8b5cf6',
    icon: '🛍️',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    description: 'Movies, games, subscriptions, streaming services, events',
    color: '#ec4899',
    icon: '🎬',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Medical expenses, pharmacy, doctor visits, health insurance',
    color: '#10b981',
    icon: '🏥',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Online courses, books, training, educational expenses',
    color: '#06b6d4',
    icon: '📚',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'miscellaneous',
    name: 'Miscellaneous',
    description: 'Other expenses that don\'t fit into specific categories',
    color: '#6b7280',
    icon: '📦',
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString()
  }
]

export function CategoriesAdmin({ onCategoriesUpdate }: CategoriesAdminProps) {
  const [categories, setCategories] = useKV<CategoryDefinition[]>('category-definitions', DEFAULT_CATEGORIES)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryDefinition | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: '📦'
  })

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      toast.error('Please enter a category name')
      return
    }

    // Check for duplicate names
    if (categories?.some(cat => cat.name.toLowerCase() === newCategory.name.toLowerCase())) {
      toast.error('A category with this name already exists')
      return
    }

    const category: CategoryDefinition = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newCategory.name.trim(),
      description: newCategory.description.trim(),
      color: newCategory.color,
      icon: newCategory.icon,
      isDefault: false,
      isActive: true,
      createdAt: new Date().toISOString()
    }

    const updatedCategories = [...(categories || []), category]
    setCategories(updatedCategories)
    onCategoriesUpdate?.(updatedCategories)
    
    setNewCategory({ name: '', description: '', color: '#3b82f6', icon: '📦' })
    setIsAddingCategory(false)
    toast.success('Category added successfully')
  }

  const handleUpdateCategory = () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast.error('Please enter a category name')
      return
    }

    // Check for duplicate names (excluding current category)
    if (categories?.some(cat => 
      cat.id !== editingCategory.id && 
      cat.name.toLowerCase() === editingCategory.name.toLowerCase()
    )) {
      toast.error('A category with this name already exists')
      return
    }

    const updatedCategories = categories?.map(cat =>
      cat.id === editingCategory.id ? editingCategory : cat
    ) || []
    
    setCategories(updatedCategories)
    onCategoriesUpdate?.(updatedCategories)
    setEditingCategory(null)
    toast.success('Category updated successfully')
  }

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories?.find(cat => cat.id === categoryId)
    if (!category) return

    if (category.isDefault) {
      toast.error('Cannot delete default categories')
      return
    }

    const updatedCategories = categories?.filter(cat => cat.id !== categoryId) || []
    setCategories(updatedCategories)
    onCategoriesUpdate?.(updatedCategories)
    toast.success('Category deleted')
  }

  const handleToggleCategory = (categoryId: string) => {
    const updatedCategories = categories?.map(cat =>
      cat.id === categoryId ? { ...cat, isActive: !cat.isActive } : cat
    ) || []
    
    setCategories(updatedCategories)
    onCategoriesUpdate?.(updatedCategories)
    
    const category = categories?.find(cat => cat.id === categoryId)
    toast.success(`Category ${category?.isActive ? 'deactivated' : 'activated'}`)
  }

  const activeCategoriesCount = categories?.filter(cat => cat.isActive).length || 0
  const customCategoriesCount = categories?.filter(cat => !cat.isDefault).length || 0

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tag size={16} className="text-primary" />
              <div>
                <p className="text-2xl font-bold">{categories?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Palette size={16} className="text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeCategoriesCount}</p>
                <p className="text-xs text-muted-foreground">Active Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Plus size={16} className="text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{customCategoriesCount}</p>
                <p className="text-xs text-muted-foreground">Custom Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tag size={16} className="text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{categories?.filter(cat => cat.isDefault).length || 0}</p>
                <p className="text-xs text-muted-foreground">Default Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Categories Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categories Management</CardTitle>
              <CardDescription>
                Manage transaction categories used throughout the application
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddingCategory(true)}>
              <Plus size={16} className="mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Add New Category Form */}
          {isAddingCategory && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    placeholder="e.g., Investments"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category-color">Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="category-color"
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={newCategory.color}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  placeholder="Describe what types of transactions belong to this category..."
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category-icon">Icon (Emoji)</Label>
                <Input
                  id="category-icon"
                  placeholder="e.g., 💰"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                  maxLength={2}
                  className="w-20"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddCategory}>Add Category</Button>
                <Button variant="outline" onClick={() => setIsAddingCategory(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          <Separator />
          
          {/* Categories List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {!categories || categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tag size={32} className="mx-auto mb-4" />
                  <p>No categories found</p>
                  <p className="text-sm">Add categories to organize your transactions</p>
                </div>
              ) : (
                categories.map(category => (
                  <Card key={category.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-lg">{category.icon}</span>
                          <h4 className="font-medium">{category.name}</h4>
                          
                          <div className="flex gap-1">
                            {category.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                            
                            <Badge 
                              variant={category.isActive ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {category.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created: {new Date(category.createdAt).toLocaleDateString()}</span>
                          {category.transactionCount !== undefined && (
                            <span>{category.transactionCount} transactions</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleCategory(category.id)}
                        >
                          {category.isActive ? '⏸️' : '▶️'}
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCategory({ ...category })}
                            >
                              <Edit3 size={14} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Category</DialogTitle>
                              <DialogDescription>
                                Update category information
                              </DialogDescription>
                            </DialogHeader>
                            
                            {editingCategory && (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Category Name</Label>
                                  <Input
                                    value={editingCategory.name}
                                    onChange={(e) => setEditingCategory(prev => 
                                      prev ? { ...prev, name: e.target.value } : null
                                    )}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Textarea
                                    value={editingCategory.description}
                                    onChange={(e) => setEditingCategory(prev => 
                                      prev ? { ...prev, description: e.target.value } : null
                                    )}
                                  />
                                </div>
                                
                                <div className="grid gap-4 grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Color</Label>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="color"
                                        value={editingCategory.color}
                                        onChange={(e) => setEditingCategory(prev => 
                                          prev ? { ...prev, color: e.target.value } : null
                                        )}
                                        className="w-16 h-10 p-1"
                                      />
                                      <Input
                                        value={editingCategory.color}
                                        onChange={(e) => setEditingCategory(prev => 
                                          prev ? { ...prev, color: e.target.value } : null
                                        )}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label>Icon</Label>
                                    <Input
                                      value={editingCategory.icon}
                                      onChange={(e) => setEditingCategory(prev => 
                                        prev ? { ...prev, icon: e.target.value } : null
                                      )}
                                      maxLength={2}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingCategory(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleUpdateCategory}>
                                Update Category
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        {!category.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
          
          {/* Warning for default categories */}
          <Alert>
            <Tag className="h-4 w-4" />
            <AlertDescription>
              Default categories cannot be deleted but can be deactivated. Custom categories can be fully managed.
              Changes to categories will affect all existing and future transaction categorizations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}