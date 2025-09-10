'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import Image from 'next/image';
import { Search, ShoppingCart, Star, Filter, SortAsc } from 'lucide-react';
import Cart from '@/components/cart/Cart';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  quantity: number;
  unit: string;
  images: string[];
  farmerId: string;
  farmerName: string;
  available: boolean;
  rating: number;
  reviews: number;
  status: 'Available' | 'Out of Stock' | 'Restocked' | 'Limited' | 'Coming Soon' | 'Discontinued';
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  unit: string;
}

const categories = ['all','vegetables','fruits','dairy','grains','herbs','meat','condiments'];

export default function BuyPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'rating'>('name');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
        setFilteredProducts(data);
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
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(term) ||
             p.description.toLowerCase().includes(term) ||
             p.farmerName.toLowerCase().includes(term)
      );
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    filtered.sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });
    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, sortBy]);

  const addToCart = (product: Product) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCartItems([...cartItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        quantity: 1,
        unit: product.unit
      }]);
    }
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return removeItem(id);
    setCartItems(cartItems.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const removeItem = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const totalCartItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        {/* Floating Cart Button */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
        >
          <ShoppingCart className="w-6 h-6"/>
          {totalCartItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {totalCartItems}
            </span>
          )}
        </button>

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900">Browse Products</h1>
            <p className="mt-4 text-lg text-gray-600">Discover fresh produce from local farmers</p>
          </div>

          {/* Search & Filters */}
          <div className="mb-8 bg-white border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"/>
                <input
                  type="text"
                  placeholder="Search products, farmers, or categories..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 flex items-center gap-2 hover:bg-gray-200"
                >
                  <Filter className="w-5 h-5"/>
                  Filters
                </button>
                <button className="px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 flex items-center gap-2 hover:bg-gray-200">
                  <SortAsc className="w-5 h-5"/>
                  Sort
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'name'|'price'|'rating')}
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                    <option value="rating">Rating</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200">
              <p className="text-gray-600 text-lg">No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white border border-gray-200 overflow-hidden flex flex-col">
                  <div className="relative h-48 w-full">
                    <Image
                      src={product.images[0] || '/placeholder-product.jpg'}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 right-4 px-2 py-1 text-white text-sm font-semibold"
                      style={{
                        backgroundColor: product.status === 'Available' ? '#22c55e' :
                                         product.status === 'Out of Stock' ? '#ef4444' :
                                         product.status === 'Restocked' ? '#3b82f6' :
                                         product.status === 'Limited' ? '#f59e0b' :
                                         product.status === 'Coming Soon' ? '#8b5cf6' :
                                         '#6b7280'
                      }}
                    >
                      {product.status}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">By {product.farmerName}</p>
                    <div className="flex items-center mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                      <span className="ml-2 text-sm text-gray-600">({product.reviews})</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mt-2">${product.price.toFixed(2)}/{product.unit}</p>
                    <p className="text-gray-600 text-sm mt-2 line-clamp-2">{product.description}</p>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.status !== 'Available'}
                      className={`mt-4 w-full px-4 py-2 text-white font-medium transition-colors 
                        ${product.status === 'Available' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                      {product.status === 'Available' ? 'Add to Cart' : product.status}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Component */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
      />
    </Layout>
  );
}
