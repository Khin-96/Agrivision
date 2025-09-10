// app/sell/page.tsx
'use client';

import Layout from '@/components/layout/Layout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Shield, AlertCircle } from 'lucide-react';

export default function SellPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    quantity: 0,
    unit: '',
    imageUrl: ''
  });
  const [loading, setLoading] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please log in to list products');
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

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user.idVerified) {
      toast.error('Please verify your ID before listing products');
      router.push('/profile');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sellerId: user.id,
          sellerName: user.name
        }),
      });

      if (!response.ok) throw new Error('Failed to create product');

      toast.success('Product listed successfully!');
      router.push('/market');
    } catch (error) {
      console.error('Product creation error:', error);
      toast.error('Failed to list product');
    } finally {
      setLoading(false);
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
      <div className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold text-white mb-2">List a New Product</h1>

        {!user.idVerified && (
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">Verification Required</p>
              <p className="text-yellow-300 text-sm mt-1">
                You need to verify your ID before listing products. 
                <button 
                  onClick={() => router.push('/profile')}
                  className="ml-2 underline hover:text-yellow-200"
                >
                  Verify now
                </button>
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 p-8 rounded-2xl shadow-xl space-y-6"
        >
          <div>
            <label className="text-white block mb-2 font-medium">Product Name</label>
            <input
              type="text"
              name="name"
              className="w-full p-3.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="text-white block mb-2 font-medium">Description</label>
            <textarea
              name="description"
              className="w-full p-3.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              placeholder="Describe your product in detail"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-white block mb-2 font-medium">Price ($)</label>
              <input
                type="number"
                name="price"
                step="0.01"
                min="0"
                className="w-full p-3.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                value={formData.price}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label className="text-white block mb-2 font-medium">Quantity</label>
              <input
                type="number"
                name="quantity"
                min="1"
                className="w-full p-3.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                value={formData.quantity}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-white block mb-2 font-medium">Unit</label>
              <input
                type="text"
                name="unit"
                className="w-full p-3.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                value={formData.unit}
                onChange={handleInputChange}
                required
                placeholder="e.g., kg, lb, piece"
              />
            </div>

            <div>
              <label className="text-white block mb-2 font-medium">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-3.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                required
              >
                <option value="">Select category</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="grains">Grains</option>
                <option value="dairy">Dairy</option>
                <option value="meat">Meat</option>
                <option value="poultry">Poultry</option>
                <option value="seafood">Seafood</option>
                <option value="herbs">Herbs</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-white block mb-2 font-medium">Image URL</label>
            <input
              type="url"
              name="imageUrl"
              className="w-full p-3.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              value={formData.imageUrl}
              onChange={handleInputChange}
              required
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !user.idVerified}
            className="w-full py-3.5 px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            {user.idVerified ? (
              loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Listing...
                </>
              ) : (
                'List Product'
              )
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Verification Required
              </>
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
}
