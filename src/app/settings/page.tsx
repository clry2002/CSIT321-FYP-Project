'use client';

import Link from 'next/link';
<<<<<<< HEAD
import { Home as HomeIcon, BookOpen, Settings, PlayCircle, Search } from 'lucide-react';
=======
import { Home as HomeIcon, BookOpen, Settings, PlayCircle, Search, User } from 'lucide-react';
>>>>>>> fbdb6d5 (webpage v1.1)
import Header from '../components/Header';

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
        <div className="text-xl">✋</div>
        <nav className="flex flex-col space-y-3">
          <Link href="/home" className="p-2.5 rounded-lg hover:bg-gray-100">
            <HomeIcon className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/search" className="p-2.5 rounded-lg hover:bg-gray-100">
            <Search className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/books" className="p-2.5 rounded-lg hover:bg-gray-100">
            <BookOpen className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/videos" className="p-2.5 rounded-lg hover:bg-gray-100">
            <PlayCircle className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/settings" className="p-2.5 rounded-lg bg-rose-100">
            <Settings className="w-5 h-5 text-rose-500" />
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <Header />
        
        <div className="px-6">
          <h2 className="text-2xl font-serif mb-6 text-black">Settings</h2>
<<<<<<< HEAD
          <div className="max-w-2xl space-y-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Profile Settings</h3>
              <p className="text-sm text-gray-600">Manage your profile information and preferences</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Account Settings</h3>
              <p className="text-sm text-gray-600">Update your account settings and security preferences</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Notification Settings</h3>
              <p className="text-sm text-gray-600">Configure your notification preferences</p>
            </div>
=======
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
>>>>>>> fbdb6d5 (webpage v1.1)
          </div>
        </div>
      </div>
    </div>
  );
} 