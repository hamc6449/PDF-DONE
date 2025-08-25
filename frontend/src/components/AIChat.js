import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Send, Bot, User, FileText, Sparkles, RefreshCw, 
  Download, Copy, MessageCircle, Brain, Zap,
  Settings, ChevronDown, ChevronUp, Paperclip,
  Trash2, Archive, MoreHorizontal, CheckCircle,
  AlertCircle, Clock, Star, BookOpen, Search, X
} from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger 
} from './ui/dialog';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIChat = ({ darkMode }) => {
  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  // Documents & AI Settings
  const [documents, setDocuments] = useState([]);
  const [aiProviders, setAiProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState('openai');
  const [currentModel, setCurrentModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  
  // UI State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [documentSelectorOpen, setDocumentSelectorOpen] = useState(false);
  
  // Chat history and sessions
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize
  useEffect(() => {
    fetchDocuments();
    fetchAiProviders();
    initializeChat();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch Functions
  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
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

  // Chat Functions
  const initializeChat = () => {
    const welcomeMessage = {
      role: 'assistant',
      content: `Welcome to PDFLux AI Chat! 🤖

I'm your AI assistant specialized in PDF document analysis and management. Here's what I can help you with:

📄 **Document Analysis**
• Summarize documents
• Extract key information
• Answer questions about content
• Compare documents

🔧 **PDF Operations**
• Suggest optimizations
• Recommend compression strategies
• Security and permissions advice

💡 **Smart Assistance**
• Explain complex content
• Translate text
• Rewrite for clarity

Select a document from the sidebar to chat about it, or ask me general questions about PDF management!`,
      timestamp: new Date().toISOString()
    };
    
    setMessages([welcomeMessage]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const chatRequest = {
        messages: newMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        model_provider: currentProvider,
        model_name: currentModel,
        temperature: temperature
      };

      if (selectedDocument) {
        chatRequest.document_id = selectedDocument.id;
      }

      const response = await axios.post(`${API}/ai/chat`, chatRequest);
      
      const assistantMessage = {
        role: 'assistant',
        content: response.data.message.content,
        timestamp: response.data.message.timestamp,
        model_used: response.data.model_used,
        processing_time: response.data.processing_time
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.response?.data?.detail || error.message}. Please try again or check your settings.`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Chat request failed');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    if (messages.length <= 1) return;
    
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      initializeChat();
      setSelectedDocument(null);
      toast.success('Chat cleared');
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  // Utility Functions
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAvailableModels = () => {
    const provider = aiProviders.find(p => p.name === currentProvider);
    return provider?.available_models || [];
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen flex">
      {/* Left Sidebar - Documents & Settings */}
      <div className={`w-80 border-r ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200'} backdrop-blur-sm flex flex-col`}>
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              AI Chat
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={currentProvider} onValueChange={setCurrentProvider}>
                <SelectTrigger className="text-xs">
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

              <Select value={currentModel} onValueChange={setCurrentModel}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableModels().map(model => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDocument && (
              <div className={`p-3 rounded-lg border ${
                darkMode ? 'bg-indigo-600/20 border-indigo-600/30' : 'bg-indigo-50 border-indigo-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <span className={`text-sm font-medium ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {selectedDocument.filename}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDocument(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-indigo-300/70' : 'text-indigo-500/70'}`}>
                  {formatBytes(selectedDocument.size)} • {selectedDocument.page_count} pages
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Documents ({documents.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDocuments}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>

            <ScrollArea className="h-full">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className={`w-8 h-8 mx-auto mb-2 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                  <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    No documents uploaded
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        selectedDocument?.id === doc.id
                          ? (darkMode ? 'bg-indigo-600/20 border-indigo-600/30' : 'bg-indigo-50 border-indigo-200')
                          : (darkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50')
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          darkMode ? 'bg-slate-700' : 'bg-slate-200'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium truncate ${
                            darkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {doc.filename}
                          </h4>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatBytes(doc.size)} • {doc.page_count} pages
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {new Date(doc.upload_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            disabled={messages.length <= 1}
            className="w-full justify-start"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/documents', '_blank')}
            className="w-full justify-start"
          >
            <FileText className="w-4 h-4 mr-2" />
            Manage Documents
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        
        {/* Chat Header */}
        <div className={`p-4 border-b ${darkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-white/30 border-slate-200'} backdrop-blur-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center`}>
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  PDFLux AI Assistant
                </h1>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selectedDocument ? `Chatting about: ${selectedDocument.filename}` : 'General PDF assistance'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {currentProvider}:{currentModel}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <MessageBubble
                key={index}
                message={message}
                darkMode={darkMode}
                onCopy={() => copyMessage(message.content)}
              />
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className={`p-4 rounded-2xl max-w-lg ${
                  darkMode ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className={`w-2 h-2 rounded-full animate-bounce ${
                        darkMode ? 'bg-slate-400' : 'bg-slate-500'
                      }`} style={{ animationDelay: '0ms' }}></div>
                      <div className={`w-2 h-2 rounded-full animate-bounce ${
                        darkMode ? 'bg-slate-400' : 'bg-slate-500'
                      }`} style={{ animationDelay: '150ms' }}></div>
                      <div className={`w-2 h-2 rounded-full animate-bounce ${
                        darkMode ? 'bg-slate-400' : 'bg-slate-500'
                      }`} style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className={`p-4 border-t ${darkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-white/30 border-slate-200'} backdrop-blur-sm`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedDocument 
                    ? `Ask questions about ${selectedDocument.filename}...`
                    : "Ask me anything about PDFs or document management..."
                  }
                  className="resize-none pr-12 min-h-[44px] max-h-32"
                  rows={1}
                />
                
                {inputMessage.trim() && (
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading}
                    size="sm"
                    className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
            <DialogDescription>
              Customize your AI chat experience
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label>AI Provider</Label>
              <Select value={currentProvider} onValueChange={setCurrentProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiProviders.map(provider => (
                    <SelectItem key={provider.name} value={provider.name}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          provider.status === 'available' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span>{provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Model</Label>
              <Select value={currentModel} onValueChange={setCurrentModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableModels().map(model => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Temperature: {temperature}</Label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>More Focused</span>
                <span>More Creative</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Message Bubble Component
const MessageBubble = ({ message, darkMode, onCopy }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
          : isError
            ? 'bg-gradient-to-br from-red-500 to-pink-500'
            : 'bg-gradient-to-br from-indigo-500 to-purple-500'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : isError ? (
          <AlertCircle className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      
      <div className={`group max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`p-4 rounded-2xl ${
          isUser
            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white'
            : isError
              ? (darkMode ? 'bg-red-900/20 border border-red-600/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-700')
              : (darkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-900')
        } ${isUser ? 'rounded-br-md' : 'rounded-bl-md'}`}>
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
        
        <div className="flex items-center space-x-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          
          {message.model_used && (
            <Badge variant="secondary" className="text-xs">
              {message.model_used}
            </Badge>
          )}
          
          {message.processing_time && (
            <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {message.processing_time.toFixed(2)}s
            </span>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="h-6 w-6 p-0"
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;