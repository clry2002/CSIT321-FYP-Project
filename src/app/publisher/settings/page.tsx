'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Settings } from 'lucide-react';

export default function PublisherSettings() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.push('/publisherpage')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg 
            className="w-5 h-5 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 19l-7-7 7-7" 
            />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold mb-6 text-black">Settings</h1>
        
        <div className="flex gap-4">
          <Link href="/publisher/viewprofile" className="w-1/2">
            <div className="p-6 border rounded-lg shadow hover:border-rose-300 hover:bg-rose-50 transition">
              <div className="flex items-center space-x-3">
                <User className="w-6 h-6 text-gray-900" />
                <h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
              </div>
              <p className="text-sm text-gray-700 ml-9 mt-2">View and edit your profile information</p>
            </div>
          </Link>
          
          <Link href="/publisher/accountsettings" className="w-1/2">
            <div className="p-6 border rounded-lg shadow hover:border-blue-300 hover:bg-blue-50 transition">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-gray-900" />
                <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
              </div>
              <p className="text-sm text-gray-700 ml-9 mt-2">Manage your account preferences</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
