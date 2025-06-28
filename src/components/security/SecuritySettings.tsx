import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Shield, Lock, Bell } from 'lucide-react';
import { SecurityService, SecuritySettings as SecuritySettingsType } from '@/services/securityService';

interface SecuritySettingsProps {
  settings?: SecuritySettingsType;
  onUpdate: () => void;
}

export function SecuritySettings({ settings, onUpdate }: SecuritySettingsProps) {
  const [localSettings, setLocalSettings] = useState<SecuritySettingsType>(
    settings || {
      twoFactorEnabled: false,
      sessionTimeout: 24,
      ipWhitelisting: false,
      loginNotifications: true,
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSettingChange = (key: keyof SecuritySettingsType, value: boolean | number) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await SecurityService.updateSecuritySettings(localSettings);
      onUpdate();
    } catch (error) {
      console.error('Failed to save security settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Two-Factor Authentication</Label>
              <p className="text-sm text-gray-600">
                Add an extra layer of security to your account
              </p>
            </div>
            <Switch
              checked={localSettings.twoFactorEnabled}
              onCheckedChange={(checked) => handleSettingChange('twoFactorEnabled', checked)}
            />
          </div>

          {/* Session Timeout */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Session Timeout (hours)</Label>
            <p className="text-sm text-gray-600">
              Automatically log out after this period of inactivity
            </p>
            <Input
              type="number"
              min="1"
              max="168"
              value={localSettings.sessionTimeout}
              onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
              className="w-32"
            />
          </div>

          {/* IP Whitelisting */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">IP Whitelisting</Label>
              <p className="text-sm text-gray-600">
                Only allow login from specific IP addresses
              </p>
            </div>
            <Switch
              checked={localSettings.ipWhitelisting}
              onCheckedChange={(checked) => handleSettingChange('ipWhitelisting', checked)}
            />
          </div>

          {/* Login Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Login Notifications</Label>
              <p className="text-sm text-gray-600">
                Receive notifications for new login attempts
              </p>
            </div>
            <Switch
              checked={localSettings.loginNotifications}
              onCheckedChange={(checked) => handleSettingChange('loginNotifications', checked)}
            />
          </div>

          <div className="pt-4">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Lock className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Enable Two-Factor Authentication</h4>
                <p className="text-sm text-gray-600">
                  Protect your account with an additional verification step
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Bell className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Monitor Login Activity</h4>
                <p className="text-sm text-gray-600">
                  Keep track of when and where your account is accessed
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Shield className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Regular Security Reviews</h4>
                <p className="text-sm text-gray-600">
                  Periodically review your security settings and active sessions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}