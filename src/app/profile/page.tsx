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
      if (user.idType) setIdType(user.idType);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const success = await updateProfile(formData);
      if (success) toast.success('Profile updated successfully!');
      else toast.error('Failed to update profile');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleIdUpload = (side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (side === 'front') setIdFrontFile(file);
    else setIdBackFile(file);
  };

  const verifyId = async () => {
    if (!idFrontFile || !idBackFile || !idType) {
      toast.error('Please upload both sides of your ID and select the ID type');
      return;
    }
    setIdVerificationStatus('processing');
    toast.loading('Verifying your ID...', { id: 'verify-id' });
    try {
      const formData = new FormData();
      formData.append('frontImage', idFrontFile);
      formData.append('backImage', idBackFile);
      formData.append('idType', idType);
      const response = await fetch('/api/verify-id', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Verification failed');
      const result = await response.json();
      if (result.verified) {
        setIdVerificationStatus('verified');
        toast.dismiss('verify-id');
        toast.success('ID verified successfully!');
        await updateProfile({ idVerified: true, idType });
      } else {
        setIdVerificationStatus('failed');
        toast.dismiss('verify-id');
        toast.error(result.message || 'Verification failed');
      }
    } catch (error) {
      setIdVerificationStatus('failed');
      toast.dismiss('verify-id');
      toast.error('An error occurred during verification.');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-10">

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="text-center">
                <div className="relative inline-block mb-5">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                    {user.image ? (
                      <img src={user.image} alt="Profile" className="w-28 h-28 rounded-full object-cover border-4 border-white" />
                    ) : (
                      <User className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <button className="absolute bottom-2 right-2 bg-emerald-600 p-2 rounded-full shadow-md hover:bg-emerald-700 transition">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">{user.name || 'User'}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs">
                  {user.role}
                </div>
                <div className="mt-5">
                  {user.idVerified ? (
                    <div className="flex items-center justify-center text-emerald-600 bg-emerald-50 py-2 px-4 rounded-lg text-sm font-medium">
                      <Shield className="w-4 h-4 mr-2" /> ID Verified
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-yellow-600 bg-yellow-50 py-2 px-4 rounded-lg text-sm font-medium">
                      <XCircle className="w-4 h-4 mr-2" /> ID Not Verified
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition">
                  <User className="w-5 h-5 mr-3" /> Account Settings
                </button>
                <button className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition">
                  <ShoppingCart className="w-5 h-5 mr-3" /> Order History
                </button>
                {user.role === 'farmer' && (
                  <button className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition">
                    <FileText className="w-5 h-5 mr-3" /> Sales Dashboard
                  </button>
                )}
                <button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                  <LogOut className="w-5 h-5 mr-3" /> Logout
                </button>
              </div>
            </div>

            {/* ID Verification */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <IdCard className="w-5 h-5 mr-2 text-emerald-500" /> {user.idVerified ? 'ID Verification Status' : 'Verify Your Identity'}
              </h3>
              {user.idVerified ? (
                <div className="text-emerald-600 text-sm flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" /> Your ID has been verified.
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ID Type</label>
                  <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full mb-4 px-3 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500">
                    <option value="">Select ID Type</option>
                    <option value="driver_license">Driver's License</option>
                    <option value="national_id">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="school_id">School ID</option>
                  </select>
                  <div className="space-y-3">
                    <input type="file" id="id-front-upload" accept="image/*" onChange={(e) => handleIdUpload('front', e)} className="w-full text-sm" />
                    <input type="file" id="id-back-upload" accept="image/*" onChange={(e) => handleIdUpload('back', e)} className="w-full text-sm" />
                  </div>
                  <button onClick={verifyId} disabled={idVerificationStatus === 'processing'} className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition">
                    {idVerificationStatus === 'processing' ? 'Verifying...' : 'Verify ID'}
                  </button>
                  {idVerificationStatus === 'failed' && <p className="mt-2 text-sm text-red-600">Verification failed. Please try again.</p>}
                  {verificationError && <p className="mt-2 text-sm text-red-600">{verificationError}</p>}
                </>
              )}
            </motion.div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Personal Information</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>

                {user.role === 'farmer' && (
                  <>
                    <h3 className="text-xl font-semibold text-gray-800 mt-8">Farm Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Farm Name</label>
                        <input type="text" name="farmName" value={formData.farmName} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Farm Location</label>
                        <input type="text" name="farmLocation" value={formData.farmLocation} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Farm Size (acres)</label>
                        <input type="number" name="farmSize" value={formData.farmSize} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Farm Type</label>
                        <select name="farmType" value={formData.farmType} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500">
                          <option value="">Select type</option>
                          <option value="crop">Crop Farming</option>
                          <option value="livestock">Livestock Farming</option>
                          <option value="mixed">Mixed Farming</option>
                          <option value="aquaculture">Aquaculture</option>
                          <option value="horticulture">Horticulture</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end pt-6">
                  <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium flex items-center">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
