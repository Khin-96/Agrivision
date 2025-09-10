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
          <Link href="/sell" className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg flex items-center gap-2 transition-colors">
            <PlusCircle className="w-5 h-5" />
          </Link>
        )}

        <button
          className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg flex items-center gap-2 relative transition-colors"
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingCart className="w-5 h-5" />
          {cartTotal > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
              {cartTotal}
            </span>
          )}
        </button>

        <button
          className="bg-gray-700 hover:bg-gray-800 text-white p-3 rounded-full shadow-lg transition-colors"
          onClick={() => router.push('/profile')}
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative w-full h-96 overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('/market.jpg')" }}>
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight">
            Farmer's <span className="text-green-400">Marketplace</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg sm:text-xl text-gray-200">
            Buy fresh produce directly from local farmers or sell your harvest.
          </p>

          {!user ? (
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => signIn('google', { callbackUrl: '/buy' })}
                className="px-6 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
              >
                Login as Buyer
              </button>
              <button
                onClick={() => signIn('google', { callbackUrl: '/sell' })}
                className="px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                Login as Seller
              </button>
            </div>
          ) : (
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/buy"
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" />
                Shop as Buyer
              </Link>
              <Link
                href="/sell"
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Store className="w-5 h-5" />
                Sell as Farmer
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Products Section */}
      <div className="py-12 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-base text-green-600 font-semibold tracking-wide uppercase">
              Featured Products
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-800 sm:text-4xl">
              Fresh From Our Farms
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
              Discover the best produce from local farmers in your area.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="text-center text-gray-600 bg-white/80 backdrop-blur-md border border-white/30 p-8">
              No products available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map(product => (
                <div key={product.id} className="bg-white/80 backdrop-blur-md border border-white/30 shadow-xl overflow-hidden flex flex-col">
                  <div className="relative h-48 w-full">
                    <Image
                      src={product.images[0] || '/placeholder-product.jpg'}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-gray-800">{product.name}</h3>
                    <p className="mt-1 text-sm text-green-600">By {product.farmerName}</p>

                    <div className="flex items-center mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                      <span className="ml-2 text-sm text-gray-600">({product.reviews})</span>
                    </div>

                    <p className="mt-2 text-gray-600 flex-grow line-clamp-2">{product.description}</p>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-600">${product.price.toFixed(2)}/{product.unit}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        product.status === 'Available' ? 'bg-green-100 text-green-800' :
                        product.status === 'Out of Stock' ? 'bg-red-100 text-red-700' :
                        product.status === 'Restocked' ? 'bg-blue-100 text-blue-700' :
                        product.status === 'Limited' ? 'bg-yellow-100 text-yellow-700' :
                        product.status === 'Coming Soon' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {product.status}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.status !== 'Available'}
                      className="mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white transition-colors disabled:bg-gray-300"
                    >
                      {product.status === 'Available' ? 'Add to Cart' : product.status}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-16 text-center">
            <Link
              href="/buy"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-500 hover:bg-green-600 transition-colors"
            >
              View All Products
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
