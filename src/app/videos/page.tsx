'use client';


import Image from 'next/image';
import Navbar from '../components/Navbar';

// import Header from '../components/Header'; // TO REMOVE THIS LINE AND THE HEADER SECTION IF DONT NEED

import { useVideos } from '@/hooks/useVideos';
import ChatBot from "../components/ChatBot";

export default function VideosPage() {
  const { videos } = useVideos();

  const handleSearch = (query: string) => {
    // Add search logic here
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pt-16 px-6">

        {/* <Header 
          showSearch 
          searchPlaceholder="Search liked videos..."
          onSearch={handleSearch}
        /> */}
        
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
        <ChatBot />
      </div>
    </div>
  );
} 