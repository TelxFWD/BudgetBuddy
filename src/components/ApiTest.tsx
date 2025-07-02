import React, { useState, useEffect } from 'react'

const ApiTest: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<string>('Testing...')
  const [apiUrl, setApiUrl] = useState<string>('')

  useEffect(() => {
    const testApi = async () => {
      try {
        // Determine API URL
        const protocol = window.location.protocol
        const hostname = window.location.hostname
        const testUrl = `${protocol}//${hostname}:5000/api/health`
        setApiUrl(testUrl)

        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setApiStatus(`✅ API Connected - ${JSON.stringify(data)}`)
        } else {
          setApiStatus(`❌ API Error - Status: ${response.status}`)
        }
      } catch (error) {
        setApiStatus(`❌ API Error - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    testApi()
  }, [])

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl text-white mb-4">API Connectivity Test</h2>
      <div className="space-y-2">
        <p className="text-gray-300">
          <strong>API URL:</strong> {apiUrl}
        </p>
        <p className="text-gray-300">
          <strong>Status:</strong> {apiStatus}
        </p>
        <p className="text-gray-300">
          <strong>Current URL:</strong> {window.location.href}
        </p>
        <p className="text-gray-300">
          <strong>Hostname:</strong> {window.location.hostname}
        </p>
      </div>
    </div>
  )
}

export default ApiTest