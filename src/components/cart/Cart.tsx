'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, ShoppingCart, Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { CartItem } from '@/types/cart'
import { toast } from 'sonner' // optional — install with `npm i sonner`

interface CartProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
}

export default function Cart({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem }: CartProps) {
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')

  // Compute total price
  const total = items.reduce((sum, item) => {
    const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^\d.]/g, ''))
    return sum + price * item.quantity
  }, 0)

  const formatPrice = (price: number | string) => {
    const numeric = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^\d.]/g, ''))
    return `KSh ${numeric.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // 🔹 Checkout handler
  const handleCheckout = async () => {
    if (!/^2547\d{8}$/.test(phone)) {
      toast.error('Enter a valid M-Pesa phone number (2547XXXXXXXX)')
      return
    }

    setLoading(true)
    setStatus('processing')

    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total, phone }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setStatus('error')
        toast.error('Payment failed', { description: data.error || 'Unexpected error' })
      } else if (data.data?.ResponseCode === '0') {
        setStatus('success')
        toast.success('STK Push sent', { description: 'Check your phone to complete payment' })
      } else {
        setStatus('error')
        toast.warning('M-Pesa response', { description: data.data?.CustomerMessage || 'Unexpected status' })
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setStatus('error')
      toast.error('Network error', { description: 'Please try again' })
    } finally {
      setLoading(false)
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50"
            onClick={onClose}
          />

          {/* Cart Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 z-50"
          >
            <div className="relative h-full flex flex-col bg-gray-900/60 border-l border-white/20 backdrop-blur-lg overflow-hidden">

              {/* Header */}
              <div className="p-6 border-b border-white/20 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6" /> Your Cart
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded transition">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {items.length === 0 ? (
                  <div className="text-center text-white/70 py-16">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-40" />
                    <p>Your cart is empty</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-4 p-4 bg-gray-800/70 rounded-lg shadow"
                    >
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-md object-cover" />
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{item.name}</h3>
                        <p className="text-green-400 font-semibold">{formatPrice(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-white/10 rounded">
                          <Minus className="w-4 h-4 text-white" />
                        </button>
                        <span className="text-white">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-white/10 rounded">
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <button onClick={() => onRemoveItem(item.id)} className="p-1 hover:bg-red-500/30 rounded">
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="p-6 border-t border-white/20 space-y-3">
                  <div className="flex justify-between text-white/80">
                    <span>Total:</span>
                    <span className="text-2xl font-bold text-green-400">{formatPrice(total)}</span>
                  </div>

                  {/* Phone input */}
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      placeholder="2547XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-gray-800/60 border border-white/20 rounded-md text-white placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className={`w-full py-3 font-semibold rounded-lg transition ${
                      loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                    } flex items-center justify-center gap-2`}
                  >
                    {status === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
                    {status === 'success' && <CheckCircle className="w-5 h-5 text-green-300" />}
                    {status === 'error' && <AlertCircle className="w-5 h-5 text-red-300" />}
                    {loading ? 'Processing...' : 'Checkout with M-Pesa'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
