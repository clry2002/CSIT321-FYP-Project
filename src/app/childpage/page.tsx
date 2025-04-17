// childpage.tsx
'use client';

// import Image from 'next/image';
import Navbar from '../components/Navbar';

import BookCard from '../components/BookCard';
import ReadingCalendar from '../components/ReadingCalendar';
import ChatBot from '../components/ChatBot';
import { useBooks } from '../../hooks/useBooks';
import { useVideos } from '../../hooks/useVideos';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Book } from '../../types/database.types';

// Import the updated screen time components
// import ScreenTimeTracker from '../components/child/ScreenTimeTracker';
// import ScreenTimeLimit from '../components/child/ScreenTimeLimit';
// import ScreenTimeIndicator from '../components/child/ScreenTimeIndicator';

// const fetchChildData = async (
//   setUserFullName: (name: string | null) => void,
//   setIsLoading: (value: boolean) => void,
//   router: any
// ) => {
//   setIsLoading(true);
//   console.log("Fetching child data...");

//   try {
//     const { data: { user }, error: userError } = await supabase.auth.getUser();

//     if (userError) {
//       console.error("Error getting auth user:", userError);
//       router.push('/landing');
//       return;
//     }

//     if (!user) {
//       console.log("No authenticated user found");
//       router.push('/landing');
//       return;
//     }

//     console.log("Authenticated user ID:", user.id);

//     // Fetch user account details, using 'id' from user_account
//     const { data, error } = await supabase
//       .from('user_account')
//       .select('id, fullname') // Select 'id' instead of 'user_id'
//       .eq('user_id', user.id)  // Match with the 'user_id' field
//       .single();

//     if (error) {
//       console.error('Error fetching child fullname:', error);
//       return;
//     }

//     setUserFullName(data?.fullname || null);
//     return data?.id || null; // Set the 'id' as uaid_child
//   } catch (error) {
//     console.error('Error in fetchChildData:', error);
//   } finally {
//     setIsLoading(false);
//   }
// };


export default function ChildPage() {
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true); // Added loading state for recommendations
  //const { availableBooks, recommendedForYouBooks } = useBooks();
  const { availableBooks } = useBooks();
  const { videos } = useVideos();
  // const { userAccount, userProfile, loading } = useSession();
  const { loading } = useSession();
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Combine genre component display with recommended books 
  const recommendedBooksWithGenre = recommendedBooks.map((book) => {
    const matchingBook = availableBooks.find((b) => b.cid === book.cid);
    return {
    ...book,
    genre: matchingBook?.genre || [],
  };
});

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
      setIsLoadingRecommendations(true); // Set loading to true when starting to fetch recommendations
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoadingRecommendations(false);
          return;
        }
  
        // Get uaid
        const { data: userAccount, error: userAccountError } = await supabase
          .from('user_account')
          .select('id, age')
          .eq('user_id', user.id)
          .single();
        if (userAccountError || !userAccount) {
          console.error('Error fetching user account info:', userAccountError);
          setIsLoadingRecommendations(false);
          return;
        }
        const uaid = userAccount.id;
        const userAge = userAccount.age;
        console.log('uaid:', uaid); //delete after debugging
  
        // Get top 5 genres
        const { data: topGenres, error: genreError } = await supabase
          .from('userInteractions')
          .select('gid')
          .eq('uaid', uaid)
          .order('score', { ascending: false })
          .limit(5);
        if (genreError || !topGenres) {
          console.error('Error fetching getTop5Genres:', genreError);
          setIsLoadingRecommendations(false);
          return;
        }
        const topGenreIds = topGenres.map(g => g.gid);
        console.log('topGenreIds:', topGenreIds); //delete after debugging
  
        // Get similar users
        const { data: similarUsers, error: similarUsersError } = await supabase
          .from('userInteractions')
          .select('uaid')
          .in('gid', topGenreIds)
          .neq('uaid', uaid);
        if (similarUsersError || !similarUsers) {
          console.error('Error fetching similar users:', similarUsersError);
          setIsLoadingRecommendations(false);
          return;
        }
        const similarUaidList = [...new Set(similarUsers.map(u => u.uaid))];
        if (similarUaidList.length === 0) {
          console.log("0 similar users");
          setIsLoadingRecommendations(false);
          return; // Fallback to trending could go here
        }
        console.log('similarUaidList:', similarUaidList); //delete after debugging
  
        // Get similar user bookmarks
        const { data: similarBookmarks, error: bookmarksError } = await supabase
          .from('temp_bookmark')
          .select('cid')
          .in('uaid', similarUaidList);
        if (bookmarksError || !similarBookmarks) {
          console.error('Error fetching similar user bookmark:', bookmarksError);
          setIsLoadingRecommendations(false);
          return;
        }
        console.log('similarBookmarks:', similarBookmarks); //delete after debugging
  
        // Age-based filtering
        const bookIds = similarBookmarks.map(b => b.cid);
        const { data: bookAges, error: bookAgesError } = await supabase
          .from('temp_content')
          .select('cid, minimumage')
          .in('cid', bookIds);
        if (bookAgesError) {
          console.error('Failed to fetch book minimum ages:', bookAgesError);
          setIsLoadingRecommendations(false);
          return;
        }
        const allowedBookIds = bookAges
          .filter(book => book.minimumage <= userAge)
          .map(book => book.cid);
        const ageFilteredBookmarks = similarBookmarks.filter(b =>
          allowedBookIds.includes(b.cid)
        );
        console.log('allowedBookIds:', allowedBookIds); //delete after debugging
  
        // Get user bookmarks
        //const { data: userBookmarks, error: userBookmarksError } = await supabase
        const { data: userBookmarks } = await supabase
          .from('temp_bookmark')
          .select('cid')
          .eq('uaid', uaid);
        const userCid = userBookmarks?.map(b => b.cid) || [];
        console.log('userCid:', userCid); //delete after debugging
  
        // Filter out books the user already bookmarked
        const filteredCids = ageFilteredBookmarks
          .map(b => b.cid)
          .filter(bookId => !userCid.includes(bookId));
        console.log('filteredCids:', filteredCids); //delete after debugging
  
        // Rank by frequency
        const contentFrequency: Record<string, number> = {};
        filteredCids.forEach((bookId: string) => {
          contentFrequency[bookId] = (contentFrequency[bookId] || 0) + 1;
        });
        const rankedContentIds = Object.entries(contentFrequency)
          .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
          .map(([bookId]) => bookId);
        console.log('rankedContentIds:', rankedContentIds); //delete after debugging
  
        // Genre relevance filtering - won't include books from bookmark, if book genre is not in user's top 5
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
            return bookGenres.some(genre => topGenreIds.includes(genre.gid));
          })
        );
        const finalFilteredContentIds = rankedContentIds.filter((bookId, index) => filteredRecommendedBooks[index]);
        console.log('finalFilteredContentIds:', finalFilteredContentIds); //delete after debugging
  
        if (finalFilteredContentIds.length === 0) {
          console.log('0 content with similar genres');
          setIsLoadingRecommendations(false);
          return;
        }
  
        // Fetch content details
        const { data: recommendedBooks, error: bookDetailsError } = await supabase
          .from('temp_content')
          .select('*')
          .in('cid', finalFilteredContentIds)
          .limit(10);
        if (bookDetailsError) {
          console.error('Error fetching recommended books:', bookDetailsError);
          setIsLoadingRecommendations(false);
          return;
        }
  
        console.log("recommendedBooks:", recommendedBooks); //delete after debugging
        setRecommendedBooks(recommendedBooks || []);
      } catch (error) {
        console.error('Error in recommendedForYou:', error);
      } finally {
        setIsLoadingRecommendations(false); // Always set loading to false when done
      }

    };

    recommendedForYou();
    
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar/>
      {/* <ScreenTimeLimit />
      <ScreenTimeTracker />
      <ScreenTimeIndicator /> */}
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden pt-16">
        {/* Left Section */}
        <div className="w-1/2 overflow-y-auto p-6 border-r">
          {/* Happy Reading Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-serif mb-1.5 text-black">
              Happy reading,<br />
              {isLoading ? '...' : userFullName ? userFullName.split(' ')[0] : 'User'}
            </h1>
            {/* <p className="text-gray-800 mb-2 text-xs">
              {userProfile?.favorite_genres?.length ? 
                `Time to dive into some ${userProfile.favorite_genres.join(', ')}! Ready to discover your next favorite book?` :
                'Ready to discover your next favorite book?'
              }
            </p> */}
            <p className="text-gray-800 mb-2 text-sm">
              Welcome, {isLoading ? '...' : userFullName || 'User'}!
            </p>
            <button className="bg-gray-900 text-white px-4 py-1.5 rounded-lg inline-flex items-center text-xs">
              Start reading
              <span className="ml-1.5">↗</span>
            </button>
          </div>

          {/* Available Books Section */}
          <div className="mb-8">
            <h2 className="text-lg font-serif mb-3 text-black">Available Books</h2>
            {isLoadingRecommendations ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="w-full aspect-[3/4] bg-gray-200 animate-pulse" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : 
            <div className="grid grid-cols-4 gap-2">
              {availableBooks.slice(0,8).map((book, index) => (
                <BookCard key={index} {...book} />
              ))}
            </div>
          }
          </div>
        
          {/* Explore More Books */}
          <div className="mt-4 text-right">
            <a
              href="/search"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Explore more books →
            </a>
          </div>

          {/* Recommended Books Section with Loading State */}
          <div className="mb-8">
            <h2 className="text-lg font-serif mb-3 text-black">Recommended For You!</h2>

            {isLoadingRecommendations ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="w-full aspect-[3/4] bg-gray-200 animate-pulse" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendedBooksWithGenre.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {recommendedBooksWithGenre.map((book, index) => (
                  <BookCard key={index} {...book} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                <p className="text-lg col-span-4 font-serif text-black font-sm">
                  We currently have no books to recommend...
                </p>
              </div>
            )}
          </div>

          {/* Videos for You Section */}
          <div>
            <h2 className="text-lg font-serif mb-3 text-black">Videos for You</h2>
            <div className="grid grid-cols-4 gap-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-1">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                ))
              ) : videos.length > 0 ? (
                videos.map((video) => {
                  const videoId = video.contenturl?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                
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

           {/* Explore More Videos */}
           <div className="mt-4 text-right">
            <a
              href="/search"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Explore more videos →
            </a>
          </div>
        </div>
      
        {/* Right Section */}
        <div className="w-1/2 overflow-y-auto p-6">
          <div className="h-full flex flex-col">
            {/* Calendar Section - With custom positioning */}
            <div className="flex-1">
              <div className="mt-12"> {/* Adjust this margin-top value to control the distance from the top */}
                <div className="w-[320px] mx-auto">
                  <ReadingCalendar />
                </div>
              </div>
            </div>

            {/* ChatBot Section - Bottom */}
            <div className="mt-auto">
              <ChatBot />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}