'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface VideoData {
  cid: number;
  title: string;
  viewCount: number | null;
}

const VideoAnalytics: React.FC = () => {
  const router = useRouter();
  const [videoMetrics, setVideoMetrics] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uaidPublisher, setUaidPublisher] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.error('Error fetching user or user is not logged in:', userError);
        return;
      }

      const user = userData.user;

      const { data: userAccountData, error: userAccountError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (userAccountError) {
        console.error('Error fetching user account data:', userAccountError);
        return;
      }

      setUaidPublisher(userAccountData?.id || null);
      setLoading(false);
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchVideoAnalytics = async () => {
      if (!uaidPublisher) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('temp_content')
          .select('cid, title, viewCount')
          .eq('uaid_publisher', uaidPublisher)
          .eq('cfid', 1); // Filter for videos

        if (error) {
          console.error('Error fetching video analytics:', error);
          return;
        }

        setVideoMetrics(data as VideoData[]);
      } catch (error) {
        console.error('An error occurred while fetching video analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!loading) {
      fetchVideoAnalytics();
    }
  }, [uaidPublisher, loading]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        <div className="flex justify-between items-center mb-6 px-6 py-5">
          <h1 className="text-2xl font-serif text-black">Video Analytics</h1>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            onClick={() => router.push('/publisherpage')}
          >
            Back to Publisher Dashboard
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-gray-700">Loading video analytics...</p>
        </div>
      </div>
    );
  }

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
          <h2 className="text-lg font-serif mb-3 text-black">Published Videos</h2>
          <table className="table-auto w-full text-left text-gray-600 text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Title</th>
                <th className="px-4 py-2 border">Views</th>
              </tr>
            </thead>
            <tbody>
              {videoMetrics.length > 0 ? (
                videoMetrics.map((video, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{video.title}</td>
                    <td className="px-4 py-2 border">{video.viewCount !== null ? video.viewCount : 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="text-center py-4">No videos published yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VideoAnalytics;