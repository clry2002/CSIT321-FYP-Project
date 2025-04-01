'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use Next.js router for navigation

export default function PublisherPage() {
  const router = useRouter(); // Initialize Next.js router

  // State for published books and videos
  const [books, setBooks] = useState([
    { id: 1, title: 'Book Title 1', author: 'Author 1', genre: 'Fiction' },
    { id: 2, title: 'Book Title 2', author: 'Author 2', genre: 'Science' },
    { id: 3, title: 'Book Title 3', author: 'Author 3', genre: 'Fiction' },
  ]);

  const [videos, setVideos] = useState([
    { id: 1, title: 'Video Title 1', duration: '10 min', genre: 'Educational' },
    { id: 2, title: 'Video Title 2', duration: '20 min', genre: 'Entertainment' },
    { id: 3, title: 'Video Title 3', duration: '15 min', genre: 'Educational' },
  ]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 px-6 py-5">
        <h1 className="text-2xl font-serif text-black">Welcome, Publisher!</h1>
        <div className="flex space-x-3">
          <button
            className="bg-gray-900 text-white px-4 py-2 rounded-lg"
            onClick={() => console.log('Open Settings')}
          >
            Settings
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded-lg"
            onClick={() => router.push('/logout')} // Navigate to the logout page
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 space-y-5">
        {/* Top Genres Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Book Genres */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Top Book Genres</h2>
            <ul className="list-disc list-inside text-gray-600 text-sm">
              <li>Genre 1: 5 books</li>
              <li>Genre 2: 3 books</li>
              <li>Genre 3: 2 books</li>
            </ul>
          </div>

          {/* Top Video Genres */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Top Video Genres</h2>
            <ul className="list-disc list-inside text-gray-600 text-sm">
              <li>Genre A: 4 videos</li>
              <li>Genre B: 3 videos</li>
              <li>Genre C: 1 video</li>
            </ul>
          </div>
        </div>

        {/* Books Analytics Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Books Analytics</h2>
          <p className="text-gray-600 text-sm mb-3">
            Track performance metrics and trends for your published books.
          </p>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full"
            onClick={() => router.push('/books-analytics')} // Navigate to Books Analytics page
          >
            View Books Analytics
          </button>
        </div>

        {/* Videos Analytics Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Videos Analytics</h2>
          <p className="text-gray-600 text-sm mb-3">
            Monitor views, engagement, and trends for your published videos.
          </p>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full"
            onClick={() => router.push('/videos-analytics')} // Navigate to Videos Analytics page
          >
            View Videos Analytics
          </button>
        </div>

        {/* Published Books Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Published Books</h2>
          <table className="table-auto w-full text-left text-gray-600 text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">Title</th>
                <th className="px-4 py-2 border">Author</th>
                <th className="px-4 py-2 border">Genre</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{book.id}</td>
                  <td className="px-4 py-2 border">{book.title}</td>
                  <td className="px-4 py-2 border">{book.author}</td>
                  <td className="px-4 py-2 border">{book.genre}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-lg w-full"
            onClick={() => console.log('+ Add Book')}
          >
            + Add Book
          </button>
        </div>

        {/* Published Videos Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Published Videos</h2>
          <table className="table-auto w-full text-left text-gray-600 text-sm mb-3 border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">Title</th>
                <th className="px-4 py-2 border">Duration</th>
                <th className="px-4 py-2 border">Genre</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{video.id}</td>
                  <td className="px-4 py-2 border">{video.title}</td>
                  <td className="px-4 py-2 border">{video.duration}</td>
                  <td className="px-4 py-2 border">{video.genre}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg w-full"
            onClick={() => console.log('+ Add Video')}
          >
            + Add Video
          </button>
        </div>
      </div>
    </div>
  );
}
