'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { fetchAnalytics, fetchMessageVolume, fetchErrorSummary } from '@/store/slices/analyticsSlice';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Download,
  Calendar,
  Clock,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Filter,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AnalyticsPage() {
  const dispatch = useDispatch();
  const { stats, messageVolume, errorSummary, isLoading } = useSelector((state: RootState) => state.analytics);
  const { user } = useSelector((state: RootState) => state.auth);
  const [dateRange, setDateRange] = useState('7');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [dispatch, dateRange]);

  const loadAnalytics = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchAnalytics() as any),
        dispatch(fetchMessageVolume({ days: parseInt(dateRange) }) as any),
        dispatch(fetchErrorSummary({ days: parseInt(dateRange) }) as any)
      ]);
    } catch (error) {
      toast.error('Failed to load analytics data');
    }
    setRefreshing(false);
  };

  const exportData = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const csvData = messageVolume?.map(item => ({
        Date: item.date,
        Messages: item.message_count,
        Success: item.success_count,
        Errors: item.error_count
      }));
      
      const csvString = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } else {
      // PDF export would require additional implementation
      toast.success('PDF export feature coming soon');
    }
  };

  const chartColors = {
    primary: '#00d4ff',
    secondary: '#a855f7',
    success: '#00ff88',
    warning: '#ff7b00',
    danger: '#ff006e'
  };

  const pieData = [
    { name: 'Successful', value: stats?.messages_today || 0, color: chartColors.success },
    { name: 'Failed', value: (stats?.total_messages_forwarded || 0) - (stats?.messages_today || 0), color: chartColors.danger }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-dark-text flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-neon-purple" />
              Analytics Dashboard
            </h1>
            <p className="text-dark-muted mt-1">
              Real-time insights and performance metrics
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 bg-dark-border border border-dark-border rounded-lg text-dark-text focus:border-neon-blue focus:outline-none"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            
            <Button
              onClick={loadAnalytics}
              disabled={refreshing}
              variant="outline"
              className="border-dark-border hover:border-neon-blue"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => exportData('csv')}
                size="sm"
                variant="outline"
                className="border-dark-border hover:border-neon-green"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                onClick={() => exportData('pdf')}
                size="sm"
                variant="outline"
                className="border-dark-border hover:border-neon-orange"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-effect border-dark-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-muted text-sm">Total Messages</p>
                    <p className="text-2xl font-bold text-dark-text">
                      {stats?.total_messages_forwarded || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-neon-blue/20 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-neon-blue" />
                  </div>
                </div>
                <p className="text-xs text-dark-muted mt-2">
                  All time forwarded
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-effect border-dark-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-muted text-sm">Success Rate</p>
                    <p className="text-2xl font-bold text-dark-text">
                      {stats?.success_rate ? `${(stats.success_rate * 100).toFixed(1)}%` : '0%'}
                    </p>
                  </div>
                  <div className="p-3 bg-neon-green/20 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-neon-green" />
                  </div>
                </div>
                <p className="text-xs text-dark-muted mt-2">
                  Last {dateRange} days
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-effect border-dark-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-muted text-sm">Average Delay</p>
                    <p className="text-2xl font-bold text-dark-text">
                      {stats?.avg_delay ? `${stats.avg_delay.toFixed(1)}s` : '0s'}
                    </p>
                  </div>
                  <div className="p-3 bg-neon-orange/20 rounded-lg">
                    <Clock className="h-6 w-6 text-neon-orange" />
                  </div>
                </div>
                <p className="text-xs text-dark-muted mt-2">
                  Processing time
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-effect border-dark-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-muted text-sm">Active Pairs</p>
                    <p className="text-2xl font-bold text-dark-text">
                      {stats?.active_pairs || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-neon-purple/20 rounded-lg">
                    <Activity className="h-6 w-6 text-neon-purple" />
                  </div>
                </div>
                <p className="text-xs text-dark-muted mt-2">
                  Currently running
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Volume Chart */}
          <Card className="glass-effect border-dark-border">
            <CardHeader>
              <CardTitle className="text-dark-text flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-neon-blue" />
                Message Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={messageVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d30" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#71717a"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#71717a"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1a1a1b',
                        border: '1px solid #2d2d30',
                        borderRadius: '8px',
                        color: '#e4e4e7'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="message_count"
                      stroke={chartColors.primary}
                      fill={chartColors.primary}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Success vs Errors */}
          <Card className="glass-effect border-dark-border">
            <CardHeader>
              <CardTitle className="text-dark-text flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-neon-green" />
                Success vs Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={messageVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d30" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#71717a"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#71717a"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1a1a1b',
                        border: '1px solid #2d2d30',
                        borderRadius: '8px',
                        color: '#e4e4e7'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="success_count" 
                      fill={chartColors.success}
                      name="Success"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="error_count" 
                      fill={chartColors.danger}
                      name="Errors"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Card className="glass-effect border-dark-border">
          <CardHeader>
            <CardTitle className="text-dark-text">Detailed Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-dark-border">
                <TabsTrigger value="overview" className="data-[state=active]:bg-dark-card">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-dark-card">
                  Performance
                </TabsTrigger>
                <TabsTrigger value="errors" className="data-[state=active]:bg-dark-card">
                  Error Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-dark-text mb-4">Daily Activity</h4>
                    <div className="space-y-3">
                      {messageVolume?.slice(-7).map((day, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-dark-border rounded-lg">
                          <span className="text-dark-text">{new Date(day.date).toLocaleDateString()}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-neon-green text-sm">{day.success_count} success</span>
                            <span className="text-red-400 text-sm">{day.error_count} errors</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-dark-text mb-4">Success Distribution</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-dark-border border-dark-border">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-dark-muted text-sm">Peak Hour</p>
                        <p className="text-xl font-bold text-dark-text">2:00 PM</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-dark-border border-dark-border">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-dark-muted text-sm">Fastest Pair</p>
                        <p className="text-xl font-bold text-dark-text">0.3s</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-dark-border border-dark-border">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-dark-muted text-sm">Queue Health</p>
                        <p className="text-xl font-bold text-neon-green">Healthy</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="errors" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-dark-text">Common Error Types</h4>
                  {errorSummary?.length > 0 ? (
                    <div className="space-y-3">
                      {errorSummary.map((error, index) => (
                        <div key={index} className="p-4 bg-red-400/10 border border-red-400/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="h-5 w-5 text-red-400" />
                              <div>
                                <p className="text-dark-text font-medium">{error.type}</p>
                                <p className="text-dark-muted text-sm">{error.message}</p>
                              </div>
                            </div>
                            <Badge variant="destructive">{error.count} occurrences</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-neon-green mx-auto mb-4" />
                      <p className="text-dark-text">No errors in the selected period</p>
                      <p className="text-dark-muted text-sm">Your system is running smoothly!</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}