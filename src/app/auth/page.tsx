'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { signIn, getSession } from 'next-auth/react';

import Layout from '@/components/layout/Layout';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Wrapper component that provides Auth context
export default function AuthPage() {
  return (
    <AuthProvider>
      <Suspense fallback={<AuthPageSkeleton />}>
        <AuthPageContent />
      </Suspense>
    </AuthProvider>
  );
}

// Loading skeleton component
function AuthPageSkeleton() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-md rounded-2xl border border-gray-700/50 p-8 space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-10 bg-gray-700 rounded"></div>
              </div>
            ))}
            <div className="h-12 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Actual page content that uses the auth context
function AuthPageContent() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'farmer' as 'farmer' | 'buyer',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [csrfToken, setCsrfToken] = useState('');

  const { login, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Generate CSRF token
  useEffect(() => {
    setCsrfToken(
      Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/market');
      }
    };
    checkSession();
  }, [router]);

  // Set mode based on query parameter
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode && (urlMode === 'login' || urlMode === 'register') && urlMode !== mode) {
      setMode(urlMode);
    }
  }, [searchParams, mode]);

  // Security: Input validation
  const validateInputs = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (mode === 'register') {
      if (formData.name.trim().length < 2) {
        setError('Name must be at least 2 characters long');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  // Security: Rate limiting simulation
  const checkRateLimit = () => {
    const attempts = localStorage.getItem('authAttempts');
    const lastAttempt = localStorage.getItem('lastAuthAttempt');
    const now = Date.now();

    if (attempts && lastAttempt) {
      const attemptCount = parseInt(attempts);
      const timeSinceLastAttempt = now - parseInt(lastAttempt);

      if (timeSinceLastAttempt > 15 * 60 * 1000) {
        localStorage.setItem('authAttempts', '1');
        localStorage.setItem('lastAuthAttempt', now.toString());
        return true;
      }

      if (attemptCount >= 5) {
        setError('Too many attempts. Please try again in 15 minutes.');
        return false;
      }

      localStorage.setItem('authAttempts', (attemptCount + 1).toString());
    } else {
      localStorage.setItem('authAttempts', '1');
      localStorage.setItem('lastAuthAttempt', now.toString());
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!checkRateLimit()) {
      setLoading(false);
      return;
    }

    if (!validateInputs()) {
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const success = await login(formData.email, formData.password);
        if (success) {
          localStorage.removeItem('authAttempts');
          localStorage.removeItem('lastAuthAttempt');
          router.push('/market');
        } else {
          setError('Invalid email or password');
        }
      } else {
        const success = await register(
          {
            name: formData.name.trim(),
            email: formData.email.toLowerCase().trim(),
            role: formData.role,
            idVerified: false,
          },
          formData.password
        );

        if (success) {
          localStorage.removeItem('authAttempts');
          localStorage.removeItem('lastAuthAttempt');
          router.push('/market');
        } else {
          setError('Registration failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleGoogleSignIn = async () => {
    if (!checkRateLimit()) return;

    try {
      await signIn('google', { callbackUrl: '/market' });
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('Google sign-in failed. Please try again.');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white">
              {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
            </h2>
            <p className="mt-2 text-gray-300">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="font-medium text-green-400 hover:text-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Form */}
          <div className="bg-gray-800/30 backdrop-blur-md rounded-2xl border border-gray-700/50 p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <input type="hidden" name="csrfToken" value={csrfToken} />

              {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-300 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {mode === 'register' && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      maxLength={50}
                      value={formData.name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="John Farmer"
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-300">
                      I want to
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="farmer">Sell my products</option>
                      <option value="buyer">Buy products</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={100}
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={100}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {mode === 'register' && (
                  <p className="mt-1 text-xs text-gray-400">
                    Password must be at least 8 characters long
                  </p>
                )}
              </div>

              {mode === 'register' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    maxLength={100}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </motion.button>
            </form>

            {/* Google login button */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continue with Google
                </button>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-green-400 hover:text-green-300 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-green-400 hover:text-green-300 underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
