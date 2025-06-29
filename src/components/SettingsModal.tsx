import React, { useState } from 'react';
import { X, Monitor, Sun, Moon, Settings, Palette, Eye, Lock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ChangePasswordModal from './ChangePasswordModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, actualTheme, setTheme } = useTheme();
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!isOpen) return null;

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      description: 'Clean and bright interface',
      icon: Sun,
      preview: 'bg-white border-gray-200'
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      description: 'Easy on the eyes in low light',
      icon: Moon,
      preview: 'bg-gray-900 border-gray-700'
    },
    {
      value: 'auto' as const,
      label: 'System',
      description: 'Follows your device settings',
      icon: Monitor,
      preview: actualTheme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    }
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
                  <p className="text-gray-600 dark:text-gray-400">Customize your forum experience</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Settings Sections */}
            <div className="space-y-8">
              {/* Theme Section */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = theme === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            isSelected 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {option.label}
                              </h4>
                              {isSelected && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {option.description}
                            </p>
                          </div>
                          
                          {/* Theme Preview */}
                          <div className="flex space-x-1">
                            <div className={`w-8 h-6 rounded border-2 ${option.preview}`}></div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Security Section */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h3>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-red-300 dark:hover:border-red-600 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          Change Password
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Update your account password for better security
                        </p>
                      </div>
                      
                      <div className="text-gray-400 dark:text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Current Theme Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current Theme
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {theme === 'auto' ? (
                    <>System preference detected: <span className="font-medium capitalize">{actualTheme}</span></>
                  ) : (
                    <>Using <span className="font-medium capitalize">{theme}</span> theme</>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}