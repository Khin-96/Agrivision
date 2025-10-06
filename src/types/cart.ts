// src/types/cart.ts
export interface CartItem {
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
  cartQuantity: number;
  image: string; // Required field for the Cart component
}