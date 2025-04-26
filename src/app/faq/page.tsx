'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function FAQPage() {
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
          <div className="flex items-center">
            <Image
              src="/logo2.png"
              alt="CoReadability Logo"
              width={40}
              height={40}
              className="mr-2"
            />
            <Link href="/">
              <h1 className="text-2xl font-bold text-gray-800 cursor-pointer">
                CoReadability
              </h1>
            </Link>
          </div>
          <div className="space-x-4">
            <Link href="/">
              <button className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition">
                Home
              </button>
            </Link>
            <Link href="/auth/signup">
              <button className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-green-600 transition">
                Sign Up
              </button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-col items-center flex-1 text-left px-6 py-12 text-white">
          <h2 className="text-5xl font-extrabold text-center mb-12">Frequently Asked Questions</h2>

          <section className="max-w-4xl w-full mb-12">
            <h3 className="text-3xl font-semibold text-green-700 mb-4">🧒 General</h3>
            <div className="space-y-6 text-lg">
              <div>
                <h4 className="font-semibold text-xl text-gray-200">What is CoReadability?</h4>
                <p>CoReadability is a personalized platform for kids that recommends age-appropriate books and videos using smart AI.</p>
              </div>
              <div>
                <h4 className="font-semibold text-xl text-gray-200">Who can use this platform?</h4>
                <p>Our platform is designed for kids, but we support parents, teachers, and publishers who help guide young learners.</p>
              </div>
            </div>
          </section>

          <section className="max-w-4xl w-full mb-12">
            <h3 className="text-3xl font-semibold text-green-700 mb-4">👨‍👩‍👧 For Parents</h3>
            <div className="space-y-6 text-lg">
              <div>
                <h4 className="font-semibold text-xl text-gray-200">Is CoReadability safe for my child?</h4>
                <p>Yes! We use filters and parental settings to ensure all content is safe, kid-friendly, and educational.</p>
              </div>
              <div>
                <h4 className="font-semibold text-xl text-gray-200">Can I manage or monitor my child’s activity?</h4>
                <p>Absolutely. You can track reading/viewing history and adjust preferences through the Parent Dashboard.</p>
              </div>
            </div>
          </section>

          <section className="max-w-4xl w-full mb-12">
            <h3 className="text-3xl font-semibold text-green-700 mb-4">🎓 For Educators</h3>
            <div className="space-y-6 text-lg">
              <div>
                <h4 className="font-semibold text-xl text-gray-200">Can I use CoReadability in the classroom?</h4>
                <p>Yes! Our platform helps you recommend curated learning content that fits your lessons and student needs.</p>
              </div>
              <div>
                <h4 className="font-semibold text-xl text-gray-200">Do you support class groups or dashboards?</h4>
                <p>We're developing educator tools so you can track student activity and assign content to groups.</p>
              </div>
            </div>
          </section>

          <section className="max-w-4xl w-full mb-12">
            <h3 className="text-3xl font-semibold text-green-700 mb-4">🏢 For Publishers</h3>
            <div className="space-y-6 text-lg">
              <div>
                <h4 className="font-semibold text-xl text-gray-200">How can we get our content featured?</h4>
                <p>You can apply to submit your titles for review and potential inclusion.</p>
              </div>
              <div>
                <h4 className="font-semibold text-xl text-gray-200">Is there a vetting process?</h4>
                <p>Yes. We carefully review submissions to ensure they align with our values: safety, diversity, and educational value.</p>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="py-4 bg-white/90 text-center text-gray-600">
          © 2025 CoReadability. Empowering young minds through stories and knowledge.
        </footer>
      </div>
    </div>
  );
}
