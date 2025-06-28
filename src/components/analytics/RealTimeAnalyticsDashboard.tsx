'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Download, 
  Filter, 
  RefreshCw, 
  Calendar,
  Smartphone,
  MessageSquare,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRealTimeAnalytics } from '@/hooks/useRealTimeAnalytics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface AnalyticsFilter {
  timeRange: '1h' | '24h' | '7d' | '30d';
  platform: 'all' | 'telegram' | 'discord';
  account: 'all' | string;
  status: 'all' | 'active' | 'inactive';
}

export const RealTimeAnalyticsDashboard: React.FC = () => {
  const { analytics, isLoading, refreshAnalytics } = useRealTimeAnalytics();
  const { isConnected } = useWebSocket();
  
  const [filter, setFilter] = useState<AnalyticsFilter>({
    timeRange: '24h',
    platform: 'all',
    account: 'all',
    status: 'all'
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  // Sample data structure - would be populated from real-time analytics
  const chartData = [
    { time: '00:00', messages: 45, success: 42, errors: 3, telegram: 25, discord: 20 },
    { time: '01:00', messages: 52, success: 50, errors: 2, telegram: 30, discord: 22 },
    { time: '02:00', messages: 38, success: 35, errors: 3, telegram: 20, discord: 18 },
    { time: '03:00', messages: 67, success: 64, errors: 3, telegram: 40, discord: 27 },
    { time: '04:00', messages: 73, success: 71, errors: 2, telegram: 45, discord: 28 },
    { time: '05:00', messages: 84, success: 82, errors: 2, telegram: 50, discord: 34 },
  ];

  const platformData = [
    { name: 'Telegram', value: analytics.platformStats.telegram.messages, color: '#0088FE' },
    { name: 'Discord', value: analytics.platformStats.discord.messages, color: '#00C49F' },
  ];

  const handleFilterChange = (key: keyof AnalyticsFilter, value: string) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const exportAsCSV = () => {
    const csvContent = chartData.map(row => 
      `${row.time},${row.messages},${row.success},${row.errors},${row.telegram},${row.discord}`
    ).join('\n');
    
    const headers = 'Time,Total Messages,Successful,Errors,Telegram,Discord\n';
    const csv = headers + csvContent;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${filter.timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Analytics exported as CSV');
  };

  const exportAsPDF = async () => {
    setIsExporting(true);
    try {
      const dashboard = document.getElementById('analytics-dashboard');
      if (!dashboard) return;

      const canvas = await html2canvas(dashboard, {
        scale: 2,
        backgroundColor: '#0f172a',
        allowTaint: true,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('Analytics exported as PDF');
    } catch (error) {
      toast.error('Failed to export PDF');
      console.error('PDF export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderChart = () => {
    const chartProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...chartProps}>
            <defs>
              <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
            />
            <Area
              type="monotone"
              dataKey="messages"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#messagesGradient)"
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="messages" fill="#10b981" />
            <Bar dataKey="errors" fill="#ef4444" />
          </BarChart>
        );

      default:
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="messages" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="success" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="errors" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <div id="analytics-dashboard" className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Real-Time Analytics
          </h1>
          <p className="text-dark-muted flex items-center gap-2 mt-1">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-neon-green' : 'bg-red-500'}`}></div>
            {isConnected ? 'Live updates active' : 'Connection lost'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filters */}
          <Select value={filter.timeRange} onValueChange={(value: any) => handleFilterChange('timeRange', value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filter.platform} onValueChange={(value: any) => handleFilterChange('platform', value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="discord">Discord</SelectItem>
            </SelectContent>
          </Select>

          {/* Chart Type Selector */}
          <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
            </SelectContent>
          </Select>

          {/* Export Buttons */}
          <Button variant="outline" size="sm" onClick={exportAsCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportAsPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            PDF
          </Button>

          <Button variant="outline" size="sm" onClick={refreshAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Real-time Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-muted">Messages Forwarded</p>
                  <p className="text-2xl font-bold text-dark-text">{analytics.messagesForwarded}</p>
                </div>
                <Activity className="h-8 w-8 text-neon-green" />
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-neon-green mr-2" />
                <span className="text-sm text-neon-green">Live</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-muted">Active Connections</p>
                  <p className="text-2xl font-bold text-dark-text">{analytics.activeConnections}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-400" />
              </div>
              <div className="flex items-center mt-2">
                <div className="h-2 w-2 bg-neon-green rounded-full mr-2"></div>
                <span className="text-sm text-dark-muted">All systems healthy</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-muted">Queue Backlog</p>
                  <p className="text-2xl font-bold text-dark-text">{analytics.queueBacklog}</p>
                </div>
                <Clock className="h-8 w-8 text-neon-orange" />
              </div>
              <div className="flex items-center mt-2">
                {analytics.queueBacklog > 100 ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-neon-orange mr-2" />
                    <span className="text-sm text-neon-orange">High load</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-neon-green mr-2" />
                    <span className="text-sm text-neon-green">Normal</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-muted">Success Rate</p>
                  <p className="text-2xl font-bold text-dark-text">{analytics.successRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-neon-green" />
              </div>
              <div className="flex items-center mt-2">
                <Badge variant={analytics.successRate > 95 ? 'default' : 'destructive'}>
                  {analytics.successRate > 95 ? 'Excellent' : 'Needs attention'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volume">Message Volume</TabsTrigger>
          <TabsTrigger value="platforms">Platform Distribution</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="volume">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Message Volume Over Time
                <Badge variant="outline" className="text-neon-green border-neon-green">
                  Live Updates
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-dark-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="font-medium">Telegram</p>
                      <p className="text-sm text-dark-muted">{analytics.platformStats.telegram.sessions} sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{analytics.platformStats.telegram.messages}</p>
                    <p className="text-sm text-dark-muted">messages</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border border-dark-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="font-medium">Discord</p>
                      <p className="text-sm text-dark-muted">{analytics.platformStats.discord.sessions} sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{analytics.platformStats.discord.messages}</p>
                    <p className="text-sm text-dark-muted">messages</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="success"
                      stackId="1"
                      stroke="#10b981"
                      fill="url(#successGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="errors"
                      stackId="1"
                      stroke="#ef4444"
                      fill="url(#errorGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};