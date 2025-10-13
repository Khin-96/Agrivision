'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} AgriVision. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="text-sm text-gray-500 hover:text-gray-900">
                About
              </Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
