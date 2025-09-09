'use client';

import Layout from '@/components/layout/Layout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function SellPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is authenticated and is a farmer
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'farmer')) {
      toast.error('Only verified farmers can list products');
      router.push('/market');
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

  if (!user || user.role !== 'farmer') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-center px-4">
          <p className="text-white text-lg">
            Only verified farmers can list products. Please log in as a farmer.
          </p>
        </div>
      </Layout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          price,
          category,
          quantity,
          unit,
          images: [imageUrl],
          farmerId: user.id,
          farmerName: user.name
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

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold text-white mb-8">List a New Product</h1>
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4"
        >
          <div>
            <label className="text-white block mb-1">Product Name</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-700 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-white block mb-1">Description</label>
            <textarea
              className="w-full p-2 rounded bg-gray-700 text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white block mb-1">Price ($)</label>
              <input
                type="number"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="text-white block mb-1">Quantity</label>
              <input
                type="number"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white block mb-1">Unit</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-white block mb-1">Category</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-white block mb-1">Image URL</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-700 text-white"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded w-full"
            disabled={loading}
          >
            {loading ? 'Listing...' : 'List Product'}
          </button>
        </form>
      </div>
    </Layout>
  );
}