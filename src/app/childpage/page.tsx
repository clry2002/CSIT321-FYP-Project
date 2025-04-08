'use client';

import Image from 'next/image';
import Navbar from '../components/Navbar';

// import Header from '../components/Header'; // TO REMOVE THIS LINE AND THE HEADER SECTION IF DONT NEED

import BookCard from '../components/BookCard';
import Calendar from '../components/Calendar';
import ChatBot from '../components/ChatBot';
import { useBooks } from '../../hooks/useBooks';
import { useVideos } from '../../hooks/useVideos';
import { useCalendar } from '../../hooks/useCalendar';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function ChildPage() {
  const { popularBooks } = useBooks();
  const { videos } = useVideos();
  const { calendarDays, currentMonth } = useCalendar();
  const { userProfile, loading } = useSession();
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserFullName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_account')
          .select('fullname')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user fullname:', error);
          return;
        }

        setUserFullName(data?.fullname || null);
      } catch (error) {
        console.error('Error in fetchUserFullName:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserFullName();
  }, []);

  useEffect(() => {
    const recommendedForYou = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: userAccount, error: userAccountError } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (userAccountError || !userAccount) {
          console.error('Error fetching uaid:', userAccountError);
          return;
        }
        const uaid = userAccount.id;
        console.log('uaid:', uaid); //delete after debugging

        //getTop5Genres
        const { data: topGenres, error: genreError } = await supabase
          .from('userInteractions')
          .select('gid')
          .eq('uaid', uaid)
          .order('score', { ascending: false })
          .limit(5);
        if (genreError || !topGenres) {
          console.error('Error fetching getTop5Genres:', genreError);
          return;
        }
        const topGenreIds = topGenres.map(g => g.gid);
        console.log('topGenreIds:', topGenreIds); //delete after debugging

        //getSimilarUsers
        const { data: similarUsers, error: similarUsersError } = await supabase
          .from('userInteractions')
          .select('uaid')
          .in('gid', topGenreIds)
          .neq('uaid', uaid);
        if (similarUsersError || !similarUsers) {
          console.error('Error fetching similar users:', similarUsersError);
          return;
        }
        const similarUaidList = [...new Set(similarUsers.map(u => u.uaid))];
        if (similarUaidList.length === 0) {
          console.log("0 similar users");
          //if none, show currently trending
          return;
        }
        console.log('similarUaidList:', similarUaidList); //delete after debugging

        const { data: similarBookmarks, error: bookmarksError } = await supabase
          .from('temp_bookmark')
          .select('cid')
          .in('uaid', similarUaidList);
        if (bookmarksError || !similarBookmarks) {
          console.error('Error fetching similar user bookmark:', bookmarksError);
          return;
        }
        console.log('similarBookmarks:', similarBookmarks); //delete after debugging

        const { data: userBookmarks, error: userBookmarksError } = await supabase
          .from('temp_bookmark')
          .select('cid')
          .eq('uaid', uaid);
        const userCid = userBookmarks?.map(b => b.cid) || [];
        //filtering similarBookmarks
        const filteredCids = similarBookmarks
          .map(b => b.cid)
          .filter(bookId => !userCid.includes(bookId));
  
        //ranking by content frequency
        const contentFrequency: Record<string, number> = {};
        filteredCids.forEach((bookId: string) => {
          contentFrequency[bookId] = (contentFrequency[bookId] || 0) + 1;
        });
        const rankedContentIds = Object.entries(contentFrequency)
          .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
          .map(([bookId]) => bookId);

        //check if at least 1 of 5 genres are present
        const filteredRecommendedBooks = await Promise.all(
          rankedContentIds.map(async (bookId) => {
            const { data: bookGenres, error: genreError } = await supabase
              .from('temp_contentgenres')
              .select('gid')
              .eq('cid', bookId);
            if (genreError || !bookGenres) {
              console.error('Error fetching genre(s) for content:', genreError);
              return false;
            }
            //check if at least 1 of 5 genres are present
            return bookGenres.some(genre => topGenreIds.includes(genre.gid));
          })
        );
        //remove content(s) with 0 genres present
        const finalFilteredContentIds = rankedContentIds.filter((bookId, index) => filteredRecommendedBooks[index]);

        //get content infomation (unused)
        if (finalFilteredContentIds.length === 0) {
          console.log('0 content with similar genres');
          return;
        }
        const { data: recommendedBooks, error: bookDetailsError } = await supabase
          .from('temp_content')
          .select('*')
          .in('cid', finalFilteredContentIds)
          .limit(10);
        if (bookDetailsError) {
          console.error('Error fetching recommended books:', bookDetailsError);
          return;
        }
        console.log("recommendedBooks:", recommendedBooks); //delete after debugging
      } catch (error) {
        console.error('Error in recommendedForYou:', error);
      }
    };
    recommendedForYou();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <Navbar/>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">

        {/* <Header />  REMOVE THIS LINE IF DONT NEED!*/} 


        <div className="px-6">
          {/* Main Grid */}
          <div className="grid grid-cols-2 gap-5">
            {/* Left Column */}
            <div className="space-y-5">
              {/* Happy Reading Section */}
              <div>
                <h1 className="text-2xl font-serif mb-1.5 text-black">
                  Happy reading,<br />
                  {isLoading ? '...' : userFullName ? userFullName.split(' ')[0] : 'User'}
                </h1>
                <p className="text-gray-800 mb-2 text-xs">
                  {userProfile?.favorite_genres?.length ? 
                    `Time to dive into some ${userProfile.favorite_genres.join(', ')}! Ready to discover your next favorite book?` :
                    'Ready to discover your next favorite book?'
                  }
                </p>
                <p className="text-gray-800 mb-2 text-sm">
                  Welcome, {isLoading ? '...' : userFullName || 'User'}!
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

              {/* Book Recommendation ChatBot, Changes to be made from Chatbot.tsx component */}
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
