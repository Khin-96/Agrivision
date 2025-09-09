// app/profile/page.tsx
'use client';

import Layout from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Camera, Upload, CheckCircle, XCircle } from 'lucide-react';
import { analyzeImage } from '@/lib/gemini';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [idVerificationStatus, setIdVerificationStatus] = useState<'none' | 'processing' | 'verified' | 'failed'>('none');
  const [idImage, setIdImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    farmName: '',
    farmLocation: '',
    farmSize: '',
    farmType: ''
  });

  if (!user) {
    router.push('/auth');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const success = await updateProfile(formData);
      if (success) {
        alert('Profile updated successfully!');
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

    // Convert file to base64 for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setIdImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Verify ID using Gemini AI
    setIdVerificationStatus('processing');
    
    try {
      // In a real app, you would upload the file to your server first
      // For demo purposes, we'll simulate the verification process
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Randomly determine verification status for demo
      const isVerified = Math.random() > 0.3;
      
      if (isVerified) {
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

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-white">Profile Settings</h1>
            <p className="mt-2 text-gray-300">Manage your account information and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/30 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-gray-300">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <button className="absolute bottom-2 right-2 bg-green-600 p-2 rounded-full">
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  
                  <h2 className="text-xl font-bold text-white">{user.name}</h2>
                  <p className="text-gray-300">{user.email}</p>
                  <p className="text-sm text-green-400 capitalize">{user.role}</p>
                  
                  <div className="mt-4">
                    {user.idVerified ? (
                      <div className="flex items-center justify-center text-green-400">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        ID Verified
                      </div>
                    ) : (
                      <div className="flex items-center justify-center text-yellow-400">
                        <XCircle className="w-5 h-5 mr-2" />
                        ID Not Verified
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <button className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-md">
                    Account Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-md">
                    Order History
                  </button>
                  {user.role === 'farmer' && (
                    <button className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-md">
                      Sales Dashboard
                    </button>
                  )}
                  <button className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-400/10 rounded-md">
                    Logout
                  </button>
                </div>
              </div>

              {/* ID Verification Section */}
              {user.role === 'farmer' && !user.idVerified && (
                <div className="mt-6 bg-gray-800/30 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Verify Your Identity</h3>
                  <p className="text-sm text-gray-300 mb-4">
                    Upload a government-issued ID to verify your identity as a farmer.
                  </p>
                  
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                    {idImage ? (
                      <div className="mb-4">
                        <img
                          src={idImage}
                          alt="ID preview"
                          className="mx-auto max-h-32 object-contain"
                        />
                      </div>
                    ) : (
                      <Upload className="mx-auto w-8 h-8 text-gray-400 mb-4" />
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
                      className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                    >
                      {idImage ? 'Change Image' : 'Upload ID'}
                    </label>
                    
                    {idVerificationStatus === 'processing' && (
                      <div className="mt-4 text-yellow-400 text-sm">
                        Verifying your ID...
                      </div>
                    )}
                    
                    {idVerificationStatus === 'verified' && (
                      <div className="mt-4 text-green-400 text-sm">
                        ID verified successfully!
                      </div>
                    )}
                    
                    {idVerificationStatus === 'failed' && (
                      <div className="mt-4 text-red-400 text-sm">
                        Verification failed. Please try again with a clearer image.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800/30 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-300">
                        Address
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  {user.role === 'farmer' && (
                    <>
                      <div className="border-t border-gray-600 pt-6">
                        <h3 className="text-lg font-medium text-white mb-4">Farm Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="farmName" className="block text-sm font-medium text-gray-300">
                              Farm Name
                            </label>
                            <input
                              type="text"
                              id="farmName"
                              name="farmName"
                              value={formData.farmName}
                              onChange={handleInputChange}
                              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>

                          <div>
                            <label htmlFor="farmLocation" className="block text-sm font-medium text-gray-300">
                              Farm Location
                            </label>
                            <input
                              type="text"
                              id="farmLocation"
                              name="farmLocation"
                              value={formData.farmLocation}
                              onChange={handleInputChange}
                              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>

                          <div>
                            <label htmlFor="farmSize" className="block text-sm font-medium text-gray-300">
                              Farm Size (acres)
                            </label>
                            <input
                              type="number"
                              id="farmSize"
                              name="farmSize"
                              value={formData.farmSize}
                              onChange={handleInputChange}
                              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>

                          <div>
                            <label htmlFor="farmType" className="block text-sm font-medium text-gray-300">
                              Farm Type
                            </label>
                            <select
                              id="farmType"
                              name="farmType"
                              value={formData.farmType}
                              onChange={handleInputChange}
                              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    <button
                      type="button"
                      className="px-4 py-2 text-gray-300 hover:text-white"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
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