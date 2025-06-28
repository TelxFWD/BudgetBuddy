"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Calendar, CreditCard } from 'lucide-react';
import { BillingService, PaymentHistory as PaymentHistoryType } from '@/services/billingService';

export function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentHistoryType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const data = await BillingService.getPaymentHistory();
      setPayments(data);
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (paymentId: string) => {
    try {
      const blob = await BillingService.downloadInvoice(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'refunded': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'paypal': return 'PayPal';
      case 'crypto': return 'Cryptocurrency';
      default: return method;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No payment history found</p>
            <p className="text-sm text-gray-500">Your payments will appear here once you upgrade</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold capitalize">{payment.plan} Plan</h3>
                        <Badge className={`${getStatusColor(payment.status)} text-white`}>
                          {payment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatPaymentMethod(payment.paymentMethod)} • {payment.billingCycle}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </span>
                        {payment.expiresAt && (
                          <span>
                            Expires: {new Date(payment.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      ${payment.amount} {payment.currency}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoice(payment.id)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Invoice
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}