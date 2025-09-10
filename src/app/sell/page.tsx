'use client';

import Layout from '@/components/layout/Layout';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { AlertCircle, Upload, X, Edit, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  quantity: number;
  unit: string;
  status: string;
  images: string[];
}

export default function SellPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    quantity: 0,
    unit: '',
    status: 'Available',
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [fetchingProducts, setFetchingProducts] = useState(true);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please log in to list products');
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  // Fetch current user's products
  useEffect(() => {
    if (!user) return;
    const fetchUserProducts = async () => {
      setFetchingProducts(true);
      try {
        const res = await fetch(`/api/products?sellerId=${user.id}`);
        if (!res.ok) throw new Error('Failed to fetch products');
        const data = await res.json();
        setUserProducts(data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load your products');
      } finally {
        setFetchingProducts(false);
      }
    };
    fetchUserProducts();
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newImages.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string);
            if (newPreviews.length === files.length) {
              setImagePreviews(prev => [...prev, ...newPreviews]);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    }

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'quantity' ? Number(value) : value
    }));
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const resetForm = () => {
    setFormData({ name: '', description: '', price: 0, category: '', quantity: 0, unit: '', status: 'Available' });
    setImages([]);
    setImagePreviews([]);
    setEditingProductId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user.idVerified) {
      toast.error('Please verify your ID before listing products');
      router.push('/profile');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      const imageUrls: string[] = [];

      for (const image of images) {
        const form = new FormData();
        form.append('file', image);
        form.append('upload_preset', 'farmers_market');

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload`, {
          method: 'POST',
          body: form,
        });

        if (!uploadResponse.ok) throw new Error('Image upload failed');

        const data = await uploadResponse.json();
        imageUrls.push(data.secure_url);
      }

      let response;
      if (editingProductId) {
        // Update existing product
        response = await fetch(`/api/products/${editingProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            images: imageUrls,
            sellerId: user.id,
            sellerName: user.name,
            farmerId: user.id,
            farmerName: user.name,
            available: formData.status === 'Available'
          }),
        });
      } else {
        // Create new product
        response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            images: imageUrls,
            sellerId: user.id,
            sellerName: user.name,
            farmerId: user.id,
            farmerName: user.name,
            available: formData.status === 'Available',
            rating: 0,
            reviews: 0
          }),
        });
      }

      if (!response.ok) throw new Error('Failed to save product');
      const savedProduct = await response.json();

      // Update product list dynamically
      setUserProducts(prev => {
        if (editingProductId) {
          return prev.map(p => p.id === editingProductId ? savedProduct : p);
        }
        return [...prev, savedProduct];
      });

      toast.success(editingProductId ? 'Product updated!' : 'Product listed!');
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Failed to list product');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      quantity: product.quantity,
      unit: product.unit,
      status: product.status,
    });
    setImagePreviews(product.images);
    setImages([]); // Will upload new images if changed
    setEditingProductId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setUserProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete product');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Products</h1>

          {fetchingProducts ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          ) : userProducts.length === 0 ? (
            <p className="text-gray-600 mb-8">You haven't listed any products yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {userProducts.map(product => (
                <div key={product.id} className="bg-white border border-gray-200 flex flex-col relative">
                  <div className="relative h-48 w-full">
                    <Image src={product.images[0] || '/placeholder-product.jpg'} alt={product.name} fill className="object-cover"/>
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{product.category}</p>
                    <p className="text-gray-900 font-semibold mt-2">${product.price}/{product.unit}</p>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{product.description}</p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button onClick={() => handleEdit(product)} className="bg-blue-500 text-white p-1 rounded hover:bg-blue-600">
                      <Edit className="w-4 h-4"/>
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="bg-red-500 text-white p-1 rounded hover:bg-red-600">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-900 mb-4">{editingProductId ? 'Edit Product' : 'List a New Product'}</h2>

          {!user.idVerified && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
              <div>
                <p className="text-yellow-700 font-medium">Verification Required</p>
                <p className="text-yellow-600 text-sm mt-1">
                  You need to verify your ID before listing products.
                  <button onClick={() => router.push('/profile')} className="ml-2 underline hover:text-yellow-800">Verify now</button>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-8 rounded-2xl shadow-lg space-y-6">
            {/* Product Name */}
            <div>
              <label className="text-gray-700 block mb-2 font-medium">Product Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter product name"
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"/>
            </div>

            {/* Description */}
            <div>
              <label className="text-gray-700 block mb-2 font-medium">Description</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} placeholder="Describe your product"
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"/>
            </div>

            {/* Price, Quantity, Unit, Category, Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="Price" min={0}
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"/>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="Quantity" min={0}
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"/>
              <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="Unit (kg, piece)"
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"/>
              <select name="category" value={formData.category} onChange={handleInputChange}
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Select Category</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="dairy">Dairy</option>
                <option value="grains">Grains</option>
                <option value="herbs">Herbs</option>
                <option value="meat">Meat</option>
                <option value="condiments">Condiments</option>
              </select>
              <select name="status" value={formData.status} onChange={handleInputChange}
                className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="Available">Available</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Restocked">Restocked</option>
                <option value="Limited">Limited</option>
                <option value="Coming Soon">Coming Soon</option>
                <option value="Discontinued">Discontinued</option>
              </select>
            </div>

            {/* Images */}
            <div>
              <label className="text-gray-700 block mb-2 font-medium">Product Images</label>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden"/>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {imagePreviews.map((img, idx) => (
                  <div key={idx} className="relative group rounded-lg border border-gray-300 overflow-hidden">
                    <img src={img} className="w-full h-32 object-cover group-hover:scale-105 transition-transform"/>
                    <button type="button" onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                      <X className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 5 && (
                  <motion.button type="button" onClick={() => fileInputRef.current?.click()} 
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Upload className="w-8 h-8 mb-2"/>
                    Add Image
                  </motion.button>
                )}
              </div>
              <p className="text-gray-500 text-sm">Upload up to 5 images. First image will be main display.</p>
            </div>

            {/* Buttons */}
            <div className="flex justify-between pt-6">
              <button type="button" onClick={resetForm} className="px-6 py-3 text-gray-600 hover:text-gray-900">Cancel</button>
              <button type="submit" disabled={loading || uploading || !user.idVerified} 
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2">
                {uploading ? 'Uploading...' : loading ? 'Saving...' : editingProductId ? 'Update Product' : 'List Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
