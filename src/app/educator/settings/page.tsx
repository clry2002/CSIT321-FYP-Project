'use client';

import React from 'react';
import Link from 'next/link';
import { User, Settings } from 'lucide-react';
import EduNavbar from '../../components/eduNavbar';

export default function EducatorSettings() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <EduNavbar />
      <div className="pt-28 py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/educator/viewprofile">
                <div className="p-6 border rounded-lg shadow hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <User className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-9 mt-2">View and edit your profile information</p>
                </div>
              </Link>
              
              <Link href="/educator/accountsettings">
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
    </div>
  );
} 