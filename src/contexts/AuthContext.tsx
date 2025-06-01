
'use client';

import type { User, AuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase'; // Added db
import { onAuthStateChanged, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; // Added for user profile creation
// type SuggestLearningMilestonesInput type is not used in this file directly.

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<User | null>;
  signIn: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  error: AuthError | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  const signUp = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        const createdUser = userCredential.user;
        const userProfileRef = doc(db, 'userProfiles', createdUser.uid);
        const displayName = createdUser.email ? createdUser.email.split('@')[0] : 'New User';
        await setDoc(userProfileRef, {
          uid: createdUser.uid,
          email: createdUser.email,
          displayName: displayName,
          photoURL: createdUser.photoURL || null, // Store photoURL if available
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setUser(createdUser);
        return createdUser;
      }
      return null;
    } catch (e) {
      setError(e as AuthError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (e) {
      setError(e as AuthError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (e) {
      setError(e as AuthError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
