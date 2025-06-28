/**
 * Real-Time Analytics Dashboard with Live Charts and Export Features
 * Shows message forwarding statistics, queue health, and session monitoring
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Download, 
  Filter, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Clock, 
  Users, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AnalyticsData {
  messageVolume: Array<{
    timestamp: string;
    messages: number;
    errors: number;
    success: number;
  }>;
  platformStats: Array<{
    platform: string;
    messages: number;
    color: string;
  }>;
  queueHealth: {
    backlog: number;
    processing_rate: number;
    error_rate: number;
    average_delay: number;
  };
  sessionHealth: Array<{
    platform: string;
    account_name: string;
    status: 'connected' | 'disconnected' | 'error';
    last_seen: string;
  }>;
  topPairs: Array<{
    id: number;
    source: string;
    destination: string;
    messages: number;
    success_rate: number;
  }>;
}

interface RealTimeAnalyticsProps {
  userId: number;
  timeRange: '1h' | '24h' | '7d' | '30d';
  onTimeRangeChange: (range: '1h' | '24h' | '7d' | '30d') => void;
}

export const RealTimeAnalytics: React.FC<RealTimeAnalyticsProps> = ({
  userId,
  timeRange,
  onTimeRangeChange
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'platforms' | 'queue' | 'sessions'>('volume');
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Simulated real-time data fetching
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      
      // In a real implementation, this would fetch from your API
      // For now, using simulated data that updates in real-time
      const mockData: AnalyticsData = {
        messageVolume: generateTimeSeriesData(timeRange),
        platformStats: [
          { platform: 'Telegram', messages: 1250, color: '#00d4ff' },
          { platform: 'Discord', messages: 850, color: '#a855f7' }
        ],
        queueHealth: {
          backlog: Math.floor(Math.random() * 100),
          processing_rate: 85 + Math.random() * 10,
          error_rate: Math.random() * 5,
          average_delay: 0.5 + Math.random() * 2
        },
        sessionHealth: [
          { platform: 'telegram', account_name: 'Main Account', status: 'connected', last_seen: new Date().toISOString() },
          { platform: 'discord', account_name: 'Bot #1', status: 'connected', last_seen: new Date().toISOString() },
          { platform: 'telegram', account_name: 'Secondary', status: 'disconnected', last_seen: new Date(Date.now() - 300000).toISOString() }
        ],
        topPairs: [
          { id: 1, source: 'TG: News Channel', destination: 'DC: #general', messages: 450, success_rate: 98.5 },
          { id: 2, source: 'TG: Updates', destination: 'DC: #updates', messages: 320, success_rate: 99.1 },
          { id: 3, source: 'DC: #alerts', destination: 'TG: Alert Group', messages: 180, success_rate: 97.2 }
        ]
      };
      
      setData(mockData);
      setIsLoading(false);
    };

    fetchAnalytics();
    
    // Set up real-time updates
    const interval = setInterval(fetchAnalytics, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [timeRange, userId]);

  const generateTimeSeriesData = (range: string) => {
    const points = range === '1h' ? 12 : range === '24h' ? 24 : range === '7d' ? 7 : 30;
    const interval = range === '1h' ? 5 * 60 * 1000 : 
                    range === '24h' ? 60 * 60 * 1000 : 
                    range === '7d' ? 24 * 60 * 60 * 1000 : 
                    30 * 24 * 60 * 60 * 1000;
    
    return Array.from({ length: points }, (_, i) => {
      const timestamp = new Date(Date.now() - (points - 1 - i) * interval);
      const messages = Math.floor(Math.random() * 100) + 20;
      const errors = Math.floor(Math.random() * 5);
      
      return {
        timestamp: format(timestamp, range === '1h' ? 'HH:mm' : range === '24h' ? 'HH:mm' : 'MMM dd'),
        messages,
        errors,
        success: messages - errors
      };
    });
  };

  const exportToPDF = async () => {
    if (!chartRef.current) return;
    
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(chartRef.current);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF();
      pdf.setFontSize(20);
      pdf.text('AutoForwardX Analytics Report', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text(`Generated: ${format(new Date(), 'PPP')}`, 20, 35);
      pdf.text(`Time Range: ${timeRange}`, 20, 45);
      
      // Add chart image
      pdf.addImage(imgData, 'PNG', 20, 60, 170, 100);
      
      // Add summary statistics
      if (data) {
        pdf.text('Summary Statistics:', 20, 180);
        pdf.text(`Total Messages: ${data.messageVolume.reduce((acc, d) => acc + d.messages, 0)}`, 20, 195);
        pdf.text(`Success Rate: ${((data.messageVolume.reduce((acc, d) => acc + d.success, 0) / data.messageVolume.reduce((acc, d) => acc + d.messages, 0)) * 100).toFixed(1)}%`, 20, 210);
        pdf.text(`Queue Backlog: ${data.queueHealth.backlog}`, 20, 225);
        pdf.text(`Processing Rate: ${data.queueHealth.processing_rate.toFixed(1)}%`, 20, 240);
      }
      
      pdf.save(`autoforwardx-analytics-${timeRange}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;
    
    const csvData = data.messageVolume.map(d => ({
      timestamp: d.timestamp,
      total_messages: d.messages,
      successful: d.success,
      errors: d.errors,
      success_rate: ((d.success / d.messages) * 100).toFixed(2)
    }));
    
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autoforwardx-data-${timeRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading || !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-700 rounded w-1/3"></div>
        <div className="h-64 bg-gray-700 rounded"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="text-neon-green" size={16} />;
      case 'disconnected':
        return <XCircle className="text-yellow-500" size={16} />;
      case 'error':
        return <AlertTriangle className="text-red-500" size={16} />;
      default:
        return <Clock className="text-gray-400" size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-text">Real-Time Analytics</h2>
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  timeRange === range
                    ? 'bg-neon-blue text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          
          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download size={16} />
              CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-neon-blue text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Download size={16} />
              {isExporting ? 'Generating...' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-card border border-dark-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Messages</p>
              <p className="text-2xl font-bold text-dark-text">
                {data.messageVolume.reduce((acc, d) => acc + d.messages, 0).toLocaleString()}
              </p>
            </div>
            <MessageSquare className="text-neon-blue" size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-card border border-dark-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Success Rate</p>
              <p className="text-2xl font-bold text-neon-green">
                {((data.messageVolume.reduce((acc, d) => acc + d.success, 0) / data.messageVolume.reduce((acc, d) => acc + d.messages, 0)) * 100).toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="text-neon-green" size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-card border border-dark-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Queue Backlog</p>
              <p className="text-2xl font-bold text-yellow-500">{data.queueHealth.backlog}</p>
            </div>
            <Activity className="text-yellow-500" size={24} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-card border border-dark-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Sessions</p>
              <p className="text-2xl font-bold text-neon-purple">
                {data.sessionHealth.filter(s => s.status === 'connected').length}
              </p>
            </div>
            <Users className="text-neon-purple" size={24} />
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div ref={chartRef} className="space-y-6">
        {/* Message Volume Chart */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Message Volume Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.messageVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d30" />
              <XAxis dataKey="timestamp" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a1b', 
                  border: '1px solid #2d2d30',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="success"
                stackId="1"
                stroke="#00ff88"
                fill="#00ff88"
                fillOpacity={0.6}
                name="Successful"
              />
              <Area
                type="monotone"
                dataKey="errors"
                stackId="1"
                stroke="#ff006e"
                fill="#ff006e"
                fillOpacity={0.6}
                name="Errors"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">Platform Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.platformStats}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="messages"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.platformStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Performing Pairs */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-dark-text mb-4">Top Performing Pairs</h3>
            <div className="space-y-3">
              {data.topPairs.map((pair, index) => (
                <div key={pair.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-dark-text">
                      {pair.source} → {pair.destination}
                    </div>
                    <div className="text-xs text-gray-400">
                      {pair.messages} messages • {pair.success_rate}% success
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-neon-blue">#{index + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Session Health Status */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Session Health Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.sessionHealth.map((session, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={session.status} />
                  <div>
                    <div className="text-sm font-medium text-dark-text">{session.account_name}</div>
                    <div className="text-xs text-gray-400 capitalize">{session.platform}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {format(new Date(session.last_seen), 'HH:mm')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};