'use client';

import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import Cart from '@/components/cart/Cart';
import { ShoppingCart, User, PlusCircle, ShoppingBag, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
}

interface CartItem extends Product {
  cartQuantity: number;
}

export default function MarketplacePage() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Redirect logged-in users based on their role
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'buyer') {
        router.push('/buy');
      } else if (user.role === 'farmer') {
        router.push('/sell');
      }
    }
  }, [authLoading, user, router]);

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
          item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, cartQuantity: 1 }];
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
        item.id === id ? { ...item, cartQuantity: quantity } : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const cartTotal = cartItems.reduce((total, item) => total + item.cartQuantity, 0);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
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
          <motion.button
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            asChild
          >
            <Link href="/sell">
              <PlusCircle className="w-5 h-5" />
            </Link>
          </motion.button>
        )}

        <motion.button
          className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg flex items-center gap-2 relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingCart className="w-5 h-5" />
          {cartTotal > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
              {cartTotal}
            </span>
          )}
        </motion.button>

        <motion.button
          className="bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-full shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/profile')}
        >
          <User className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Hero Section */}
      <div
        className="relative w-full h-96 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/market.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-6">
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            Farmer's <span className="text-green-400">Marketplace</span>
          </motion.h1>

          <motion.p
            className="mt-6 max-w-2xl text-lg sm:text-xl text-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
          >
            Buy fresh produce directly from local farmers or sell your harvest.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 1 }}
          >
            {!user ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => signIn('google', { callbackUrl: '/buy' })}
                  className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  Login as Buyer
                </button>
                <button
                  onClick={() => signIn('google', { callbackUrl: '/sell' })}
                  className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Login as Seller
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/buy"
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Shop as Buyer
                </Link>
                <Link
                  href={user.role === 'farmer' ? '/sell' : '/auth?mode=register'}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Store className="w-5 h-5" />
                  {user.role === 'farmer' ? 'Sell as Farmer' : 'Become a Seller'}
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Featured Products Section */}
      <div className="py-12 bg-gradient-to-b from-gray-900 to-gray-800 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-base text-green-400 font-semibold tracking-wide uppercase">
              Featured Products
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-white sm:text-4xl">
              Fresh From Our Farms
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-300 mx-auto">
              Discover the best produce from local farmers in your area.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-400">No products available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  className="flex flex-col rounded-xl overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="relative bg-gray-800/30 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-xl overflow-hidden flex flex-col h-full">
                    <div className="relative h-48 w-full overflow-hidden">
                      <Image
                        src={product.images[0] || '/placeholder.png'}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                    
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-bold text-white">{product.name}</h3>
                      <p className="mt-2 text-sm text-green-400">By {product.farmerName}</p>
                      <p className="mt-2 text-gray-300 flex-grow">{product.description}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-2xl font-bold text-green-400">${product.price.toFixed(2)}</span>
                        <button 
                          onClick={() => addToCart(product)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          disabled={!product.available || loading}
                        >
                          {product.available ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-16 text-center">
            <Link 
              href="/buy" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              View All Products
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              How It Works
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-700/50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white mb-4">
                1
              </div>
              <h3 className="text-lg font-medium text-white">Create Account</h3>
              <p className="mt-2 text-gray-300">
                Sign up as a buyer or farmer. Farmers need to verify their ID to start selling.
              </p>
            </div>

            <div className="bg-gray-700/50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white mb-4">
                2
              </div>
              <h3 className="text-lg font-medium text-white">Browse or List</h3>
              <p className="mt-2 text-gray-300">
                Buyers can browse fresh produce. Farmers can list their products with details.
              </p>
            </div>

            <div className="bg-gray-700/50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white mb-4">
                3
              </div>
              <h3 className="text-lg font-medium text-white">Transaction</h3>
              <p className="mt-2 text-gray-300">
                Secure transactions and delivery coordination between buyers and farmers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}