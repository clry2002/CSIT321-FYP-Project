'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-4xl text-black font-bold mb-4">Welcome to CoReadability!</h1>
      <p className="text-lg text-gray-600 mb-6">Discover amazing books and videos for kids!</p>
      <div className="space-x-4">
        <Link href="/auth/login">
          <button className="px-6 py-3 bg-blue-500 text-white rounded-lg">Sign In</button>
        </Link>
        <Link href="/auth/signup">
          <button className="px-6 py-3 bg-green-500 text-white rounded-lg">Sign Up</button>
        </Link>
      </div>
    </div>
  );
}
