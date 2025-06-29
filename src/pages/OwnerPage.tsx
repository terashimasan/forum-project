import React, { useState, useEffect } from 'react';
import { Crown, Save, Upload, AlertCircle, CheckCircle, Shield, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function OwnerPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'admin-requests'>('settings');
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState({
    site_title: 'Elite Forum',
    site_logo_url: ''
  });

  useEffect(() => {
    fetchSiteSettings();
    fetchAdminRequests();
  }, []);

  const fetchSiteSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      
      if (data) {
        setSiteSettings({
          site_title: data.site_title || 'Elite Forum',
          site_logo_url: data.site_logo_url || ''
        });
      }
    } catch (error: any) {
      console.error('Error fetching site settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminRequests = async () => {
    try {
      const { data } = await supabase
        .from('admin_requests')
        .select(`
          *,
          profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false });
      
      if (data) setAdminRequests(data);
    } catch (error: any) {
      console.error('Error fetching admin requests:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('site_settings')
        .update({
          site_title: siteSettings.site_title,
          site_logo_url: siteSettings.site_logo_url || null
        })
        .eq('id', (await supabase.from('site_settings').select('id').single()).data?.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Site settings updated successfully!' });
      
      // Update the page title
      document.title = siteSettings.site_title;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAdminRequest = async (requestId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    const request = adminRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      // Update the admin request
      const { error: requestError } = await supabase
        .from('admin_requests')
        .update({ 
          status, 
          admin_notes: adminNotes || null 
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If approved, update the user's admin status
      if (status === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_admin: true })
          .eq('id', request.user_id);

        if (profileError) throw profileError;
      }

      fetchAdminRequests();
      setMessage({ 
        type: 'success', 
        text: `Admin request ${status} successfully!` 
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Owner Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage site-wide settings and admin requests</p>
          </div>
        </div>
        
        <div className="h-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"></div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${
            message.type === 'success' 
              ? 'text-green-700 dark:text-green-400' 
              : 'text-red-700 dark:text-red-400'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Site Settings
        </button>
        <button
          onClick={() => setActiveTab('admin-requests')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'admin-requests'
              ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Admin Requests ({adminRequests.filter(r => r.status === 'pending').length})
        </button>
      </div>

      {/* Site Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Site Configuration</h2>
            </div>

            <div className="space-y-6">
              {/* Site Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Site Title
                </label>
                <input
                  type="text"
                  value={siteSettings.site_title}
                  onChange={(e) => setSiteSettings({ ...siteSettings, site_title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter site title"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This will appear in the browser tab and header
                </p>
              </div>

              {/* Site Logo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Site Logo URL
                </label>
                <input
                  type="url"
                  value={siteSettings.site_logo_url}
                  onChange={(e) => setSiteSettings({ ...siteSettings, site_logo_url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Leave empty to use the default crown icon
                </p>
              </div>

              {/* Logo Preview */}
              {siteSettings.site_logo_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Logo Preview
                  </label>
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <img
                      src={siteSettings.site_logo_url}
                      alt="Site Logo"
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      This is how your logo will appear in the header
                    </span>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Requests Tab */}
      {activeTab === 'admin-requests' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Requests ({adminRequests.length})</h2>
            </div>

            <div className="space-y-4">
              {adminRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No admin requests</p>
                </div>
              ) : (
                adminRequests.map((request) => (
                  <div key={request.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {request.profiles?.avatar_url ? (
                          <img
                            src={request.profiles.avatar_url}
                            alt={request.profiles.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                            {request.profiles?.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{request.profiles?.username}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Submitted {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        request.status === 'pending' 
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                          : request.status === 'approved'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>

                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Request Details:</h5>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{request.content}</p>
                    </div>

                    {request.admin_notes && (
                      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-1">Owner Notes:</h5>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{request.admin_notes}</p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            const notes = prompt('Add owner notes (optional):');
                            handleAdminRequest(request.id, 'approved', notes || undefined);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => {
                            const notes = prompt('Add owner notes (optional):');
                            handleAdminRequest(request.id, 'rejected', notes || undefined);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Owner Privileges Info */}
      <div className="mt-8 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Crown className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Owner Privileges</h3>
            <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1">
              <li>• Full access to all admin functions</li>
              <li>• Ability to modify site title and logo</li>
              <li>• Review and approve admin privilege requests</li>
              <li>• Cannot have owner status revoked by admins</li>
              <li>• Highest level of forum authority</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}