'use client';

import { useState, useEffect } from 'react';
import { useBooks } from '../../../hooks/useBooks';
import { supabase } from '@/lib/supabase';
import BookCard from '../../components/BookCard';
import VideoCard from '../../components/VideoCard';
import EduNavbar from '../../components/eduNavbar';
import { Search } from 'lucide-react';
import { Book, Video } from "../../../types/database.types";

type ActiveTabType = 'books' | 'videos';

export default function AvailableContent() {
  const { availableBooks } = useBooks();
  const [, setUserFullName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [availableVideos, setAvailableVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [showNoResults, setShowNoResults] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTabType>('books');

  // Initialize activeTab from localStorage if available
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('educatorActiveTab') as ActiveTabType | null;
      if (savedTab === 'books' || savedTab === 'videos') {
        setActiveTab(savedTab);
      }
    }
  }, []);

  // Save activeTab to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('educatorActiveTab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_account')
          .select('fullname, upid')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
          return;
        }

        setUserFullName(data?.fullname || null);
      } catch (error) {
        console.error('Error in fetchUserData:', error);
      }
    };

    const fetchVideos = async () => {
      try {
        const { data, error } = await supabase
          .from('temp_content')
          .select('*')
          .eq('cfid', '1')
          .eq('status', 'approved');

        if (error) {
          console.error('Error fetching videos:', error);
          return;
        }

        setAvailableVideos(data || []);
        setFilteredVideos(data || []);
      } catch (error) {
        console.error('Error in fetchVideos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    fetchVideos();
  }, []);

  // Filter content based on search query and active tab
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBooks(availableBooks);
      setFilteredVideos(availableVideos);
      setShowNoResults(false);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    
    if (activeTab === 'books') {
      const filtered = availableBooks.filter(book => 
        book.title?.toLowerCase().includes(query) || 
        book.credit?.toLowerCase().includes(query) ||
        book.description?.toLowerCase().includes(query)
      );
      
      setFilteredBooks(filtered);
      setShowNoResults(filtered.length === 0);
    } else {
      const filtered = availableVideos.filter(video => 
        video.title?.toLowerCase().includes(query) || 
        video.credit?.toLowerCase().includes(query) ||
        video.description?.toLowerCase().includes(query)
      );
      
      setFilteredVideos(filtered);
      setShowNoResults(filtered.length === 0);
    }
  }, [searchQuery, availableBooks, availableVideos, activeTab]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleTabChange = (tab: ActiveTabType) => {
    setActiveTab(tab);
    // Clear search when switching tabs
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <EduNavbar />
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden pt-16">
        {/* Content Section */}
        <div className="overflow-y-auto p-6 border-r w-full">
          {/* Tab Navigation */}
          <div className="flex border-b mb-6">
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'books' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => handleTabChange('books')}
            >
              Books
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'videos' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => handleTabChange('videos')}
            >
              Videos
            </button>
          </div>

          {/* Section Title and Search */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-serif text-black">
              {activeTab === 'books' ? 'Available Books' : 'Available Videos'}
            </h2>
            
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-gray-500" />
              </div>
              <input
                type="text"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-64 pl-10 p-2.5"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={handleSearch}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <span className="text-gray-500 hover:text-gray-700 text-xl">&times;</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Content Display */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Array.from({ length: 18 }).map((_, index) => (
                <div key={index} className="space-y-1">
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              ))}
            </div>
          ) : showNoResults ? (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <p className="text-gray-500">
                No {activeTab} match your search for {searchQuery}.
              </p>
              <button 
                onClick={clearSearch}
                className="text-blue-500 hover:text-blue-700 mt-2 underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            activeTab === 'books' ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {filteredBooks.map((book, index) => (
                  <BookCard 
                    key={index} 
                    {...book} 
                    isEducator={true}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {filteredVideos.length > 0 ? (
                  filteredVideos.map((video, index) => (
                    <VideoCard 
                      key={index} 
                      {...video} 
                      isEducator={true}
                    />
                  ))
                ) : (
                  <div className="col-span-6 text-center text-gray-500 py-4">
                    No videos available at the moment
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}