"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tag, Check, AlertCircle, Percent } from 'lucide-react';
import { BillingService } from '@/services/billingService';

interface CouponInputProps {
  onApplied: () => void;
}

export function CouponInput({ onApplied }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      setLoading(true);
      const result = await BillingService.validateCoupon(couponCode, 'pro');
      setValidation(result);
    } catch (error) {
      setValidation({
        valid: false,
        message: 'Failed to validate coupon code'
      });
    } finally {
      setLoading(false);
    }
  };

  const applyCoupon = () => {
    if (validation?.valid) {
      onApplied();
      setCouponCode('');
      setValidation(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Apply Coupon Code
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={validateCoupon}
              disabled={!couponCode.trim() || loading}
            >
              {loading ? 'Validating...' : 'Validate'}
            </Button>
          </div>
          
          {validation && (
            <div className={`p-3 rounded-lg border ${validation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2">
                {validation.valid ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${validation.valid ? 'text-green-700' : 'text-red-700'}`}>
                  {validation.message}
                </span>
              </div>
              
              {validation.valid && (validation.discountPercent || validation.discountAmount) && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge className="bg-green-500 text-white">
                    <Percent className="h-3 w-3 mr-1" />
                    {validation.discountPercent ? 
                      `${validation.discountPercent}% off` : 
                      `$${validation.discountAmount} off`
                    }
                  </Badge>
                </div>
              )}
              
              {validation.valid && (
                <Button 
                  className="mt-3 w-full" 
                  onClick={applyCoupon}
                  size="sm"
                >
                  Apply Coupon
                </Button>
              )}
            </div>
          )}
          
          {/* Available Coupons (Demo) */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Available Promotions</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 border rounded">
                <div>
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">FIRST10</code>
                  <span className="text-sm text-gray-600 ml-2">10% off first purchase</span>
                </div>
                <Badge variant="outline">New Users</Badge>
              </div>
              
              <div className="flex items-center justify-between p-2 border rounded">
                <div>
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">ANNUAL20</code>
                  <span className="text-sm text-gray-600 ml-2">20% off annual plans</span>
                </div>
                <Badge variant="outline">Annual Only</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}