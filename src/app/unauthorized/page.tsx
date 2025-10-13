// app/unauthorized/page.tsx
'use client';

import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Unauthorized Access</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page. Please contact support if you believe this is an error.
          </p>
          <Link
            href="/market"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Return to Marketplace
          </Link>
        </div>
      </div>
    </Layout>
  );
}