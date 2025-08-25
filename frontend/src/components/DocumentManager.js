import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Upload, FileText, Download, Trash2, Eye, Search, 
  Filter, MoreHorizontal, Calendar, User, Archive,
  MessageCircle, Sparkles, FileType, Shield, RotateCw,
  Crop, Scissors, Copy, Move, ArrowUpDown, Layers,
  RefreshCw, AlertCircle, CheckCircle, Clock, Zap
} from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger, DialogFooter 
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DocumentManager = ({ darkMode }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('upload_date');
  const [aiProviders, setAiProviders] = useState([]);

  // AI Task State
  const [aiTaskDialogOpen, setAiTaskDialogOpen] = useState(false);
  const [aiTaskType, setAiTaskType] = useState('summarize');
  const [aiTaskInstructions, setAiTaskInstructions] = useState('');
  const [aiTaskProvider, setAiTaskProvider] = useState('openai');
  const [aiTaskModel, setAiTaskModel] = useState('gpt-4o-mini');
  const [aiTaskLoading, setAiTaskLoading] = useState(false);

  // File Upload
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(`Successfully uploaded ${file.name}`);
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  // Fetch functions
  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchAiProviders = async () => {
    try {
      const response = await axios.get(`${API}/ai/providers`);
      setAiProviders(response.data);
    } catch (error) {
      console.error('Failed to fetch AI providers:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchAiProviders();
  }, []);

  // Document actions
  const downloadDocument = async (docId, filename) => {
    try {
      const response = await axios.get(`${API}/documents/${docId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    }
  };

  const deleteDocument = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/documents/${docId}`);
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  // AI Task functions
  const performAiTask = async () => {
    if (!selectedDocument) return;

    setAiTaskLoading(true);
    try {
      const response = await axios.post(`${API}/ai/tasks`, {
        document_id: selectedDocument.id,
        task_type: aiTaskType,
        additional_instructions: aiTaskInstructions || undefined,
        model_provider: aiTaskProvider,
        model_name: aiTaskModel
      });

      toast.success(`${aiTaskType} completed successfully!`);
      
      // Show result in a dialog or new window
      const resultWindow = window.open('', '_blank');
      resultWindow.document.write(`
        <html>
          <head><title>AI Task Result</title></head>
          <body style="font-family: Arial, sans-serif; margin: 20px;">
            <h2>${aiTaskType.charAt(0).toUpperCase() + aiTaskType.slice(1)} Result</h2>
            <h3>Document: ${selectedDocument.filename}</h3>
            <div style="white-space: pre-wrap; background: #f5f5f5; padding: 20px; border-radius: 8px;">
              ${response.data.result}
            </div>
            <p><small>Processing time: ${response.data.processing_time.toFixed(2)}s</small></p>
          </body>
        </html>
      `);
      
      setAiTaskDialogOpen(false);
      setAiTaskInstructions('');
      
    } catch (error) {
      console.error('AI task error:', error);
      toast.error(`AI task failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setAiTaskLoading(false);
    }
  };

  // Utility functions
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc => 
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'filename':
          return a.filename.localeCompare(b.filename);
        case 'size':
          return b.size - a.size;
        case 'upload_date':
        default:
          return new Date(b.upload_date) - new Date(a.upload_date);
      }
    });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className={`h-8 ${darkMode ? 'bg-slate-700' : 'bg-slate-300'} rounded w-1/3`}></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`h-40 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} rounded-lg`}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Document Manager
          </h1>
          <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} mt-1`}>
            Upload, organize, and manage your PDF documents with AI assistance
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => fetchDocuments()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Upload Area */}
      <Card className={`${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200'} backdrop-blur-sm`}>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`file-upload-zone p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragActive ? 'drag-over' : ''
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            
            {uploading ? (
              <div className="space-y-4">
                <div className={`w-16 h-16 mx-auto rounded-full border-4 border-dashed ${
                  darkMode ? 'border-indigo-400' : 'border-indigo-500'
                } flex items-center justify-center animate-pulse`}>
                  <Upload className={`w-8 h-8 ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
                </div>
                <div className="space-y-2">
                  <p className={`text-lg font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    Uploading and processing...
                  </p>
                  <Progress value={75} className="w-64 mx-auto" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`w-16 h-16 mx-auto rounded-full border-4 border-dashed ${
                  isDragActive 
                    ? (darkMode ? 'border-indigo-400 bg-indigo-400/20' : 'border-indigo-500 bg-indigo-50')
                    : (darkMode ? 'border-slate-600' : 'border-slate-300')
                } flex items-center justify-center transition-colors`}>
                  <Upload className={`w-8 h-8 ${
                    isDragActive 
                      ? (darkMode ? 'text-indigo-400' : 'text-indigo-500')
                      : (darkMode ? 'text-slate-500' : 'text-slate-400')
                  }`} />
                </div>
                
                <div className="space-y-2">
                  <p className={`text-lg font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {isDragActive ? 'Drop your PDF here' : 'Drop PDF files here, or click to browse'}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Supported format: PDF (Max size: 50MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      {documents.length > 0 && (
        <Card className={`${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200'} backdrop-blur-sm`}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload_date">Upload Date</SelectItem>
                  <SelectItem value="filename">Filename</SelectItem>
                  <SelectItem value="size">File Size</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Layers className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Display */}
      {filteredDocuments.length === 0 ? (
        <Card className={`${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200'} backdrop-blur-sm`}>
          <CardContent className="p-12 text-center">
            <FileText className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            <h3 className={`text-xl font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {documents.length === 0 ? 'No documents yet' : 'No documents match your search'}
            </h3>
            <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-6`}>
              {documents.length === 0 
                ? 'Upload your first PDF document to get started'
                : 'Try adjusting your search terms or filters'
              }
            </p>
            {documents.length === 0 && (
              <Button
                onClick={() => document.querySelector('input[type="file"]')?.click()}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First PDF
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }>
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              viewMode={viewMode}
              darkMode={darkMode}
              onDownload={() => downloadDocument(doc.id, doc.filename)}
              onDelete={() => deleteDocument(doc.id, doc.filename)}
              onAiTask={() => {
                setSelectedDocument(doc);
                setAiTaskDialogOpen(true);
              }}
              formatBytes={formatBytes}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* AI Task Dialog */}
      <Dialog open={aiTaskDialogOpen} onOpenChange={setAiTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Task: {selectedDocument?.filename}</DialogTitle>
            <DialogDescription>
              Choose an AI task to perform on this document
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Task Type */}
            <div className="space-y-3">
              <Label>Task Type</Label>
              <Select value={aiTaskType} onValueChange={setAiTaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summarize">📄 Summarize Document</SelectItem>
                  <SelectItem value="extract_key_points">🎯 Extract Key Points</SelectItem>
                  <SelectItem value="rewrite">✏️ Rewrite & Improve</SelectItem>
                  <SelectItem value="analyze">🔍 Analyze Content</SelectItem>
                  <SelectItem value="translate">🌐 Translate</SelectItem>
                  <SelectItem value="compress_suggestions">💡 Compression Suggestions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI Provider & Model */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>AI Provider</Label>
                <Select value={aiTaskProvider} onValueChange={setAiTaskProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aiProviders.map(provider => (
                      <SelectItem key={provider.name} value={provider.name}>
                        {provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Model</Label>
                <Select value={aiTaskModel} onValueChange={setAiTaskModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aiProviders
                      .find(p => p.name === aiTaskProvider)?.available_models
                      .map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      )) || []
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Instructions */}
            <div className="space-y-3">
              <Label>Additional Instructions (Optional)</Label>
              <Textarea
                placeholder="Provide specific instructions for the AI task..."
                value={aiTaskInstructions}
                onChange={(e) => setAiTaskInstructions(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAiTaskDialogOpen(false)}
              disabled={aiTaskLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={performAiTask}
              disabled={aiTaskLoading}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              {aiTaskLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {aiTaskLoading ? 'Processing...' : 'Run AI Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Document Card Component
const DocumentCard = ({ 
  document, viewMode, darkMode, onDownload, onDelete, onAiTask,
  formatBytes, formatDate 
}) => {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  if (viewMode === 'list') {
    return (
      <Card className={`${darkMode ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50' : 'bg-white/50 border-slate-200 hover:bg-slate-50/50'} backdrop-blur-sm transition-all duration-200`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-indigo-600/20' : 'bg-indigo-100'
              }`}>
                <FileText className={`w-6 h-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
              
              <div className="flex-1">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {document.filename}
                </h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                    {formatBytes(document.size)}
                  </span>
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                    {document.page_count} pages
                  </span>
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                    {formatDate(document.upload_date)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onAiTask}
                className={`${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <Sparkles className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDownload}
                className={`${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className={`${darkMode ? 'hover:bg-red-900/50 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-600'}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${darkMode ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50' : 'bg-white/50 border-slate-200 hover:bg-slate-50/50'} backdrop-blur-sm transition-all duration-200 hover:shadow-lg group`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            darkMode ? 'bg-indigo-600/20' : 'bg-indigo-100'
          }`}>
            <FileText className={`w-6 h-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
          
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAiTask}
              className={`${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              className={`${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className={`${darkMode ? 'hover:bg-red-900/50 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-600'}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className={`font-semibold leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {document.filename}
          </h3>
          
          <div className="flex items-center justify-between text-sm">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
              {formatBytes(document.size)}
            </span>
            <Badge variant="secondary">
              {document.page_count} pages
            </Badge>
          </div>
          
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Uploaded {formatDate(document.upload_date)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentManager;