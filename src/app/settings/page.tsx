'use client';

import Link from 'next/link';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import { User } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <Header />
        
        <div className="px-6">
          <h2 className="text-2xl font-serif mb-6 text-black">Settings</h2>
          <div className="max-w-2xl">
            <Link href="/profile" className="block">
              <div className="p-4 border rounded-lg hover:border-rose-200 hover:bg-rose-50 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-5 h-5 text-gray-800" />
                  <h3 className="font-medium text-black">Profile Settings</h3>
                </div>
                <p className="text-sm text-gray-600 ml-7">Manage your profile information and preferences</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 