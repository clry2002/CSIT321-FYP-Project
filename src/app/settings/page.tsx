'use client';

import Link from 'next/link';
import Navbar from '../components/Navbar';
// import Header from '../components/Header'; // Do we need the header? Removed Temporarily
import { User, MessageSquare } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Navbar />
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-21 px-6 bg-white">
        {/* Increased `pt-16` to `pt-21` for better spacing */}
        {/* <Header /> */}
        
        <div className="px-6">
          <h2 className="text-3xl font-serif mb-6 text-gray-900">Settings</h2>
          <div className="max-w-2xl space-y-4 flex justify-between">
            <Link href="/profile" className="w-1/2">
              <div className="p-6 border rounded-lg shadow hover:border-rose-300 hover:bg-rose-50 transition">
                <div className="flex items-center space-x-3">
                  <User className="w-6 h-6 text-gray-900" />
                  <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
                </div>
                <p className="text-sm text-gray-700 ml-9 mt-2">Manage your profile information and preferences</p>
              </div>
            </Link>
            
            {/* View Chat History */}
            <Link href="/chathistory" className="w-1/2 ml-4">
              <div className="p-6 border rounded-lg shadow hover:border-blue-300 hover:bg-blue-50 transition">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-6 h-6 text-gray-900" />
                  <h3 className="text-lg font-semibold text-gray-900">View Chat History</h3>
                </div>
                <p className="text-sm text-gray-700 ml-9 mt-2">Review your past conversations and interactions with your Chatbot</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
