'use client';

import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import Cart from '@/components/cart/Cart';
import { ShoppingCart, User, PlusCircle, ShoppingBag, Store, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CartItem } from '@/types/cart';

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
  status: 'Available' | 'Out of Stock' | 'Restocked' | 'Limited' | 'Coming Soon';
}

export default function MarketplacePage() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Cart handlers
  const addToCart = (product: Product) => {
    if (!user) {
      signIn('google', { callbackUrl: '/market' });
      return;
    }

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0] || '/placeholder-product.jpg',
        quantity: 1,
        unit: product.unit
      }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const cartTotal = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Loader
  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Cart Component */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
      />

      {/* Floating Actions */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {user?.role === 'farmer' && (
          <Link
            href="/sell"
            className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 transform hover:scale-105"
            title="Sell Products"
          >
            <PlusCircle className="w-6 h-6" />
          </Link>
        )}
        <button
          onClick={() => setIsCartOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center relative transition-all duration-200 transform hover:scale-105"
        >
          <ShoppingCart className="w-6 h-6" />
          {cartTotal > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {cartTotal}
            </span>
          )}
        </button>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Fresh from Farm to Table
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Discover the finest local produce from trusted farmers in your community
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/buy"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
            >
              Shop Now
            </Link>
            {user?.role === 'farmer' ? (
              <Link
                href="/sell"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors text-lg"
              >
                Sell Products
              </Link>
            ) : (
              <button
                onClick={() => router.push('/auth?tab=register')}
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors text-lg"
              >
                Become a Farmer
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <ShoppingBag className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-gray-900 mb-2">500+</h3>
            <p className="text-gray-600">Products Available</p>
          </div>
          <div>
            <User className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-gray-900 mb-2">100+</h3>
            <p className="text-gray-600">Local Farmers</p>
          </div>
          <div>
            <Store className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-gray-900 mb-2">50+</h3>
            <p className="text-gray-600">Communities Served</p>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Featured Products
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.slice(0, 8).map(product => (
              <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="relative h-48 w-full">
                  <Image
                    src={product.images[0] || '/placeholder-product.jpg'}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      product.status === 'Available' ? 'bg-green-100 text-green-800' :
                      product.status === 'Out of Stock' ? 'bg-red-100 text-red-800' :
                      product.status === 'Restocked' ? 'bg-blue-100 text-blue-800' :
                      product.status === 'Limited' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {product.status}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">By {product.farmerName}</p>
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-gray-600">({product.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      KSh {product.price.toFixed(2)}/{product.unit}
                    </span>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.status !== 'Available'}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        product.status === 'Available'
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {product.status === 'Available' ? 'Add to Cart' : product.status}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/buy"
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors text-lg"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-green-500 to-blue-500 py-16 px-4 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Your Farming Journey?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of farmers already selling their fresh produce on our platform
          </p>
          {user ? (
            <Link
              href="/sell"
              className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
            >
              Start Selling Today
            </Link>
          ) : (
            <button
              onClick={() => router.push('/auth?tab=register')}
              className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
            >
              Sign Up as Farmer
            </button>
          )}
        </div>
      </section>
    </Layout>
  );
}