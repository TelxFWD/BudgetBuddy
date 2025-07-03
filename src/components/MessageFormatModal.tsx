import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Settings, Zap } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

interface MessageFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairId: number;
  currentData?: {
    custom_header?: string;
    custom_footer?: string;
    remove_header: boolean;
    remove_footer: boolean;
  };
  onUpdate: () => void;
}

export const MessageFormatModal: React.FC<MessageFormatModalProps> = ({
  isOpen,
  onClose,
  pairId,
  currentData,
  onUpdate
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    custom_header: '',
    custom_footer: '',
    remove_header: false,
    remove_footer: false
  });

  useEffect(() => {
    if (isOpen && currentData) {
      setFormData({
        custom_header: currentData.custom_header || '',
        custom_footer: currentData.custom_footer || '',
        remove_header: currentData.remove_header || false,
        remove_footer: currentData.remove_footer || false
      });
    }
  }, [isOpen, currentData]);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      await axiosInstance.patch(`/forwarding/${pairId}/message-edit`, formData);
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update message formatting');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Check if user has access to message formatting
  const hasAccess = user?.plan?.toLowerCase() === 'pro' || user?.plan?.toLowerCase() === 'elite';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Message Formatting
            </h3>
            {hasAccess && (
              <span className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full">
                {user?.plan?.toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {!hasAccess ? (
            // Upgrade required section
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Upgrade Required
              </h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Message formatting controls are available for Pro and Elite plan users only.
              </p>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-4">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  Premium Features:
                </h5>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Custom headers and footers</li>
                  <li>• Remove original headers/footers</li>
                  <li>• Advanced message transformation</li>
                  <li>• Professional branding options</li>
                </ul>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
              >
                Learn More About Pro Plans
              </button>
            </div>
          ) : (
            // Message formatting form
            <div className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </div>
              )}

              {/* Custom Header */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Header
                </label>
                <textarea
                  value={formData.custom_header}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_header: e.target.value }))}
                  placeholder="🔔 VIP SIGNAL"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={2}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Text to add at the beginning of messages (optional)
                </p>
              </div>

              {/* Custom Footer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Footer
                </label>
                <textarea
                  value={formData.custom_footer}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_footer: e.target.value }))}
                  placeholder="✅ via AutoForwardX"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={2}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Text to add at the end of messages (optional)
                </p>
              </div>

              {/* Remove Header Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Remove Original Header
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Remove the first line of incoming messages
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, remove_header: !prev.remove_header }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.remove_header
                      ? 'bg-indigo-600'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.remove_header ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Remove Footer Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Remove Original Footer
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Remove the last line of incoming messages
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, remove_footer: !prev.remove_footer }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.remove_footer
                      ? 'bg-indigo-600'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.remove_footer ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};