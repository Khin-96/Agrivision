'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';

interface CartItem {
  id: number;
  name: string;
  price: string;
  image: string;
  quantity: number;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemoveItem: (id: number) => void;
}

export default function Cart({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem }: CartProps) {
  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^\d.]/g, ''));
    return sum + (price * item.quantity);
  }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50"
            onClick={onClose}
          />

          {/* Cart Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 z-50"
          >
            {/* Water-transparent container with ripple animation */}
            <div className="relative h-full flex flex-col bg-gray-900/50 border-l border-white/20 overflow-hidden">
              {/* Ripple Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/15 to-white/5 animate-ripple pointer-events-none"></div>

              {/* Header */}
              <div className="relative p-6 border-b border-white/20 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
                    <ShoppingCart className="w-6 h-6" />
                    Your Cart
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              <div className="relative flex-1 overflow-y-auto p-6 z-10">
                {items.length === 0 ? (
                  <div className="text-center text-white/80 py-12 drop-shadow-md">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-60" />
                    <p>Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-4 p-4 bg-gray-900/60 rounded-lg"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h3 className="text-white font-medium drop-shadow-sm">{item.name}</h3>
                          <p className="text-green-400 font-semibold drop-shadow-sm">{item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-white/20 rounded transition-colors"
                          >
                            <Minus className="w-4 h-4 text-white" />
                          </button>
                          <span className="text-white w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-white/20 rounded transition-colors"
                          >
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1 hover:bg-red-500/30 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="relative p-6 border-t border-white/20 z-10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white/80 drop-shadow-sm">Total:</span>
                    <span className="text-2xl font-bold text-green-400 drop-shadow-sm">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <button className="w-full bg-green-600/80 hover:bg-green-700/80 text-white py-3 font-semibold rounded-lg transition-colors">
                    Checkout
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
