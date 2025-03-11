'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search, Home as HomeIcon, BookOpen, Settings, PlayCircle } from 'lucide-react';
import Header from '../components/Header';
import { useVideos } from '@/hooks/useVideos';

export default function VideosPage() {
  const { videos } = useVideos();

  const handleSearch = (query: string) => {
    // Add search logic here
  };

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
          <Link href="/videos" className="p-2.5 rounded-lg bg-rose-100">
            <PlayCircle className="w-5 h-5 text-rose-500" />
          </Link>
          <Link href="/settings" className="p-2.5 rounded-lg hover:bg-gray-100">
            <Settings className="w-5 h-5 text-gray-800" />
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <Header 
          showSearch 
          searchPlaceholder="Search liked videos..."
          onSearch={handleSearch}
        />
        
        <div className="px-6">
          <h2 className="text-2xl font-serif mb-6 text-black">Liked Videos</h2>
          {videos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No liked videos yet. Videos you like will appear here!
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((video, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
                        <div className="w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-gray-800 ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-medium text-sm text-black">{video.title}</h3>
                  <p className="text-xs text-gray-600">{video.views} views • {video.timeAgo}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 