'use client';

import DashboardLayout from '@/components/DashboardLayout';
import ForwardingManagement from '@/components/ForwardingManagement';

export default function ForwardingPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <ForwardingManagement />
      </div>
    </DashboardLayout>
  );
}