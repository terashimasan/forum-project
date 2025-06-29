import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import ForumPage from './pages/ForumPage';
import AdminPage from './pages/AdminPage';
import OwnerPage from './pages/OwnerPage';
import ThreadPage from './pages/ThreadPage';
import UserPage from './pages/UserPage';
import DealsPage from './pages/DealsPage';
import AgentPage from './pages/AgentPage';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import SettingsModal from './components/SettingsModal';

function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await fetchProfile(session.user.id);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('User signed out, clearing state');
        setUser(null);
        setProfile(null);
        setShowProfile(false);
      } else if (session?.user) {
        console.log('User signed in:', session.user.id);
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
    });

    setLoading(false);

    return () => {
      subscription.unsubscribe();
    };
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    try {
      console.log('Logout initiated');
      
      setUser(null);
      setProfile(null);
      setShowProfile(false);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signout error:', error);
        throw error;
      }
      
      console.log('Logout successful');
      
    } catch (error: any) {
      console.error('Error logging out:', error);
      alert(`Error logging out: ${error.message}`);
      
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (localError) {
        console.error('Local signout also failed:', localError);
      }
    }
  };

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Layout
          user={user}
          profile={profile}
          onAuthClick={() => setShowAuthModal(true)}
          onProfileClick={() => setShowProfile(true)}
          onSettingsClick={() => setShowSettings(true)}
          onLogout={handleLogout}
        >
          <Routes>
            <Route 
              path="/" 
              element={
                <ForumPage 
                  user={user} 
                  profile={profile}
                  onAuthClick={() => setShowAuthModal(true)}
                />
              } 
            />
            <Route 
              path="/thread/:threadId" 
              element={<ThreadPage user={user} />} 
            />
            <Route 
              path="/user/:userId" 
              element={<UserPage />} 
            />
            <Route 
              path="/deals" 
              element={<DealsPage />} 
            />
            <Route 
              path="/agents" 
              element={<AgentPage />} 
            />
            <Route 
              path="/admin" 
              element={
                (profile?.is_admin || profile?.is_owner) ? (
                  <AdminPage />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/owner" 
              element={
                profile?.is_owner ? (
                  <OwnerPage />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
          </Routes>

          {/* Modals */}
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
          
          {profile && (
            <ProfileModal
              isOpen={showProfile}
              onClose={() => setShowProfile(false)}
              profile={profile}
              onProfileUpdate={() => {
                if (user) fetchProfile(user.id);
              }}
              isOwnProfile={true}
            />
          )}

          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;