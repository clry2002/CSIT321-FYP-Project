'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface StyleObject {
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundRepeat?: string;
}

interface Star {
  top: number;
  left: number;
  size: number;
  delay: number;
}

interface Book {
  cid: string;
  title: string;
  coverimage: string;
}

export default function LandingPage() {
  const [stars, setStars] = useState<Star[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const mainContentRef = useRef<HTMLElement>(null);
  // const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const backgroundStyle: StyleObject = {
    backgroundImage: 'url("/spacemovement.gif")',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  };

  useEffect(() => {
    const newStars = Array.from({ length: 70 }).map(() => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 8 + 4,
      delay: Math.random() * 5,
    }));
    setStars(newStars);

    // Initial slide-in animation
    if (mainContentRef.current) {
      setTimeout(() => {
        if (mainContentRef.current) {
          mainContentRef.current.classList.add('animate-slide-in');
        }
      }, 100); // Small delay to ensure ref is attached
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (mainContentRef.current && !isTransitioning) {
        setIsTransitioning(true);
        mainContentRef.current.classList.remove('animate-slide-in');
        mainContentRef.current.classList.add('animate-slide-out');
        const animationDuration = parseFloat(getComputedStyle(mainContentRef.current).animationDuration) * 1000;
        setTimeout(() => {
          setIsTransitioning(false);
        }, animationDuration);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isTransitioning]);

  useEffect(() => {
    const fetchBooks = async () => {
      const { data, error } = await supabase
        .from('temp_content')
        .select('cid, title, coverimage')
        .eq('cfid', 2); // cfid 2 = books

      if (error) {
        console.error('Error fetching books:', error.message);
        return;
      }

      const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 10);

      const booksWithUrls = shuffled.map((book) => {
        let coverImageUrl = book.coverimage;
        if (!book.coverimage.startsWith('http')) {
          const { data: imageData } = supabase.storage
            .from('book-covers') // Ensure this matches your bucket name
            .getPublicUrl(book.coverimage);
          coverImageUrl = imageData?.publicUrl || '/placeholder-book.png';
        }
        return { ...book, coverimage: coverImageUrl };
      });
      setBooks(booksWithUrls);
    };

    fetchBooks();
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ ...backgroundStyle }}>
      {/* Background stars */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {stars.map((star, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-yellow-300 animate-twinkle"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size * 1}px`,
              height: `${star.size * 1}px`,
              animationDelay: `${star.delay}s`,
              opacity: 0.9,
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-white shadow-md relative z-10">
        <div className="flex items-center">
          <Image src="/logo2.png" alt="CoReadability Logo" width={70} height={70} className="mr-3" />
          <h1 className="text-3xl font-bold text-purple-700">CoReadability</h1>
        </div>
        <div className="space-x-2">
          <Link href="/auth/login">
            <button className="px-4 py-2 text-orange-500 border border-orange-500 rounded-full hover:bg-orange-100 transition">
              Log In
            </button>
          </Link>
          <Link href="/auth/signup">
            <button className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition">
              Sign Up
            </button>
          </Link>
          <Link href="/marketingsite">
            <button className="px-4 py-2 text-blue-500 border border-blue-500 rounded-full hover:bg-blue-100 transition">
              Why us?
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main ref={mainContentRef} className="flex flex-col items-center justify-center flex-1 text-center p-8 relative z-10">
        <div className="bg-black/40 backdrop-blur-md rounded-3xl shadow-xl p-10 max-w-3xl w-full">
          <div className="relative">
            <h2 className="text-5xl font-extrabold text-teal-200 mb-6">Dive into a World of Stories!</h2>
          </div>
          <p className="text-xl text-grey-600 mb-8">
            Your friendly guide to finding the perfect books for every adventure! 🐸📚✨
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/auth/signup">
              <button className="bg-blue-500 text-white font-semibold rounded-full py-3 px-6 hover:bg-blue-600 transition">
                <Image src="/mascot.png" alt="Games" width={24} height={24} className="inline mr-2" />
                Explore Now
              </button>
            </Link>
          </div>

          {/* Book Showcase */}
          <div className="w-full max-w-6xl overflow-hidden mt-10">
            <h3 className="text-2xl font-bold text-teal-200 mb-4">Today&apos;s Book Picks</h3>
            <div className="scroll-container">
              <div className="scroll-content">
                {books.concat(books).map((book, index) => (
                  <Link key={`${book.cid}-${index}`} href={`/bookdetail/${book.cid}`}>
                    <div className="min-w-[160px] mx-2 bg-white rounded-lg shadow hover:shadow-lg transition">
                      <Image
                        src={book.coverimage}
                        alt={book.title}
                        width={160}
                        height={220}
                        className="w-full h-[220px] object-cover rounded-t-lg"
                      />
                      <div className="p-2 text-center text-sm font-semibold text-gray-800">
                        {book.title}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-200 p-4 relative z-10">
        © 2025 CoReadability. All rights reserved.
      </footer>

      {/* Scrolling Animation Style */}
      <style jsx>{`
        .scroll-container {
          overflow: hidden;
        }
        .scroll-content {
          display: flex;
          animation: scroll 30s linear infinite;
        }
        .scroll-container:hover .scroll-content {
          animation-play-state: paused;
        }
        @keyframes scroll {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      {/* Star and Slide Animations */}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.4);
          }
        }
        .animate-twinkle {
          animation: twinkle 3s infinite ease-in-out;
        }

        @keyframes slide-in {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out forwards;
        }

        @keyframes slide-out {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(100px);
            opacity: 0;
          }
        }
        .animate-slide-out {
          animation: slide-out 0.3s ease-in forwards;
        }
      `}</style>
    </div>
  );
}