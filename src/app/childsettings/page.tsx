'use client';

import Link from 'next/link';
import Navbar from '../components/Navbar';
import { User, MessageSquare, Settings } from 'lucide-react';
import ChatBot from "../components/ChatBot";

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-gradient-to-b from-gray-900 to-indigo-900 overflow-hidden">
      <Navbar />
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-20 px-6 rounded-xl shadow-lg m-4">
        <div className="px-6 py-8">
          <h2 className="text-3xl font-bold text-center text-yellow-400 mb-8"><span role="img" aria-label="gear">⚙️</span>Settings</h2>
          <div className="max-w-md mx-auto space-y-6">
            {/* My Profile */}
            <Link href="/childviewprofile" className="block">
              <div className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl shadow-md hover:shadow-xl transition duration-200 group">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-md bg-indigo-800 transition-transform duration-200 group-hover:scale-110">
                    <User className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-300 group-hover:text-indigo-300 transition-colors duration-200">My Profile <span role="img" aria-label="user icon">👤</span></h3>
                    <p className="text-sm text-gray-500">Select your favourite genres and change your username!</p>
                  </div>
                </div>
              </div>
            </Link>
  
            {/* Account Settings */}
            <Link href="/childaccountsettings" className="block">
              <div className="p-6 bg-gradient-to-r from-blue-900 to-cyan-900 rounded-xl shadow-md hover:shadow-xl transition duration-200 group">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-md bg-cyan-800 transition-transform duration-200 group-hover:scale-110">
                    <Settings className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-300 group-hover:text-cyan-300 transition-colors duration-200">Settings <span role="img" aria-label="lock icon">🔒</span></h3>
                    <p className="text-sm text-gray-500">Change your password!</p>
                  </div>
                </div>
              </div>
            </Link>
  
            {/* View Chat History */}
            <Link href="/chathistory" className="block">
              <div className="p-6 bg-gradient-to-r from-yellow-900 to-orange-900 rounded-xl shadow-md hover:shadow-xl transition duration-200 group">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-md bg-orange-800 transition-transform duration-200 group-hover:scale-110">
                    <MessageSquare className="w-8 h-8 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-300 group-hover:text-orange-300 transition-colors duration-200">Chat History <span role="img" aria-label="chat bubble">💬</span></h3>
                    <p className="text-sm text-gray-500">Look back at our fun chats!</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
  
        <div className="mt-8 px-6">
          <ChatBot />
        </div>
      </div>
    </div>
  );
}