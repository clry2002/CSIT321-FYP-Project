'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import type { Book as BaseBook, Video as BaseVideo } from '@/types/database.types';
// import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { handleBookmarkAction, syncExistingBookmarks } from '@/services/userInteractionsService';

type SupabaseUser = {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  created_at?: string;
};

interface GenreItem {
  cid: number;
  temp_genre: Array<{genrename: string}> | {genrename: string};
}

interface Book extends BaseBook {
  status: string;
}

interface Video extends BaseVideo {
  status: string;
}

export default function BookmarksPage() {
  // const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedBooks, setBookmarkedBooks] = useState<Book[]>([]);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Video[]>([]);
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [childUaid, setChildUaid] = useState<string | null>(null);
  const [bookGenres, setBookGenres] = useState<Record<number, string[]>>({});
  const [videoGenres, setVideoGenres] = useState<Record<number, string[]>>({});
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [pagesToRead, setPagesToRead] = useState<number>(0);

  const filteredBooks = bookmarkedBooks.filter((book) =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bookGenres[book.cid] && bookGenres[book.cid].some((genre) =>
      genre.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  );
  
  const filteredVideos = bookmarkedVideos.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (videoGenres[video.cid] && videoGenres[video.cid].some((genre) =>
      genre.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  );
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Fetched user:', user);
      setUser(user);
      setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user || null);
        console.log('User onAuthStateChange:', session?.user);
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchChildProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .eq('upid', 3)
        .single();

      if (error) {
        console.error('Child profile not found:', error);
        return;
      }

      console.log('Matched child profile:', data);
      setChildUaid(data.id); // This is the actual `uaid` used in temp_bookmark
    };

    fetchChildProfile();
  }, [user]);

  useEffect(() => {
        const fetchBookmarks = async () => {
          if (!childUaid) return;
    
          console.log('Fetching bookmarks for child uaid:', childUaid);
    
          try {
            console.log('Starting to sync existing bookmark scores');
            const syncResult = await syncExistingBookmarks(childUaid);
            console.log('Finished syncing bookmark scores, result:', syncResult);
    
            // Fetch the child's blocked genre IDs and names
            const { data: blockedGenresData, error: blockedGenresError } = await supabase
              .from('blockedgenres')
              .select('genreid, temp_genre(genrename)')
              .eq('child_id', childUaid);
    
            if (blockedGenresError) {
              console.error('Error fetching blocked genres:', blockedGenresError);
              return;
            }
    
            const blockedGenreIds = blockedGenresData ? blockedGenresData.map(bg => bg.genreid) : [];
            const blockedGenreNames = blockedGenresData
              ? blockedGenresData
                  .flatMap(bg => Array.isArray(bg.temp_genre) 
                    ? bg.temp_genre.map(g => g.genrename?.toLowerCase()) 
                    : [(bg.temp_genre as { genrename: string })?.genrename?.toLowerCase()])
                  .filter(Boolean)
              : [];
            console.log('Blocked Genre IDs for child:', blockedGenreIds);
            console.log('Blocked Genre Names for child:', blockedGenreNames);
    
            const { data: bookmarks, error: bookmarksError } = await supabase
              .from('temp_bookmark')
              .select('cid')
              .eq('uaid', childUaid);
    
            if (bookmarksError) {
              console.error('Error fetching bookmarks:', bookmarksError);
              return;
            }
    
            console.log('Fetched Bookmarks:', bookmarks);
    
            if (!bookmarks || bookmarks.length === 0) {
              console.log('No bookmarks found for this user.');
              setBookmarkedBooks([]);
              setBookmarkedVideos([]);
              setBookGenres({});
              setVideoGenres({});
              return;
            }
    
            const bookmarkedCids = bookmarks.map((bookmark) => bookmark.cid);
            console.log('Bookmarked CIDs:', bookmarkedCids);
    
            // Fetch books with genre IDs, titles, and descriptions
            const { data: bookDataWithDetails, error: bookDataWithDetailsError } = await supabase
              .from('temp_content')
              .select('*, temp_contentgenres(gid)')
              .in('cid', bookmarkedCids)
              .eq('cfid', 2);
    
            if (bookDataWithDetailsError) {
              console.error('Error fetching books with details:', bookDataWithDetailsError);
            }
    
            // Filter out books with blocked genres or blocked genre names in title/description
            const filteredBookData = bookDataWithDetails?.filter(book => {
              const bookGenreIds = book.temp_contentgenres.map((cg: { gid: number }) => cg.gid);
              const titleLower = book.title.toLowerCase();
              const descriptionLower = book.description.toLowerCase();
    
              const hasBlockedGenre = bookGenreIds.some((genreId: number) => blockedGenreIds.includes(genreId));
              const titleContainsBlockedGenre = blockedGenreNames.some(name => titleLower.includes(name));
              const descriptionContainsBlockedGenre = blockedGenreNames.some(name => descriptionLower.includes(name));
    
              return !hasBlockedGenre && !titleContainsBlockedGenre && !descriptionContainsBlockedGenre;
            }) || [];
            setBookmarkedBooks(filteredBookData);
    
            // Fetch videos with genre IDs, titles, and descriptions
            const { data: videoDataWithDetails, error: videoDataWithDetailsError } = await supabase
              .from('temp_content')
              .select('*, temp_contentgenres(gid)')
              .in('cid', bookmarkedCids)
              .eq('cfid', 1);
    
            if (videoDataWithDetailsError) {
              console.error('Error fetching videos with details:', videoDataWithDetailsError);
            }
    
            // Filter out videos with blocked genres or blocked genre names in title/description
            const filteredVideoData = videoDataWithDetails?.filter(video => {
              const videoGenreIds = video.temp_contentgenres.map((cg: { gid: number }) => cg.gid);
              const titleLower = video.title.toLowerCase();
              const descriptionLower = video.description.toLowerCase();
    
              const hasBlockedGenre = videoGenreIds.some((genreId: number) => blockedGenreIds.includes(genreId));
              const titleContainsBlockedGenre = blockedGenreNames.some(name => titleLower.includes(name));
              const descriptionContainsBlockedGenre = blockedGenreNames.some(name => descriptionLower.includes(name));
    
              return !hasBlockedGenre && !titleContainsBlockedGenre && !descriptionContainsBlockedGenre;
            }) || [];
            setBookmarkedVideos(filteredVideoData);
    
            // Now fetch the actual genre names for the *filtered* books and videos
            const filteredCids = [...filteredBookData.map(b => b.cid), ...filteredVideoData.map(v => v.cid)];
    
            if (filteredCids.length > 0) {
              const [bookGenresRes, videoGenresRes] = await Promise.all([
                supabase
                  .from('temp_contentgenres')
                  .select('cid, temp_genre(genrename)')
                  .in('cid', filteredCids)
                  .eq('content_cfid', 2), // Ensure we only get genres for books
    
                supabase
                  .from('temp_contentgenres')
                  .select('cid, temp_genre(genrename)')
                  .in('cid', filteredCids)
                  .eq('content_cfid', 1), // Ensure we only get genres for videos
              ]);
    
              // Process book genres (same as before)
              const bookGenresMap: Record<number, string[]> = {};
              if (bookGenresRes.data) {
                bookGenresRes.data.forEach((item: GenreItem) => {
                  if (!bookGenresMap[item.cid]) {
                    bookGenresMap[item.cid] = [];
                  }
                  const genreField = item.temp_genre;
                  if (Array.isArray(genreField)) {
                    genreField.forEach((g: {genrename: string}) => {
                      if (g && g.genrename) {
                        bookGenresMap[item.cid].push(g.genrename);
                      }
                    });
                  } else if (genreField && genreField.genrename) {
                    bookGenresMap[item.cid].push(genreField.genrename);
                  }
                });
              }
              setBookGenres(bookGenresMap);
    
              // Process video genres (same as before)
              const videoGenresMap: Record<number, string[]> = {};
              if (videoGenresRes.data) {
                videoGenresRes.data.forEach((item: GenreItem) => {
                  if (!videoGenresMap[item.cid]) {
                    videoGenresMap[item.cid] = [];
                  }
                  const genreField = item.temp_genre;
                  if (Array.isArray(genreField)) {
                    genreField.forEach((g: {genrename: string}) => {
                      if (g && g.genrename) {
                        videoGenresMap[item.cid].push(g.genrename);
                      }
                    });
                  } else if (genreField && genreField.genrename) {
                    videoGenresMap[item.cid].push(genreField.genrename);
                  }
                });
              }
              setVideoGenres(videoGenresMap);
            } else {
              setBookGenres({});
              setVideoGenres({});
            }
    
          } catch (err) {
            console.error('Unexpected error fetching bookmarks:', err);
          }
        };
    
        fetchBookmarks();
      }, [childUaid]);

  const handleRemoveBookmark = async (cid: number, cfid: number) => {
    if (!childUaid) return;

    console.log('Removing bookmark for uaid:', childUaid, 'cid:', cid);

    try {
      // First delete the bookmark from the database
      const { error } = await supabase
        .from('temp_bookmark')
        .delete()
        .eq('uaid', childUaid)
        .eq('cid', cid);

      if (error) {
        console.error('Error removing bookmark:', error);
        setNotification({ message: 'Failed to remove bookmark', show: true });
        return;
      }

      // Then update the user interaction scores (subtract points)
      const scoreUpdated = await handleBookmarkAction(childUaid, cid.toString(), false);
      
      if (!scoreUpdated) {
        console.warn('Failed to update interaction scores');
      } else {
        console.log('Successfully updated interaction scores for bookmark removal');
      }

      // Update the state after removal
      if (cfid === 2) {
        setBookmarkedBooks((prev) => prev.filter((book) => book.cid !== cid));
      } else if (cfid === 1) {
        setBookmarkedVideos((prev) => prev.filter((video) => video.cid !== cid));
      }

      setNotification({ message: 'Removed from bookmarks', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    } catch (err) {
      console.error('Unexpected error:', err);
      setNotification({ message: 'Failed to remove bookmark', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    }
  };

  const extractVideoId = (url: string) => {
    console.log('Extracting video ID from URL:', url);
    const match = url.match(
      /(?:youtube\.com\/(?:[^/]+\/[^/]+|(?:v|e(?:mbed)?)\/|.*[?&]v=)([\w-]+))|(?:youtu\.be\/([\w-]+))/i
    );
    if (match) {
      console.log('Matched video ID:', match[1] || match[2]);
      return match[1] || match[2];
    }
    console.log('No video ID found');
    return null;
  };

  const renderYouTubePlayer = (url: string, width: number, height: number) => {
    const videoId = extractVideoId(url);
    if (videoId) {
      return (
        <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    return <div>No valid YouTube URL found</div>;
  };

  const handleScheduleBook = (book: Book) => {
    setSelectedBook(book);
    setScheduledDate(format(new Date(), 'yyyy-MM-dd'));
    setPagesToRead(0);
    setShowScheduleModal(true);
  };

  const handleCloseModal = () => {
    setShowScheduleModal(false);
    setSelectedBook(null);
    setScheduledDate('');
    setPagesToRead(0);
  };

  const handleSaveSchedule = async () => {
    if (!selectedBook || !scheduledDate || pagesToRead <= 0) {
      setNotification({ message: 'Please fill in all fields', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('reading_schedules')
        .insert({
          user_id: user.id,
          date: new Date(scheduledDate).toISOString(),
          book_title: selectedBook.title,
          pages: pagesToRead,
          content_id: selectedBook.cid
        });

      if (error) throw error;

      setNotification({ message: 'Reading schedule saved successfully', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
      handleCloseModal();
    } catch (error) {
      console.error('Error saving schedule:', error);
      setNotification({ message: 'Failed to save schedule', show: true });
      setTimeout(() => setNotification({ message: '', show: false }), 3000);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto pt-16 px-6">
        <h1 className="text-4xl font-serif mt-10 text-black text-left">Bookmarked Content</h1>
  
        {notification.show && (
          <div className="fixed top-4 right-4 z-50 bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {notification.message}
          </div>
        )}
  
        {/* Schedule Modal */}
        {showScheduleModal && selectedBook && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl w-[400px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-black">Schedule Reading</h3>
                <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
                  <p className="text-gray-900 font-medium">{selectedBook.title}</p>
                </div>
                
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    id="date"
                    value={scheduledDate}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full border rounded-lg p-2 text-gray-900"
                  />
                </div>
  
                <div>
                  <label htmlFor="pages" className="block text-sm font-medium text-gray-700 mb-1">Pages to Read</label>
                  <input
                    type="number"
                    id="pages"
                    min="1"
                    value={pagesToRead || ''}
                    onChange={(e) => setPagesToRead(parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg p-2 text-gray-900"
                    placeholder="Enter number of pages"
                  />
                </div>
  
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSchedule}
                    disabled={!scheduledDate || pagesToRead <= 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Save Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Search Bar*/}
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            placeholder="Search Bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4 mt-2 text-black"
          />
        </div>
  
        {/* Bookmarked Books */}
        {filteredBooks.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-blue-900">Books</h2>
            {filteredBooks.map((book) => (
              <div key={book.cid} className={`flex items-start space-x-6 p-6 bg-white rounded-lg shadow-md ${
                book.status === 'suspended' ? 'bg-gray-200' : 'hover:bg-gray-50'
              }`}>
                {book.status === 'suspended' ? (
                  <div className="w-full text-center py-8">
                    <p className="text-xl text-gray-600 font-medium">Content Suspended</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-shrink-0 w-32 h-48 relative">
                      {book.coverimage ? (
                        <Image src={book.coverimage} alt={book.title} fill className="object-cover rounded-md" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-md">
                          <span className="text-gray-400">No cover</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                        <a href={`/bookdetail/${book.cid}`} className="hover:text-rose-500">
                          {book.title}
                        </a>
                      </h3>
                      <p className="text-md text-gray-600 mb-2">{book.credit}</p>
                      {bookGenres[book.cid] && bookGenres[book.cid].length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {bookGenres[book.cid].map((genre, idx) => (
                            <span
                              key={idx}
                              className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => handleScheduleBook(book)}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Schedule Reading
                      </button>
                    </div>
                    <button
                      className="ml-6 p-2 rounded-full hover:bg-gray-100 text-red-500"
                      onClick={() => handleRemoveBookmark(book.cid, 2)}
                      aria-label="Remove bookmark"
                    >
                      <svg className="w-6 h-6" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : null}
  
        {/* Bookmarked Videos */}
        {filteredVideos.length > 0 ? (
          <div className="space-y-6 mt-12">
            <h2 className="text-2xl font-semibold text-blue-900">Videos</h2>
            {filteredVideos.map((video) => (
              <div key={video.cid} className={`flex items-start space-x-6 p-6 bg-white rounded-lg shadow-md ${
                video.status === 'suspended' ? 'bg-gray-200' : 'hover:bg-gray-50'
              }`}>
                {video.status === 'suspended' ? (
                  <div className="w-full text-center py-8">
                    <p className="text-xl text-gray-600 font-medium">Content Suspended</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-shrink-0" style={{ width: '300px', height: '170px' }}>
                      {video.contenturl && renderYouTubePlayer(video.contenturl, 300, 170)}
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                        <a href={`/videodetail/${video.cid}`} className="hover:text-rose-500">
                          {video.title}
                        </a>
                      </h3>
                      <p className="text-md text-gray-600 mb-2">{video.description}</p>
                      {videoGenres[video.cid] && videoGenres[video.cid].length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {videoGenres[video.cid].map((genre, idx) => (
                            <span
                              key={idx}
                              className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="ml-6 p-2 rounded-full hover:bg-gray-100 text-red-500"
                      onClick={() => handleRemoveBookmark(video.cid, 1)}
                      aria-label="Remove bookmark"
                    >
                      <svg className="w-6 h-6" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : null}
  
        {/* If no books or videos are found */}
        {filteredBooks.length === 0 && filteredVideos.length === 0 && (
          <div>No books or videos found for your search.</div>
        )}
      </div>
    </div>
  );
}