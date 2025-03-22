'use client';

import Image from 'next/image';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import BookCard from '../components/BookCard';
import Calendar from '../components/Calendar';
import ChatBot from '../components/ChatBot';
import { useBooks } from '../../hooks/useBooks';
import { useVideos } from '../../hooks/useVideos';
import { useCalendar } from '../../hooks/useCalendar';
import { useSession } from '@/contexts/SessionContext';

export default function Home() {
  const { popularBooks } = useBooks();
  const { videos } = useVideos();
  const { calendarDays, currentMonth } = useCalendar();
  const { userProfile, loading } = useSession();

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <Navbar/>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <Header />
        <div className="px-6">
          {/* Main Grid */}
          <div className="grid grid-cols-2 gap-5">
            {/* Left Column */}
            <div className="space-y-5">
              {/* Happy Reading Section */}
              <div>
                <h1 className="text-2xl font-serif mb-1.5 text-black">
                  Happy reading,<br />
                  {loading ? '...' : userProfile?.full_name.split(' ')[0]}
                </h1>
                <p className="text-gray-800 mb-2 text-xs">
                  {userProfile?.favorite_genres?.length ? 
                    `Time to dive into some ${userProfile.favorite_genres.join(', ')}! Ready to discover your next favorite book?` :
                    'Ready to discover your next favorite book?'
                  }
                </p>
                <button className="bg-gray-900 text-white px-4 py-1.5 rounded-lg inline-flex items-center text-xs">
                  Start reading
                  <span className="ml-1.5">↗</span>
                </button>
              </div>

              {/* Popular Books Now Section */}
              <div>
                <h2 className="text-lg font-serif mb-3 text-black">Popular Books Now</h2>
                <div className="grid grid-cols-4 gap-2">
                  {popularBooks.map((book, index) => (
                    <BookCard key={index} {...book} />
                  ))}
                </div>
              </div>

              {/* Videos for You Section */}
              <div>
                <h2 className="text-lg font-serif mb-3 text-black">Videos for You</h2>
                <div className="grid grid-cols-4 gap-2">
                  {loading ? (
                    // Loading skeleton
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="space-y-1">
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200 animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                      </div>
                    ))
                  ) : videos.length > 0 ? (
                    videos.map((video) => {
                      const videoId = video.link.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                      
                      return (
                        <div key={video.title} className="border rounded-lg overflow-hidden">
                          <div className="aspect-video relative">
                            {videoId ? (
                              <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                                <p className="text-gray-500">Invalid video link</p>
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <h3 className="font-medium text-xs text-black leading-tight">{video.title}</h3>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-4 text-center text-gray-500 py-4">
                      No videos available at the moment
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Schedule Reading Section */}
              <div className="mb-5">
                <h2 className="text-lg font-serif mb-3 text-black">Schedule Reading</h2>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <Calendar currentMonth={currentMonth} days={calendarDays} />
                </div>
              </div>

              {/* Book Recommendation ChatBot */}
              <div>
                <ChatBot />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
