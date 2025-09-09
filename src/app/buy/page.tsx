// app/buy/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Search, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from 'next-auth/react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  farmerId: string;
  farmerName: string;
  category: string;
  available: boolean;
  rating: number;
  reviews: number;
}

const categories = [
  'all',
  'vegetables',
  'fruits',
  'dairy',
  'grains',
  'herbs',
  'meat',
  'condiments'
];

export default function BuyPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'rating'>('name');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Mock products (replace with real API call if needed)
        const mockProducts: Product[] = [
          {
            id: 1,
            name: 'Organic Tomatoes',
            description: 'Fresh organic tomatoes from our farm, harvested daily.',
            price: '$3.99/kg',
            image: 'https://res.cloudinary.com/demo/image/upload/v1640128563/samples/food/fruit-1.jpg',
            farmerId: '2',
            farmerName: 'Green Valley Farms',
            category: 'vegetables',
            available: true,
            rating: 4.8,
            reviews: 124
          },
          {
            id: 2,
            name: 'Free Range Eggs',
            description: 'Farm fresh eggs from free-range chickens.',
            price: '$5.99/dozen',
            image: 'https://res.cloudinary.com/demo/image/upload/v1640128563/samples/food/eggs.jpg',
            farmerId: '3',
            farmerName: 'Happy Hens Farm',
            category: 'dairy',
            available: true,
            rating: 4.9,
            reviews: 89
          },
          // Add more products as needed...
        ];
        setProducts(mockProducts);
        setFilteredProducts(mockProducts);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.farmerName.toLowerCase().includes(term)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Sort products
    filtered.sort((a, b) => {
      if (sortBy === 'price') {
        return parseFloat(a.price.replace('$', '')) - parseFloat(b.price.replace('$', ''));
      } else if (sortBy === 'rating') {
        return b.rating - a.rating;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, sortBy]);

  const addToCart = (product: Product) => {
    if (!user) {
      signIn('google', { callbackUrl: '/buy' });
      return;
    }
    // Add cart logic here
    alert(`Added ${product.name} to cart`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-white">Browse Products</h1>
            <p className="mt-4 text-xl text-gray-300">Discover fresh produce from local farmers</p>
          </div>

          {/* Search & Filters */}
          <div className="mb-8 bg-gray-800/30 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products, farmers, or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'rating')}
                  className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
                  <option value="rating">Sort by Rating</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-300 text-lg">No products found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  className="bg-gray-800/30 backdrop-blur-md rounded-2xl border border-gray-700/50 overflow-hidden hover:shadow-xl transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="relative h-48 w-full overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-black/20"></div>
                    {!product.available && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-md text-sm">
                        Out of Stock
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white">{product.name}</h3>
                    <p className="text-sm text-green-400 mt-1">By {product.farmerName}</p>

                    <div className="flex items-center mt-2">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-400'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.38 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.293z" />
                        </svg>
                      ))}
                      <span className="ml-2 text-sm text-gray-300">({product.reviews})</span>
                    </div>

                    <p className="text-lg font-semibold text-white mt-2">{product.price}</p>

                    <button
                      onClick={() => addToCart(product)}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}