// app/profile/page.tsx
'use client';

import Layout from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Camera, Upload, CheckCircle, XCircle, User, FileText, ShoppingCart, LogOut, Shield } from 'lucide-react';
import { analyzeContent } from '@/lib/gemini';

export default function ProfilePage() {
  const { user, updateProfile, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [idVerificationStatus, setIdVerificationStatus] = useState<'none' | 'processing' | 'verified' | 'failed'>('none');
  const [idImage, setIdImage] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    farmName: '',
    farmLocation: '',
    farmSize: '',
    farmType: ''
  });

  // Initialize form data when user is available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        farmName: user.farmName || '',
        farmLocation: user.farmLocation || '',
        farmSize: user.farmSize || '',
        farmType: user.farmType || ''
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const success = await updateProfile(formData);
      if (success) {
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdFile(file);
    
    // Convert file to base64 for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setIdImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Verify ID using Gemini AI
    setIdVerificationStatus('processing');
    
    try {
      // In a real implementation, you would send the file to your server
      // and then call the Gemini API from there
      const formData = new FormData();
      formData.append('idImage', file);
      
      const response = await fetch('/api/verify-id', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Verification failed');
      
      const result = await response.json();
      
      if (result.verified) {
        setIdVerificationStatus('verified');
        await updateProfile({ idVerified: true });
      } else {
        setIdVerificationStatus('failed');
      }
    } catch (error) {
      console.error('ID verification error:', error);
      setIdVerificationStatus('failed');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-white"
            >
              Profile Settings
            </motion.h1>
            <p className="mt-3 text-lg text-gray-300">Manage your account information and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6 shadow-xl">
                <div className="text-center">
                  <div className="relative inline-block mb-5">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center mb-4 shadow-lg">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt="Profile"
                          className="w-28 h-28 rounded-full object-cover border-4 border-gray-800"
                        />
                      ) : (
                        <User className="w-12 h-12 text-white" />
                      )}
                    </div>
                    <button className="absolute bottom-2 right-2 bg-green-600 p-2 rounded-full shadow-md hover:bg-green-700 transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  
                  <h2 className="text-xl font-bold text-white">{user.name || 'User'}</h2>
                  <p className="text-gray-300 mt-1">{user.email}</p>
                  <div className="inline-flex items-center mt-2 px-3 py-1 rounded-full bg-gray-700/50 text-sm">
                    <span className="text-green-400 capitalize">{user.role}</span>
                  </div>
                  
                  <div className="mt-5">
                    {user.idVerified ? (
                      <div className="flex items-center justify-center text-green-400 bg-green-400/10 py-2 px-4 rounded-lg">
                        <Shield className="w-5 h-5 mr-2" />
                        ID Verified
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-yellow-400 bg-yellow-400/10 py-2 px-4 rounded-lg">
                        <XCircle className="w-5 h-5 mr-2" />
                        ID Not Verified
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <button className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors">
                    <User className="w-5 h-5 mr-3" />
                    Account Settings
                  </button>
                  <button className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors">
                    <ShoppingCart className="w-5 h-5 mr-3" />
                    Order History
                  </button>
                  {user.role === 'farmer' && (
                    <button className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors">
                      <FileText className="w-5 h-5 mr-3" />
                      Sales Dashboard
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                  </button>
                </div>
              </div>

              {/* ID Verification Section */}
              {user.role === 'farmer' && !user.idVerified && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6 shadow-xl"
                >
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-yellow-400" />
                    Verify Your Identity
                  </h3>
                  <p className="text-sm text-gray-300 mb-5">
                    Upload a government-issued ID to verify your identity as a farmer. This is required to list products for sale.
                  </p>
                  
                  <div className="border-2 border-dashed border-gray-600 rounded-xl p-5 text-center transition-colors hover:border-green-500/50">
                    {idImage ? (
                      <div className="mb-4">
                        <img
                          src={idImage}
                          alt="ID preview"
                          className="mx-auto max-h-40 object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="py-6">
                        <Upload className="mx-auto w-10 h-10 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-400">Upload a clear photo of your government ID</p>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      id="id-upload"
                      accept="image/*"
                      onChange={handleIdUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="id-upload"
                      className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {idImage ? 'Change Image' : 'Upload ID'}
                    </label>
                    
                    {idVerificationStatus === 'processing' && (
                      <div className="mt-4 flex items-center justify-center text-yellow-400 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
                        Verifying your ID...
                      </div>
                    )}
                    
                    {idVerificationStatus === 'verified' && (
                      <div className="mt-4 flex items-center justify-center text-green-400 text-sm">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        ID verified successfully!
                      </div>
                    )}
                    
                    {idVerificationStatus === 'failed' && (
                      <div className="mt-4 flex items-center justify-center text-red-400 text-sm">
                        <XCircle className="w-5 h-5 mr-2" />
                        Verification failed. Please try again with a clearer image.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Main Form */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-8 shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-6">Personal Information</h2>
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                        placeholder="Enter your email"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                        placeholder="Enter your address"
                      />
                    </div>
                  </div>

                  {user.role === 'farmer' && (
                    <>
                      <div className="border-t border-gray-600 pt-8">
                        <h3 className="text-xl font-semibold text-white mb-6">Farm Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="farmName" className="block text-sm font-medium text-gray-300 mb-2">
                              Farm Name
                            </label>
                            <input
                              type="text"
                              id="farmName"
                              name="farmName"
                              value={formData.farmName}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                              placeholder="Enter your farm name"
                            />
                          </div>

                          <div>
                            <label htmlFor="farmLocation" className="block text-sm font-medium text-gray-300 mb-2">
                              Farm Location
                            </label>
                            <input
                              type="text"
                              id="farmLocation"
                              name="farmLocation"
                              value={formData.farmLocation}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                              placeholder="Enter your farm location"
                            />
                          </div>

                          <div>
                            <label htmlFor="farmSize" className="block text-sm font-medium text-gray-300 mb-2">
                              Farm Size (acres)
                            </label>
                            <input
                              type="number"
                              id="farmSize"
                              name="farmSize"
                              value={formData.farmSize}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                              placeholder="Enter farm size in acres"
                            />
                          </div>

                          <div>
                            <label htmlFor="farmType" className="block text-sm font-medium text-gray-300 mb-2">
                              Farm Type
                            </label>
                            <select
                              id="farmType"
                              name="farmType"
                              value={formData.farmType}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                            >
                              <option value="">Select farm type</option>
                              <option value="organic">Organic</option>
                              <option value="conventional">Conventional</option>
                              <option value="hydroponic">Hydroponic</option>
                              <option value="aquaponic">Aquaponic</option>
                              <option value="livestock">Livestock</option>
                              <option value="mixed">Mixed Farming</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end space-x-4 pt-6">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-2.5 text-gray-300 hover:text-white bg-gray-700/50 rounded-lg transition-colors"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}