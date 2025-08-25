import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from 'sonner';
import './App.css';

// Import Lucide icons
import { 
  Upload, FileText, MessageCircle, Settings, Download, Trash2, 
  Bot, Sparkles, Eye, Search, Zap, Shield, Compress, FileType,
  Brain, Activity, Moon, Sun, Menu, X, Plus, Send, User,
  FileSpreadsheet, FileImage, Globe, Type, RotateCw, Crop,
  Scissors, Copy, Move, ArrowUpDown, Palette, Layers
} from 'lucide-react';

// Import UI Components
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Progress } from './components/ui/progress';
import { Switch } from './components/ui/switch';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Main App Component
function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('pdflux-theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pdflux-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pdflux-theme', 'light');
    }
  };

  return (
    <BrowserRouter>
      <div className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'dark bg-slate-950' : 'bg-gradient-to-br from-slate-50 to-slate-100'
      }`}>
        <Toaster 
          position="top-right" 
          theme={darkMode ? 'dark' : 'light'}
          richColors 
        />
        
        <div className="flex h-screen">
          {/* Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen} 
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
          />
          
          {/* Main Content */}
          <main className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-16'
          }`}>
            <Routes>
              <Route path="/" element={<Dashboard darkMode={darkMode} />} />
              <Route path="/documents" element={<DocumentManager darkMode={darkMode} />} />
              <Route path="/ai-chat" element={<AIChat darkMode={darkMode} />} />
              <Route path="/settings" element={<Settings darkMode={darkMode} />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

// Sidebar Component
const Sidebar = ({ isOpen, onToggle, darkMode, onToggleDarkMode }) => {
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Activity, current: true },
    { name: 'Documents', href: '/documents', icon: FileText, current: false },
    { name: 'AI Chat', href: '/ai-chat', icon: MessageCircle, current: false },
    { name: 'Settings', href: '/settings', icon: Settings, current: false },
  ];

  return (
    <div className={`fixed left-0 top-0 h-full transition-all duration-300 z-50 ${
      isOpen ? 'w-64' : 'w-16'
    } ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} 
    border-r backdrop-blur-xl`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {isOpen && (
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              darkMode ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-gradient-to-br from-indigo-500 to-purple-500'
            }`}>
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent`}>
                PDFLux
              </h1>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                AI-Powered PDF Suite
              </p>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={`${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="px-3 space-y-2">
        {navigation.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={`flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${
              item.current
                ? `${darkMode ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`
                : `${darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
            }`}
          >
            <item.icon className={`w-5 h-5 ${isOpen ? 'mr-3' : 'mx-auto'} transition-colors`} />
            {isOpen && (
              <span className="text-sm font-medium">{item.name}</span>
            )}
          </a>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div className="absolute bottom-6 left-0 right-0 px-3">
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${
          darkMode ? 'bg-slate-800' : 'bg-slate-100'
        }`}>
          {isOpen && (
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Dark Mode
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDarkMode}
            className="ml-auto"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ darkMode }) => {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalChats: 0,
    aiTasks: 0,
    storageUsed: 0
  });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const docsResponse = await axios.get(`${API}/documents`);
      const documents = docsResponse.data;
      
      setStats({
        totalDocuments: documents.length,
        totalChats: Math.floor(Math.random() * 50), // Mock data
        aiTasks: Math.floor(Math.random() * 100), // Mock data
        storageUsed: documents.reduce((total, doc) => total + doc.size, 0)
      });
      
      setRecentDocuments(documents.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Welcome to PDFLux
          </h1>
          <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} mt-1`}>
            Your comprehensive PDF management and AI assistant platform
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload PDF
          </Button>
          <Button variant="outline">
            <Brain className="w-4 h-4 mr-2" />
            New AI Chat
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Documents"
          value={stats.totalDocuments}
          icon={FileText}
          gradient="from-blue-500 to-cyan-500"
          darkMode={darkMode}
        />
        <StatsCard
          title="AI Conversations"
          value={stats.totalChats}
          icon={MessageCircle}
          gradient="from-emerald-500 to-teal-500"
          darkMode={darkMode}
        />
        <StatsCard
          title="AI Tasks Completed"
          value={stats.aiTasks}
          icon={Sparkles}
          gradient="from-purple-500 to-pink-500"
          darkMode={darkMode}
        />
        <StatsCard
          title="Storage Used"
          value={formatBytes(stats.storageUsed)}
          icon={Activity}
          gradient="from-orange-500 to-red-500"
          darkMode={darkMode}
          isString={true}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Features */}
        <Card className={`${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200'} backdrop-blur-sm`}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-indigo-500" />
              AI-Powered Features
            </CardTitle>
            <CardDescription>Leverage AI to enhance your PDF workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <QuickActionItem
              icon={MessageCircle}
              title="Chat with PDFs"
              description="Ask questions about your documents"
              darkMode={darkMode}
            />
            <QuickActionItem
              icon={Sparkles}
              title="Smart Summarization"
              description="Get AI-generated summaries"
              darkMode={darkMode}
            />
            <QuickActionItem
              icon={Search}
              title="Content Extraction"
              description="Extract key information automatically"
              darkMode={darkMode}
            />
          </CardContent>
        </Card>

        {/* PDF Tools */}
        <Card className={`${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200'} backdrop-blur-sm`}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-purple-500" />
              PDF Tools
            </CardTitle>
            <CardDescription>Comprehensive PDF editing and management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <QuickActionItem
              icon={FileType}
              title="Format Conversion"
              description="Convert to Word, Excel, PowerPoint"
              darkMode={darkMode}
            />
            <QuickActionItem
              icon={Compress}
              title="Smart Compression"
              description="Reduce file size intelligently"
              darkMode={darkMode}
            />
            <QuickActionItem
              icon={Shield}
              title="Security & Protection"
              description="Add passwords and permissions"
              darkMode={darkMode}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      {recentDocuments.length > 0 && (
        <Card className={`${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200'} backdrop-blur-sm`}>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Your recently uploaded and edited files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-indigo-600/20' : 'bg-indigo-100'
                    }`}>
                      <FileText className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {doc.filename}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatBytes(doc.size)} • {doc.page_count} pages
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {new Date(doc.upload_date).toLocaleDateString()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, gradient, darkMode, isString = false }) => (
  <Card className={`${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200'} backdrop-blur-sm hover:shadow-lg transition-all duration-200`}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {title}
          </p>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {isString ? value : value.toLocaleString()}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Quick Action Item Component
const QuickActionItem = ({ icon: Icon, title, description, darkMode }) => (
  <div className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
    darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
  }`}>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
      darkMode ? 'bg-slate-800' : 'bg-slate-100'
    }`}>
      <Icon className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
    </div>
    <div>
      <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{title}</p>
      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
    </div>
  </div>
);

// Document Manager Component (Placeholder)
const DocumentManager = ({ darkMode }) => (
  <div className="p-6">
    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      Document Manager
    </h1>
    <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} mt-2`}>
      Document management features coming soon...
    </p>
  </div>
);

// AI Chat Component (Placeholder)
const AIChat = ({ darkMode }) => (
  <div className="p-6">
    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      AI Chat
    </h1>
    <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} mt-2`}>
      AI chat interface coming soon...
    </p>
  </div>
);

// Settings Component (Placeholder)
const Settings = ({ darkMode }) => (
  <div className="p-6">
    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
      Settings
    </h1>
    <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} mt-2`}>
      Settings panel coming soon...
    </p>
  </div>
);

export default App;