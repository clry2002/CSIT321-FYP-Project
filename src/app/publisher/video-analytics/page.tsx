'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface VideoData {
  title: string;
  duration: string;
  views: number;
  rating: number;
}

const initialVideoMetrics: VideoData[] = [
  { title: 'Video A', duration: '10 min', views: 2000, rating: 4.5 },
  { title: 'Video B', duration: '20 min', views: 3000, rating: 4.8 },
  { title: 'Video C', duration: '15 min', views: 1000, rating: 4.0 },
];

const VideoAnalytics: React.FC = () => {
  const router = useRouter();
  const [videoMetrics] = useState(initialVideoMetrics);

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6 px-6 py-5">
        <h1 className="text-2xl font-serif text-black">Video Analytics</h1>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          onClick={() => router.push('/publisherpage')}
        >
          Back to Publisher Dashboard
        </button>
      </div>

      {/* Analytics Table */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-serif mb-3 text-black">Performance Metrics</h2>
          <table className="table-auto w-full text-left text-gray-600 text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Title</th>
                <th className="px-4 py-2 border">Duration</th>
                <th className="px-4 py-2 border">Views</th>
                <th className="px-4 py-2 border">Rating</th>
              </tr>
            </thead>
            <tbody>
              {videoMetrics.map((video, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{video.title}</td>
                  <td className="px-4 py-2 border">{video.duration}</td>
                  <td className="px-4 py-2 border">{video.views}</td>
                  <td className="px-4 py-2 border">{video.rating.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VideoAnalytics;
