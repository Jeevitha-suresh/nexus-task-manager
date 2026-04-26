import React, { useState, useEffect } from 'react';
import { AuthUser, authService } from './services/authService';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UserProfile } from './types';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Load additional profile data
        const userProfile = await authService.getUserProfile(firebaseUser.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-12 h-12 border-4 border-[#141414] border-t-transparent animate-spin mb-4"></div>
        <p className="text-[10px] uppercase tracking-[0.4em] font-mono font-bold">Synchronizing System</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  return <Dashboard user={profile} />;
}
