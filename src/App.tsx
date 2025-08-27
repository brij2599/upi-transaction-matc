import React, { useState, useEffect } from 'react'
import { Upload, Camera, ArrowLeftRight, Download } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast, Toaster } from 'sonner'
import { FileUploadSimple } from '@/components/FileUploadSimple'

function App() {
  const [transactionCount, setTransactionCount] = useState(0)
  
  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">UPI Matcher</h1>
              <p className="text-muted-foreground">Reconcile bank statements with PhonePe receipts</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-lg">{transactionCount}</p>
                  <p className="text-muted-foreground">Bank Txns</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload size={16} />
              Upload
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Camera size={16} />
              Receipts
            </TabsTrigger>
            <TabsTrigger value="matching" className="flex items-center gap-2">
              <ArrowLeftRight size={16} />
              Match
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download size={16} />
              Export
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <FileUploadSimple onFilesUploaded={setTransactionCount} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Transactions</CardTitle>
                  <CardDescription>
                    {transactionCount} bank transactions loaded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionCount === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Upload size={32} className="mx-auto mb-4" />
                      <p>No bank transactions uploaded yet</p>
                      <p className="text-sm mt-1">Upload a CSV file to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Transactions</p>
                          <p className="text-xl font-bold">{transactionCount}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="receipts">
            <Card>
              <CardHeader>
                <CardTitle>Upload PhonePe Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Receipts functionality coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="matching">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Matching</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Matching functionality coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Export functionality coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App