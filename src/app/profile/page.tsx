// app/profile/page.tsx
'use client';

import Layout from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Camera, Upload, CheckCircle, XCircle, User, FileText, ShoppingCart, LogOut, Shield, IdCard } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateProfile, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [idVerificationStatus, setIdVerificationStatus] = useState<'none' | 'processing' | 'verified' | 'failed'>('none');
  const [idFrontImage, setIdFrontImage] = useState<string | null>(null);
  const [idBackImage, setIdBackImage] = useState<string | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idType, setIdType] = useState<string>('');
  const [verificationError, setVerificationError] = useState<string>('');
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
      
      // Set existing ID images if available
      if (user.idFrontUrl) setIdFrontImage(user.idFrontUrl);
      if (user.idBackUrl) setIdBackImage(user.idBackUrl);
      if (user.idType) setIdType(user.idType);
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
        toast.success('Profile updated successfully!');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleIdUpload = async (side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setVerificationError('File size must be less than 5MB');
      toast.error('File size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setVerificationError('Please upload an image file');
      toast.error('Please upload an image file');
      return;
    }

    if (side === 'front') {
      setIdFrontFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setIdFrontImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setIdBackFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setIdBackImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    setVerificationError('');
  };

  const verifyId = async () => {
    if (!idFrontFile || !idBackFile || !idType) {
      setVerificationError('Please upload both sides of your ID and select the ID type');
      toast.error('Please upload both sides of your ID and select the ID type');
      return;
    }

    setIdVerificationStatus('processing');
    setVerificationError('');
    toast.loading('Verifying your ID...', { id: 'verify-id' });

    try {
      const formData = new FormData();
      formData.append('frontImage', idFrontFile);
      formData.append('backImage', idBackFile);
      formData.append('idType', idType);

      console.log('Submitting ID verification', { idFrontFile, idBackFile, idType });

      const response = await fetch('/api/verify-id', {
        method: 'POST',
        body: formData,
        credentials: 'include', // IMPORTANT: include cookies so NextAuth session is sent
      });
      
      if (!response.ok) {
        // try to parse error body safely
        const errorData = await response.json().catch(() => ({}));
        console.error('Verify ID returned non-OK:', errorData);
        throw new Error(errorData.error || 'Verification failed');
      }
      
      const result = await response.json();
      console.log('ID verification result:', result);
      
      if (result.verified) {
        setIdVerificationStatus('verified');
        toast.dismiss('verify-id');
        toast.success('ID verified successfully!');
        // Update profile with ID URLs and verification status
        await updateProfile({ 
          idVerified: true,
          idFrontUrl: result.frontUrl,
          idBackUrl: result.backUrl,
          idType: idType
        });
      } else {
        setIdVerificationStatus('failed');
        setVerificationError(result.message || 'Verification failed. Please try again.');
        toast.dismiss('verify-id');
        toast.error(result.message || 'Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('ID verification error:', error);
      setIdVerificationStatus('failed');
      const errMessage = error instanceof Error ? error.message : 'An error occurred during verification. Please try again.';
      setVerificationError(errMessage);
      toast.dismiss('verify-id');
      toast.error(errMessage);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <Layout>
      {/* Toaster for toast messages */}
      <Toaster position="top-right" />

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
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6 shadow-xl"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <IdCard className="w-5 h-5 mr-2 text-yellow-400" />
                  {user.idVerified ? 'ID Verification Status' : 'Verify Your Identity'}
                </h3>
                
                {user.idVerified ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center text-green-400 bg-green-400/10 py-2 px-4 rounded-lg">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Your ID has been verified
                    </div>
                    <p className="text-sm text-gray-300">
                      ID Type: <span className="capitalize">{user.idType?.replace('_', ' ')}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {user.idFrontUrl && (
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">Front</p>
                          <img
                            src={user.idFrontUrl}
                            alt="ID Front"
                            className="w-full h-24 object-contain rounded-lg border border-gray-600"
                          />
                        </div>
                      )}
                      {user.idBackUrl && (
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">Back</p>
                          <img
                            src={user.idBackUrl}
                            alt="ID Back"
                            className="w-full h-24 object-contain rounded-lg border border-gray-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-300 mb-5">
                      Upload both sides of your government-issued ID to verify your identity.
                    </p>
                    
                    {/* ID Type Selection */}
                    <div className="mb-4">
                      <label htmlFor="idType" className="block text-sm font-medium text-gray-300 mb-2">
                        ID Type
                      </label>
                      <select
                        id="idType"
                        value={idType}
                        onChange={(e) => setIdType(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Select ID Type</option>
                        <option value="driver_license">Driver's License</option>
                        <option value="national_id">National ID</option>
                        <option value="passport">Passport</option>
                        <option value="school_id">School ID</option>
                      </select>
                    </div>
                    
                    {/* Front ID Upload */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-300 mb-2">Front of ID</p>
                      <div className="border-2 border-dashed border-gray-600 rounded-xl p-4 text-center transition-colors hover:border-green-500/50">
                        {idFrontImage ? (
                          <div className="mb-3">
                            <img
                              src={idFrontImage}
                              alt="ID Front preview"
                              className="mx-auto max-h-32 object-contain rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="py-4">
                            <Upload className="mx-auto w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-xs text-gray-400">Front of ID</p>
                          </div>
                        )}
                        
                        <input
                          type="file"
                          id="id-front-upload"
                          accept="image/*"
                          onChange={(e) => handleIdUpload('front', e)}
                          className="hidden"
                        />
                        <label
                          htmlFor="id-front-upload"
                          className="cursor-pointer bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center"
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          {idFrontImage ? 'Change' : 'Upload Front'}
                        </label>
                      </div>
                    </div>
                    
                    {/* Back ID Upload */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-300 mb-2">Back of ID</p>
                      <div className="border-2 border-dashed border-gray-600 rounded-xl p-4 text-center transition-colors hover:border-green-500/50">
                        {idBackImage ? (
                          <div className="mb-3">
                            <img
                              src={idBackImage}
                              alt="ID Back preview"
                              className="mx-auto max-h-32 object-contain rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="py-4">
                            <Upload className="mx-auto w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-xs text-gray-400">Back of ID</p>
                          </div>
                        )}
                        
                        <input
                          type="file"
                          id="id-back-upload"
                          accept="image/*"
                          onChange={(e) => handleIdUpload('back', e)}
                          className="hidden"
                        />
                        <label
                          htmlFor="id-back-upload"
                          className="cursor-pointer bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center"
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          {idBackImage ? 'Change' : 'Upload Back'}
                        </label>
                      </div>
                    </div>
                    
                    {/* Verification Status */}
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
                        Verification failed
                      </div>
                    )}
                    
                    {verificationError && (
                      <div className="mt-2 text-red-400 text-xs text-center">
                        {verificationError}
                      </div>
                    )}
                    
                    {/* Verify Button */}
                    <button
                      onClick={verifyId}
                      disabled={idVerificationStatus === 'processing' || !idFrontFile || !idBackFile || !idType}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center"
                    >
                      {idVerificationStatus === 'processing' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Verifying...
                        </>
                      ) : (
                        'Verify ID'
                      )}
                    </button>
                  </>
                )}
              </motion.div>
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
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                            >
                              <option value="">Select farm type</option>
                              <option value="crop">Crop Farming</option>
                              <option value="livestock">Livestock Farming</option>
                              <option value="mixed">Mixed Farming</option>
                              <option value="aquaculture">Aquaculture</option>
                              <option value="horticulture">Horticulture</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end pt-6 border-t border-gray-600">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
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