'use client';

import Layout from '@/components/layout/Layout';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { AlertCircle, Upload, X, Edit, Trash2 } from 'lucide-react';
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
  available: boolean;
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

    if (images.length === 0 && imagePreviews.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      const imageUrls: string[] = [];

      // If editing and no new images, use existing images
      if (editingProductId && images.length === 0) {
        imageUrls.push(...imagePreviews);
      } else {
        // Upload new images to Cloudinary
        for (const image of images) {
          const form = new FormData();
          form.append('file', image);
          form.append('upload_preset', 'ml_default');

          console.log('Uploading image to Cloudinary...');
          console.log('Cloudinary Cloud Name:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
          
          const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, 
            {
              method: 'POST',
              body: form,
            }
          );

          console.log('Cloudinary response status:', uploadResponse.status);
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Cloudinary upload failed:', errorText);
            throw new Error(`Image upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }

          const data = await uploadResponse.json();
          console.log('Image uploaded successfully:', data.secure_url);
          imageUrls.push(data.secure_url);
        }
      }

      // Determine availability based on status and quantity
      const isAvailable = formData.status === 'Available' && formData.quantity > 0;

      let response;
      if (editingProductId) {
        // Update existing product
        response = await fetch(`/api/products`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProductId,
            name: formData.name,
            description: formData.description,
            price: formData.price,
            category: formData.category,
            quantity: formData.quantity,
            unit: formData.unit,
            images: imageUrls.length > 0 ? imageUrls : imagePreviews,
            available: isAvailable,
            status: formData.status
          }),
        });
      } else {
        // Create new product
        response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            price: formData.price,
            category: formData.category,
            quantity: formData.quantity,
            unit: formData.unit,
            images: imageUrls,
            available: isAvailable,
            status: formData.status,
            rating: 0,
            reviews: 0
          }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save product:', errorText);
        throw new Error(`Failed to save product: ${response.status} ${response.statusText}`);
      }

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
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error(error.message || 'Failed to list product');
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
      status: product.status || (product.available ? 'Available' : 'Out of Stock'),
    });
    setImagePreviews(product.images);
    setImages([]); // Will upload new images if changed
    setEditingProductId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Delete failed:', errorText);
        throw new Error('Delete failed');
      }
      setUserProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete product');
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
                    <p className="text-gray-900 font-semibold mt-2">KSh {product.price}/{product.unit}</p>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{product.description}</p>
                    <span className={`mt-2 px-2 py-1 rounded-full text-xs font-semibold w-fit ${
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

          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a category</option>
                  <option value="vegetables">Vegetables</option>
                  <option value="fruits">Fruits</option>
                  <option value="dairy">Dairy</option>
                  <option value="grains">Grains</option>
                  <option value="herbs">Herbs</option>
                  <option value="meat">Meat</option>
                  <option value="condiments">Condiments</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price (KSh)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="0"
                  required
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  placeholder="e.g., kg, lb, piece"
                  required
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Available">Available</option>
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Restocked">Restocked</option>
                  <option value="Limited">Limited</option>
                  <option value="Coming Soon">Coming Soon</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                required
                className="w-full px-4 py-3 bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Click to upload images</p>
                <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
              </button>

              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <Image src={preview} alt={`Preview ${index + 1}`} width={200} height={200} className="w-full h-32 object-cover rounded"/>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="submit"
                disabled={loading || uploading || !user.idVerified}
                className="px-6 py-3 bg-green-500 text-white font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                {loading ? 'Saving...' : editingProductId ? 'Update Product' : 'List Product'}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-500 text-white font-medium hover:bg-gray-600 transition-colors"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}