'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Settings, ArrowLeft } from 'lucide-react';

export default function PublisherSettings() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 py-10 px-6 shadow-xl overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Settings
            </h1>
            <p className="mt-1 text-md text-gray-500">Manage your account and profile settings.</p>
          </div>
          <button
            onClick={() => router.push('/publisherpage')}
            className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md font-semibold text-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-opacity-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/publisher/viewprofile">
              <div className="p-6 border rounded-lg shadow hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer">
                <div className="flex items-center space-x-3">
                  <User className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
                </div>
                <p className="text-sm text-gray-600 ml-9 mt-2">View and edit your profile information</p>
              </div>
            </Link>
            
            <Link href="/publisher/accountsettings">
              <div className="p-6 border rounded-lg shadow hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Settings className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
                </div>
                <p className="text-sm text-gray-600 ml-9 mt-2">Manage your account preferences and security</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
