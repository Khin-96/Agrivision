'use client';

import Layout from '@/components/layout/Layout';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { AlertCircle, Upload, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SellPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    quantity: 0,
    unit: '',
    status: 'Availability' as 'Availability' | 'Out of Stock' | 'Restocked' | 'Limited' | 'Coming Soon' | 'Discontinued',
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please log in to list products');
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newImages.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string);
            if (newPreviews.length === files.length) {
              setImagePreviews(prev => [...prev, ...newPreviews]);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    }

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user.idVerified) {
      toast.error('Please verify your ID before listing products');
      router.push('/profile');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      const imageUrls: string[] = [];
      for (const image of images) {
        const form = new FormData();
        form.append('file', image);
        form.append('upload_preset', 'farmers_market');

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload`, {
          method: 'POST',
          body: form,
        });

        if (!uploadResponse.ok) throw new Error('Image upload failed');

        const data = await uploadResponse.json();
        imageUrls.push(data.secure_url);
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images: imageUrls,
          sellerId: user.id,
          sellerName: user.name,
          farmerId: user.id,
          farmerName: user.name,
          available: formData.status === 'Available',
          rating: 0,
          reviews: 0
        }),
      });

      if (!response.ok) throw new Error('Failed to create product');

      toast.success('Product listed successfully!');
      router.push('/buy');
    } catch (error) {
      console.error(error);
      toast.error('Failed to list product');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'quantity' ? Number(value) : value
    }));
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">List a New Product To the Market</h1>

          {!user.idVerified && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
              <div>
                <p className="text-yellow-700 font-medium">Verification Required</p>
                <p className="text-yellow-600 text-sm mt-1">
                  You need to verify your ID before listing products.
                  <button onClick={() => router.push('/profile')} className="ml-2 underline hover:text-yellow-800">Verify now</button>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-8 rounded-2xl shadow-lg space-y-6">
            {/* Product Name */}
            <div>
              <label className="text-gray-700 block mb-2 font-medium">Product Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter product name"
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"/>
            </div>

            {/* Description */}
            <div>
              <label className="text-gray-700 block mb-2 font-medium">Description</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} placeholder="Describe your product"
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"/>
            </div>

            {/* Price, Quantity, Unit, Category, Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="Price" min={0}
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"/>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="Quantity" min={0}
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"/>
              <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="Unit (kg, piece)"
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"/>
              <select name="category" value={formData.category} onChange={handleInputChange}
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Select Category</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="dairy">Dairy</option>
                <option value="grains">Grains</option>
                <option value="herbs">Herbs</option>
                <option value="meat">Meat</option>
                <option value="condiments">Condiments</option>
              </select>
              <select name="status" value={formData.status} onChange={handleInputChange}
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="Available">Available</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Restocked">Restocked</option>
                <option value="Limited">Limited</option>
                <option value="Coming Soon">Coming Soon</option>
                <option value="Discontinued">Discontinued</option>
              </select>
            </div>

            {/* Images */}
            <div>
              <label className="text-gray-700 block mb-2 font-medium">Product Images</label>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden"/>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {imagePreviews.map((img, idx) => (
                  <div key={idx} className="relative group rounded-lg border border-gray-300 overflow-hidden">
                    <img src={img} className="w-full h-32 object-cover group-hover:scale-105 transition-transform"/>
                    <button type="button" onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                      <X className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 5 && (
                  <motion.button type="button" onClick={() => fileInputRef.current?.click()} 
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Upload className="w-8 h-8 mb-2"/>
                    Add Image
                  </motion.button>
                )}
              </div>
              <p className="text-gray-500 text-sm">Upload up to 5 images. First image will be main display.</p>
            </div>

            {/* Buttons */}
            <div className="flex justify-between pt-6">
              <button type="button" onClick={() => router.back()} className="px-6 py-3 text-gray-600 hover:text-gray-900">Cancel</button>
              <button type="submit" disabled={loading || uploading || !user.idVerified} 
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2">
                {uploading ? 'Uploading...' : loading ? 'Listing...' : 'List Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
