'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ChatHistory from '../../components/child/chathistory/ChatHistory';
import { useSearchParams } from 'next/navigation';

export default function ParentChatHistoryPage() {
  const [childName, setChildName] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const childIdFromUrl = searchParams.get('childId');
    if (childIdFromUrl) {
      setSelectedChildId(childIdFromUrl);
      fetchChildData(childIdFromUrl);
    } else {
      setError('No child ID provided in the URL.');
      setLoading(false);
    }
  }, [searchParams]);

  const fetchChildData = async (childId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('user_account') // Replace 'user_account' with your actual children table name
        .select('fullname')
        .eq('id', childId)
        .single();

      if (error) throw error;
      setChildName(data?.fullname || null);
    } catch (err) {
      console.error('Error fetching child data:', err);
      setError('Failed to load child information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 py-16">
      <div className="container mx-auto max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="bg-indigo-600 text-white py-6 px-8">
          <h1 className="text-2xl font-semibold text-center tracking-wide">
            Chat History
          </h1>
          {childName && (
            <p className="text-2xl text-indigo-100 text-center mt-1">
              for <span className="font-medium">{childName}</span>
            </p>
          )}
        </div>

        <div className="p-8">
          {error && (
            <div className="p-4 mb-4 rounded-md text-sm bg-red-100 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading chat history...</p>
            </div>
          ) : selectedChildId && childName ? (
            <div className="rounded-md border border-gray-200 **p-4**">
              <ChatHistory userId={selectedChildId} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}