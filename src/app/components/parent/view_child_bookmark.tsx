'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
//import { ContentWithGenres } from '../fetchChildBookmark';

interface Content {
    cid: number;
    title: string;
    coverimage?: string;
    contenturl?: string;
    credit?: string;
    description?: string;
    cfid: number;
  }
  
interface ContentWithGenres extends Content {
    genres: string[];
  }
interface BookmarkedContentProps {
  books?: ContentWithGenres[];
  videos?: ContentWithGenres[];
  isLoading?: boolean;
}

const ViewChildBookmark: React.FC<BookmarkedContentProps> = ({ 
  books = [], 
  videos = [], 
  isLoading = false 
}) => {
  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Loading bookmarked content...</div>;
  }

  const hasNoContent = books.length === 0 && videos.length === 0;

  if (hasNoContent) {
    return (
      <div className="mt-8 text-center py-12 bg-gray-50 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-600">No Bookmarked Content</h3>
        <p className="text-gray-500 mt-2">No books or videos have been bookmarked yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-6 text-black">Bookmarked Content</h2>
      
      {/* Bookmarked Books */}
      <div className="space-y-6 mb-10">
        <h3 className="text-xl font-semibold text-blue-900 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Books
        </h3>
        
        {books.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {books.map((book) => (
              <div key={book.cid} className="flex items-start space-x-6 p-6 bg-white rounded-lg shadow-md hover:bg-gray-50 transition duration-200">
                <div className="flex-shrink-0 w-32 h-48 relative">
                  {book.coverimage ? (
                    <Image 
                      src={book.coverimage} 
                      alt={book.title} 
                      fill 
                      className="object-cover rounded-md" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-md">
                      <span className="text-gray-400">No cover</span>
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    <Link href={`/bookdetailp/${book.cid}`} className="hover:text-rose-500 transition">
                      {book.title}
                    </Link>
                  </h3>
                  {book.credit && (
                    <p className="text-md text-gray-600 mb-2">By {book.credit}</p>
                  )}
                  {book.description && (
                    <p className="text-gray-700 mb-4 line-clamp-2">{book.description}</p>
                  )}
                  {book.genres && book.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {book.genres.map((genre: string) => (
                        <span key={genre} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 italic">No books bookmarked</div>
        )}
      </div>

      {/* Bookmarked Videos */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-blue-900 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Videos
        </h3>
        
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {videos.map((video) => (
              <div key={video.cid} className="flex items-start space-x-6 p-6 bg-white rounded-lg shadow-md hover:bg-gray-50 transition duration-200">
                <div className="flex-shrink-0" style={{ width: '300px', height: '170px' }}>
                  {video.contenturl ? (
                    <div className="relative" style={{ width: '300px', height: '170px' }}>
                      <iframe
                        className="absolute top-0 left-0 w-full h-full rounded-md"
                        src={`https://www.youtube.com/embed/${extractYoutubeId(video.contenturl)}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-md">
                      <span className="text-gray-400">No video preview</span>
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    <Link href={`/videodetailp/${video.cid}`} className="hover:text-rose-500 transition">
                      {video.title}
                    </Link>
                  </h3>
                  {video.description && (
                    <p className="text-gray-700 mb-4 line-clamp-3">{video.description}</p>
                  )}
                  {video.genres && video.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {video.genres.map((genre: string) => (
                        <span key={genre} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 italic">No videos bookmarked</div>
        )}
      </div>
    </div>
  );
};

// Helper function to extract YouTube video ID from various URL formats
function extractYoutubeId(url?: string): string {
  if (!url) return '';
  
  const regExp = /(?:youtube\.com\/(?:[^/]+\/[^/]+|(?:v|e(?:mbed)?)\/|.*[?&]v=)([\w-]+))|(?:youtu\.be\/([\w-]+))/i;
  const match = url.match(regExp);
  
  return match ? (match[1] || match[2] || '') : '';
}

export default ViewChildBookmark;