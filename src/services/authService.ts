import { UserProfile, UserRole } from '../types';

const STORAGE_KEY = 'taskmaster_user_profile';
const USERS_STORAGE_KEY = 'taskmaster_users';

// Mock Auth User type to match what App expects from Firebase
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type AuthCallback = (user: AuthUser | null) => void;
let authListener: AuthCallback | null = null;

export const authService = {
  async login(email: string, pass: string): Promise<AuthUser> {
    // Basic simulation: any login works for now, or we check against local "users"
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    let profile = users.find((u: any) => u.email === email);
    
    if (!profile) {
      // Create a default profile if it's the first time
      const isAdmin = email === 'jeevithas590@gmail.com' || email.includes('admin');
      profile = {
        id: Math.random().toString(36).substring(2, 11),
        name: email.split('@')[0],
        email: email,
        role: isAdmin ? UserRole.ADMIN : UserRole.EMPLOYEE,
        createdAt: new Date().toISOString(),
      };
      users.push(profile);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }

    const authUser: AuthUser = {
      uid: profile.id,
      email: profile.email,
      displayName: profile.name
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    if (authListener) authListener(authUser);
    return authUser;
  },

  async loginWithGoogle(): Promise<AuthUser> {
    // Simulate google login
    return this.login('jeevithas590@gmail.com', 'google-pass');
  },

  async logout() {
    localStorage.removeItem(STORAGE_KEY);
    if (authListener) authListener(null);
  },

  onAuthChanged(callback: AuthCallback) {
    authListener = callback;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const profile = JSON.parse(stored);
      callback({
        uid: profile.id,
        email: profile.email,
        displayName: profile.name
      });
    } else {
      callback(null);
    }
    return () => { authListener = null; };
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const profile = JSON.parse(stored);
      if (profile.id === uid) return profile;
    }
    
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    return users.find((u: any) => u.id === uid) || null;
  }
};
