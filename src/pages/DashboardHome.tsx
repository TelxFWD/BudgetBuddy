import React from 'react'
import SystemStatus from '../components/SystemStatus'

const DashboardHome: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <SystemStatus />
      </div>
    </div>
  )
}

export default DashboardHome