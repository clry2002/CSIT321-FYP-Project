'use client';

import Link from 'next/link';
import Navbar from '../components/Navbar';
import { User, MessageSquare, Settings } from 'lucide-react';
import ChatBot from "../components/ChatBot";

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-gradient-to-b from-blue-100 to-purple-100 overflow-hidden">
      <Navbar />
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-20 px-6 bg-white rounded-xl shadow-lg m-4">
        <div className="px-6 py-8">
          <h2 className="text-3xl font-bold text-center text-purple-600 mb-8"><span role="img" aria-label="gear">⚙️</span> Settings</h2>
          <div className="max-w-md mx-auto space-y-6">
            {/* My Profile */}
            <Link href="/childviewprofile" className="block">
              <div className="p-6 bg-gradient-to-r from-pink-100 to-rose-100 border border-pink-200 rounded-xl shadow-sm hover:shadow-md transition duration-200">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-md bg-pink-200 transition-transform duration-200 hover:scale-110">
                    <User className="w-8 h-8 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">My Profile <span role="img" aria-label="user icon">👤</span></h3>
                    <p className="text-sm text-gray-600 mt-1">Select your favourite genres and change your username!</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Account Settings */}
            <Link href="/childaccountsettings" className="block">
              <div className="p-6 bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200 rounded-xl shadow-sm hover:shadow-md transition duration-200">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-md bg-blue-200 transition-transform duration-200 hover:scale-110">
                    <Settings className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Settings <span role="img" aria-label="lock icon">🔒</span></h3>
                    <p className="text-sm text-gray-600 mt-1">Change your password!</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* View Chat History */}
            <Link href="/chathistory" className="block">
              <div className="p-6 bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200 rounded-xl shadow-sm hover:shadow-md transition duration-200">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-md bg-yellow-200 transition-transform duration-200 hover:scale-110">
                    <MessageSquare className="w-8 h-8 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Chat History <span role="img" aria-label="chat bubble">💬</span></h3>
                    <p className="text-sm text-gray-600 mt-1">Look back at our fun chats!</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <ChatBot />
      </div>
    </div>
  );
}