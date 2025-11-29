import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { sendSignUpEmail, sendSignInEmail } from '@/utils/emailService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, provider?: 'google' | 'azure') => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let subscription: any;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set up auth state listener
    const { data } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    subscription = data.subscription;

    return () => subscription?.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, provider?: 'google' | 'azure') => {
    // Handle OAuth sign-in
    if (provider) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/applications`,
        },
      });

      if (error) {
        return { error };
      }

      // OAuth will redirect, so we don't need to navigate here
      return { error: null };
    }

    // Handle email/password sign-in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      toast.success('Welcome back!');

      // Send login alert email (non-blocking)
      try {
        await sendSignInEmail(email, data.user.user_metadata?.full_name);
      } catch (emailError) {
        console.warn('⚠️ Email notification failed, but login succeeded:', emailError);
      }

      navigate('/applications');
    }

    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ) => {
    // First, check if email already exists in the user_emails table
    try {
      const { data: existingEmails } = await supabase
        .from('user_emails')
        .select('email')
        .eq('email', email.toLowerCase())
        .limit(1);

      if (existingEmails && existingEmails.length > 0) {
        return {
          error: {
            message: 'This email address is already registered. Please use a different email or try logging in.'
          }
        };
      }
    } catch (checkError) {
      // If table check fails (e.g. table doesn't exist yet), log warning but continue
      console.warn('Email deduplication check failed:', checkError);
    }

    const redirectUrl = `${window.location.origin}/auth/email-confirmation`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    // Check for duplicate email error from Supabase
    if (error) {
      // Supabase returns specific error messages for duplicate emails
      if (error.message.includes('already registered') ||
        error.message.includes('already exists') ||
        error.message.includes('User already registered')) {
        return { error: { message: 'This email address is already registered. Please use a different email or try logging in.' } };
      }
      return { error };
    }

    if (data.user) {
      toast.success('Account created successfully! Check your email.');

      // Send welcome email (non-blocking)
      try {
        await sendSignUpEmail(email, fullName);
      } catch (emailError) {
        console.warn('⚠️ Email notification failed, but signup succeeded:', emailError);
      }

      navigate('/auth/login');
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    toast.success('Signed out successfully');
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
