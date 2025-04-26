'use client';

import Link from 'next/link';
import Image from 'next/image'; // Import Image component, for Logo Use

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-100 to-green-100">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-white shadow-md">
        <div className="flex items-center">
          {/* Logo */}
          <Image
            src="/logo2.png" // Logo Path
            alt="CoReadability Logo"
            width={40} // Logo Size Adjustments
            height={40} 
            className="mr-2"
          />
          <h1 className="text-2xl font-bold text-gray-800">CoReadability</h1>
        </div>
        <div className="space-x-4">
          <Link href="/auth/login">
            <button className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition">
              Sign In
            </button>
          </Link>
          <Link href="/auth/signup">
            <button className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition">
              Sign Up
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 text-center p-6">
        <h2 className="text-5xl font-extrabold text-gray-800 mb-4">Welcome to CoReadability!</h2>
        <p className="text-xl text-gray-700 mb-6">
          An ultimate recommendation chatbot for kids!
        </p>
        <div className="flex flex-col space-y-4">
          <Link href="/auth/signup">
            <button className="px-6 py-3 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition">
              Explore Now
            </button>
          </Link>
          <Link href="/about">
            <button className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition">
              About Us
            </button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 bg-white text-center text-gray-600">
        © 2025 CoReadability. All rights reserved.
      </footer>
    </div>
  );
}
