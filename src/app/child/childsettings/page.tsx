'use client';

import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { User, MessageSquare, Settings } from 'lucide-react';
import ChatBot from "@/app/components/ChatBot";

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-screen relative">
      <div
        className="absolute inset-0 bg-repeat bg-center z-[-1]"
        style={{ backgroundImage: 'url(/stars.png)' }}
      />
      <Navbar />
      {/* Main Content (Directly containing buttons) */}
      <div className="flex flex-col items-center pt-20 px-6 space-y-6 m-4">
        <h2 className="text-3xl font-bold text-center text-yellow-400 mb-8"><span role="img" aria-label="gear">⚙️</span>Settings</h2>
        <Link href="/child/childviewprofile" className="block max-w-md w-full">
          <div className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl shadow-md hover:shadow-xl transition duration-200 group flex items-center space-x-4">
            <div className="p-2 rounded-md bg-indigo-800 transition-transform duration-200 group-hover:scale-110">
              <User className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-300 group-hover:text-indigo-300 transition-colors duration-200">My Profile <span role="img" aria-label="user icon">👤</span></h3>
              <p className="text-sm text-gray-500">Select your favourite genres and change your username!</p>
            </div>
          </div>
        </Link>

        <Link href="/child/childaccountsettings" className="block max-w-md w-full">
          <div className="p-6 bg-gradient-to-r from-blue-900 to-cyan-900 rounded-xl shadow-md hover:shadow-xl transition duration-200 group flex items-center space-x-4">
            <div className="p-2 rounded-md bg-cyan-800 transition-transform duration-200 group-hover:scale-110">
              <Settings className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-300 group-hover:text-cyan-300 transition-colors duration-200">Settings <span role="img" aria-label="lock icon">🔒</span></h3>
              <p className="text-sm text-gray-500">Change your password!</p>
            </div>
          </div>
        </Link>

        <Link href="/chathistory" className="block max-w-md w-full">
          <div className="p-6 bg-gradient-to-r from-yellow-900 to-orange-900 rounded-xl shadow-md hover:shadow-xl transition duration-200 group flex items-center space-x-4">
            <div className="p-2 rounded-md bg-orange-800 transition-transform duration-200 group-hover:scale-110">
              <MessageSquare className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-300 group-hover:text-orange-300 transition-colors duration-200">Chat History <span role="img" aria-label="chat bubble">💬</span></h3>
              <p className="text-sm text-gray-500">Look back at our fun chats!</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-8 px-6 relative">
        <ChatBot />
      </div>
    </div>
  );
}