'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, ShoppingCart, Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { CartItem } from '@/types/cart'
import { toast } from 'sonner'

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

  // Format phone number as user types
  const handlePhoneChange = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Auto-format: if starts with 0, convert to 254
    if (digits.startsWith('0') && digits.length === 10) {
      setPhone(`254${digits.substring(1)}`)
    } else if (digits.startsWith('254') && digits.length <= 12) {
      setPhone(digits)
    } else if (digits.length <= 10) {
      setPhone(digits)
    }
  }

  // Validate phone number
  const isValidPhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '')
    return /^(2547\d{8}|07\d{8})$/.test(digits)
  }

  // 🔹 Checkout handler
  const handleCheckout = async () => {
    if (!isValidPhone(phone)) {
      toast.error('Invalid phone number', {
        description: 'Please use format: 2547XXXXXXXX or 07XXXXXXXX'
      })
      return
    }

    if (total < 1) {
      toast.error('Invalid amount', {
        description: 'Total must be at least KSh 1'
      })
      return
    }

    setLoading(true)
    setStatus('processing')

    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: phone,
          amount: total,
          items: items
        }),
      })

      const data = await res.json()

      if (data.success) {
        setStatus('success')
        toast.success('Payment initiated', {
          description: 'Check your phone to complete M-Pesa payment'
        })
        
        // Optional: Clear cart on success
        // items.forEach(item => onRemoveItem(item.id))
        
      } else {
        setStatus('error')
        toast.error('Payment failed', {
          description: data.error || 'Please try again'
        })
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setStatus('error')
      toast.error('Network error', {
        description: 'Please check your connection and try again'
      })
    } finally {
      setLoading(false)
      // Reset status after 4 seconds
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
                        <button 
                          onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))} 
                          className="p-1 hover:bg-white/10 rounded"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4 text-white" />
                        </button>
                        <span className="text-white min-w-8 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} 
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <button 
                        onClick={() => onRemoveItem(item.id)} 
                        className="p-1 hover:bg-red-500/30 rounded transition"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="p-6 border-t border-white/20 space-y-4">
                  <div className="flex justify-between text-white/80">
                    <span>Total:</span>
                    <span className="text-2xl font-bold text-green-400">{formatPrice(total)}</span>
                  </div>

                  {/* Phone input with validation */}
                  <div className="space-y-2">
                    <label className="text-white/80 text-sm">
                      M-Pesa Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                      <input
                        type="tel"
                        placeholder="2547XXXXXXXX or 07XXXXXXXX"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className={`w-full pl-10 pr-3 py-2 bg-gray-800/60 border rounded-md text-white placeholder:text-gray-500 focus:ring-2 outline-none transition ${
                          phone && !isValidPhone(phone) 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-white/20 focus:ring-green-500'
                        }`}
                      />
                    </div>
                    {phone && !isValidPhone(phone) && (
                      <p className="text-red-400 text-sm">
                        Please use 2547XXXXXXXX or 07XXXXXXXX format
                      </p>
                    )}
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={loading || !isValidPhone(phone) || total < 1}
                    className={`w-full py-3 font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
                      loading || !isValidPhone(phone) || total < 1
                        ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {status === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
                    {status === 'success' && <CheckCircle className="w-5 h-5 text-green-300" />}
                    {status === 'error' && <AlertCircle className="w-5 h-5 text-red-300" />}
                    
                    {loading 
                      ? 'Processing...' 
                      : `Pay ${formatPrice(total)} with M-Pesa`
                    }
                  </button>

                  {/* Help text */}
                  <p className="text-gray-400 text-xs text-center">
                    You'll receive an STK Push on your phone to complete payment
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}