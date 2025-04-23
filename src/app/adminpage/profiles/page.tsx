'use client';

import { useRouter } from 'next/navigation';
import ProfilesPage from '../profilespage';
import Image from 'next/image';

export default function ProfilesRoute() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => router.push('/adminpage')}>
            <Image
              src="/logo2.png"
              alt="Logo"
              width={40}
              height={40}
              className="mr-2"
            />
            <h1 className="text-2xl font-bold">User Profiles</h1>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => router.push('/adminpage')}
              className="text-sm text-gray-400 hover:text-white font-medium mr-12 rounded-full px-4 py-2 hover:bg-gray-800"
            >
              Back to Home
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <ProfilesPage />
      </main>
    </div>
  );
} 