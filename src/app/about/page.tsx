'use client';

import Link from 'next/link';
import Image from 'next/image'; // Import the Image component

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-100 to-indigo-200">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-white shadow-md">
        <Link href="/"> 
          <h1 className="text-2xl font-bold text-gray-800 cursor-pointer">
            CoReadability
          </h1>
        </Link>
        <div className="space-x-4">
          <Link href="/">
            <button className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition">
              Home
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
        <h2 className="text-5xl font-extrabold text-gray-800 mb-6">About Us</h2>
        <Image
          src="/logo2.png"
          alt="CoReadability Logo"
          width={400}  // Logo Size Adjustments
          height={400}
          className="mt-6"
        />
        <p className="text-lg text-gray-700 mb-4 max-w-xl">
          Welcome to <span className="font-semibold text-gray-800">CoReadability</span>, where learning meets fun! Our mission is to provide kids with personalized book and video recommendations that sparks curiosity and creativity.
        </p>
        <p className="text-lg text-gray-700 mb-4 max-w-xl">
          We believe every child is unique, and our chatbot is designed to help young learners explore exciting stories and educational content tailored just for them. Whether it's finding the perfect adventure novel or an engaging science video, we’re here to make discovery effortless and enjoyable.
        </p>
        <p className="text-lg text-gray-700 mb-6 max-w-xl">
          Thank you for trusting us to inspire the next generation of readers, thinkers, and dreamers. Let's make learning an unforgettable journey!
        </p>
        <Link href="/auth/signup">
          <button className="px-6 py-3 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition mt-6">
            Explore Now
          </button>
        </Link>
      </main>

      {/* Footer */}
      <footer className="py-4 bg-white text-center text-gray-600">
        © 2025 CoReadability. Empowering young minds through stories and knowledge.
      </footer>
    </div>
  );
}
