"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, LineChart, PieChart, TrendingUp, Download, Filter, Calendar } from 'lucide-react';
import { AnalyticsService } from '@/services/analyticsService';
import { MessageVolumeChart } from '@/components/analytics/MessageVolumeChart';
import { SuccessRateChart } from '@/components/analytics/SuccessRateChart';
import { PairPerformance } from '@/components/analytics/PairPerformance';
import { ErrorAnalysis } from '@/components/analytics/ErrorAnalysis';
import { ExportOptions } from '@/components/analytics/ExportOptions';

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await AnalyticsService.getAnalyticsSummary(dateRange);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      const blob = await AnalyticsService.exportReport(format, dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${dateRange}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics & Reports</h1>
        <div className="flex items-center gap-4">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <Button variant="outline" onClick={fetchAnalyticsData}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold">{analyticsData?.totalMessages || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {analyticsData?.messageGrowth > 0 ? '+' : ''}{analyticsData?.messageGrowth || 0}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{analyticsData?.successRate || 0}%</p>
              </div>
              <BarChart className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {analyticsData?.successfulMessages || 0} successful forwards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Pairs</p>
                <p className="text-2xl font-bold">{analyticsData?.activePairs || 0}</p>
              </div>
              <LineChart className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              of {analyticsData?.totalPairs || 0} total pairs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Delay</p>
                <p className="text-2xl font-bold">{analyticsData?.avgDelay || 0}s</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Message processing time
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="volume">Message Volume</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MessageVolumeChart data={analyticsData?.messageVolume} />
            <SuccessRateChart data={analyticsData?.successRateData} />
          </div>
        </TabsContent>

        <TabsContent value="volume">
          <MessageVolumeChart 
            data={analyticsData?.messageVolume} 
            detailed={true}
            className="h-96"
          />
        </TabsContent>

        <TabsContent value="performance">
          <PairPerformance pairs={analyticsData?.pairPerformance} />
        </TabsContent>

        <TabsContent value="errors">
          <ErrorAnalysis errors={analyticsData?.errorData} />
        </TabsContent>

        <TabsContent value="export">
          <ExportOptions 
            onExport={exportReport}
            dateRange={dateRange}
            totalMessages={analyticsData?.totalMessages}
          />
        </TabsContent>
      </Tabs>

      {/* 48-Hour Summary Report */}
      {analyticsData?.weeklyReport && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Summary Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-sm text-gray-600 mb-4">
                Auto-generated weekly summary for the period ending {new Date().toLocaleDateString()}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800">Messages Processed</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {analyticsData.weeklyReport.totalMessages}
                  </p>
                  <p className="text-sm text-blue-600">
                    {analyticsData.weeklyReport.dailyAverage} avg/day
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800">Success Rate</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {analyticsData.weeklyReport.successRate}%
                  </p>
                  <p className="text-sm text-green-600">
                    {analyticsData.weeklyReport.improvements} improvements
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800">Top Platform</h4>
                  <p className="text-xl font-bold text-purple-600">
                    {analyticsData.weeklyReport.topPlatform}
                  </p>
                  <p className="text-sm text-purple-600">
                    {analyticsData.weeklyReport.platformPercentage}% of traffic
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Key Insights:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analyticsData.weeklyReport.insights?.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-4">
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-2" />
                  Send to Telegram
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}