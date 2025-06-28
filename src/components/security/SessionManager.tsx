import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, Tablet, LogOut, MapPin, Clock } from 'lucide-react';
import { SecurityService, SessionInfo } from '@/services/securityService';

interface SessionManagerProps {
  sessions: SessionInfo[] | undefined;
  onRefresh: () => void;
}

export function SessionManager({ sessions, onRefresh }: SessionManagerProps) {
  const handleLogoutSession = async (sessionId: string) => {
    try {
      await SecurityService.logoutSession(sessionId);
      onRefresh();
    } catch (error) {
      console.error('Failed to logout session:', error);
    }
  };

  const getDeviceIcon = (deviceName: string) => {
    if (deviceName.toLowerCase().includes('mobile') || deviceName.toLowerCase().includes('phone')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (deviceName.toLowerCase().includes('tablet')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Active Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getDeviceIcon(session.deviceName)}
                  <div>
                    <h4 className="font-medium">{session.deviceName}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.lastActive).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.current && (
                    <Badge variant="default">Current Session</Badge>
                  )}
                  {!session.current && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleLogoutSession(session.id)}
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      Logout
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No active sessions found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}