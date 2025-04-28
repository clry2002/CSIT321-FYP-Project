'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/space1.jpg"
          alt="Background Space"
          fill
          className="object-cover"
          priority
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black opacity-50"></div>
      </div>

      {/* Page Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center p-4 bg-white/90 shadow-md">
          <Link href="/">
            <h1 className="text-2xl font-bold text-gray-800 cursor-pointer">
              CoReadability
            </h1>
          </Link>
          <div className="space-x-4">
          <Link href="/marketingsite" passHref>
            <button className=" px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
            Back
            </button>
          </Link>
            <Link href="/">
              <button className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition">
                Home
              </button>
            </Link>
            <Link href="/auth/signup">
              <button className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition">
                Sign Up
              </button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-col items-center justify-center flex-1 text-center p-6 text-white">
          <h2 className="text-5xl font-extrabold mb-6">About Us</h2>

          {/* Logo */}
          <div className="bg-white rounded-full p-4 shadow-lg mb-8">
            <Image
              src="/logo2.png"
              alt="CoReadability Logo"
              width={180}
              height={180}
              className="rounded-full"
            />
          </div>

          {/* About Text */}
          <div className="max-w-3xl mx-auto">
            <p className="text-lg mb-6">
              Welcome to <span className="font-semibold text-white">CoReadability</span>, where learning meets fun! 
              Our mission is to provide kids with personalized book and video recommendations that spark curiosity and creativity.
            </p>
            <p className="text-lg mb-6">
              We believe every child is unique, and our chatbot helps young learners explore exciting stories and educational content 
              tailored just for them. Whether it&apos:s finding the perfect adventure novel or an engaging science video, we&apos;re here to make 
              discovery effortless and enjoyable.
            </p>
            <p className="text-lg mb-6">
              Thank you for trusting us to inspire the next generation of readers, thinkers, and dreamers. Let&apos;s make learning an unforgettable journey!
            </p>

            {/* CTA Button */}
            <Link href="/auth/signup">
              <button className="px-8 py-4 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition mt-6">
                Explore Now
              </button>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 bg-white/90 text-center text-gray-600 mt-8">
          © 2025 CoReadability. Empowering young minds through stories and knowledge.
        </footer>
      </div>
    </div>
  );
}
