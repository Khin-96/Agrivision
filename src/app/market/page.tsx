'use client';

import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import Cart from '@/components/cart/Cart';
import { ShoppingCart } from 'lucide-react';

// Mock data for marketplace items
const marketplaceItems = [
  {
    id: 1,
    name: 'Premium Plant Analysis Package',
    description: 'Get detailed analysis of up to 50 plants per month with priority processing.',
    price: '$19.99/month',
    image: 'https://res.cloudinary.com/demo/image/upload/v1640128563/samples/plants/plants-1.jpg'
  },
  {
    id: 2,
    name: 'Garden Health Monitor',
    description: 'Continuous monitoring for your entire garden with weekly health reports.',
    price: '$29.99/month',
    image: 'https://res.cloudinary.com/demo/image/upload/v1640128563/samples/plants/plants-2.jpg'
  },
  {
    id: 3,
    name: 'Commercial Farm Solution',
    description: 'Enterprise-grade plant disease detection for large-scale farming operations.',
    price: '$99.99/month',
    image: 'https://res.cloudinary.com/demo/image/upload/v1640128563/samples/plants/plants-3.jpg'
  },
  {
    id: 4,
    name: 'One-Time Expert Consultation',
    description: '30-minute video call with our plant health experts to discuss your findings.',
    price: '$49.99',
    image: 'https://res.cloudinary.com/demo/image/upload/v1640128563/samples/plants/plants-4.jpg'
  },
  {
    id: 5,
    name: 'Plant Disease Handbook',
    description: 'Comprehensive digital guide to common plant diseases and treatments.',
    price: '$14.99',
    image: 'https://res.cloudinary.com/demo/image/upload/v1640128563/samples/plants/plants-5.jpg'
  },
  {
    id: 6,
    name: 'Seasonal Care Calendar',
    description: 'Personalized care schedule for your plants based on your location and climate.',
    price: '$9.99',
    image: 'https://res.cloudinary.com/demo/image/upload/v1640128563/samples/plants/plants-6.jpg'
  }
];

interface CartItem {
  id: number;
  name: string;
  price: string;
  image: string;
  quantity: number;
}

export default function Marketplace() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (item: typeof marketplaceItems[0]) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevItems.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: number, quantity: number) => {
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

  const removeFromCart = (id: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const cartTotal = cartItems.reduce((total, item) => total + item.quantity, 0);

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

      {/* Floating Cart Button */}
      <motion.button
        className="fixed top-4 right-4 z-40 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg flex items-center gap-2"
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

      {/* Hero Section with Background Image */}
      <div
        className="relative w-full h-96 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/market.jpg')" }}
      >
        {/* Dark overlay for premium contrast */}
        <div className="absolute inset-0 bg-black/40 z-10"></div>

        {/* Hero Content */}
        <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-6">
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            AgriVision <span className="text-green-400">Marketplace</span>
          </motion.h1>

          <motion.p
            className="mt-6 max-w-2xl text-lg sm:text-xl text-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
          >
            Discover premium tools and services to enhance your plant care experience.
          </motion.p>
        </div>
      </div>

      {/* Marketplace Section */}
      <div className="py-12 bg-gradient-to-b from-gray-900 to-gray-800 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-base text-green-400 font-semibold tracking-wide uppercase">
              Products & Services
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-white sm:text-4xl">
              Enhance Your AgriVision Experience
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-300 mx-auto">
              Explore our premium offerings designed to help you get the most out of your plant care journey.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {marketplaceItems.map((item) => (
              <motion.div
                key={item.id}
                className="flex flex-col rounded-xl overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                whileHover={{ y: -5 }}
              >
                {/* Glassmorphism Card */}
                <div className="relative bg-gray-800/30 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-xl overflow-hidden flex flex-col h-full">
                  {/* Product Image */}
                  <div className="relative h-48 w-full overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/20"></div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-white">{item.name}</h3>
                    <p className="mt-2 text-gray-300 flex-grow">{item.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-400">{item.price}</span>
                      <button 
                        onClick={() => addToCart(item)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Additional CTA */}
          <div className="mt-16 text-center">
            <div className="bg-gray-800/30 backdrop-blur-md rounded-2xl border border-gray-700/50 p-8">
              <h3 className="text-2xl font-bold text-white">Can't find what you're looking for?</h3>
              <p className="mt-2 text-gray-300">Contact us for custom solutions tailored to your specific needs.</p>
              <button className="mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="bg-green-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Stay Updated with AgriVision
          </h2>
          <p className="mt-4 text-lg text-green-100">
            Subscribe to our newsletter for the latest product updates and plant care tips.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-5 py-3 rounded-md focus:ring-2 focus:ring-green-400 focus:outline-none flex-grow text-gray-900"
              />
              <button className="px-6 py-3 bg-white text-green-800 font-medium rounded-md hover:bg-gray-100">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
