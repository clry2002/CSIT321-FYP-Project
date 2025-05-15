'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; 
import Navbar from '@/app/components/Navbar'; 
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, Video as VideoIcon, Book, ArrowLeft } from 'lucide-react';

type Classroom = {
  crid: number;
  name: string;
  description: string;
  educatorFullName: string;
};

type Announcement = {
  abid: number;
  cid: number;
  crid: number;
  message: string;
  created_at: string;
  contentTitle?: string;
  contentImage?: string;
  contentUrl?: string;
  contentType: 'book' | 'video';
};

export default function ClassroomBoardPage() {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAccountId, setUserAccountId] = useState<string | null>(null); 
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'book' | 'video'>('book');
  const { id } = useParams(); 
  const router = useRouter(); 

  // Function to get YouTube video ID from URL
  const getYoutubeVideoId = (url: string | undefined | null) => {
    if (!url) return null;
    
    if (url.includes('youtube.com/watch?v=')) {
      return url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1]?.split('?')[0];
    }
    
    // More comprehensive regex fallback
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  // Combined authentication and data loading process
  useEffect(() => {
    console.log("Starting authentication and data loading process...");
    
    const loadClassroomData = async () => {
      setIsLoading(true);
      
      try {
        // Check user authentication
        const { data: authData, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authData?.user) {
          console.error('Authentication error:', authError);
          setIsLoading(false);
          return;
        }
        
        console.log("User authenticated, fetching user account ID...");
        
        // Retrieve user account ID
        const { data: userAccountData, error: userAccountError } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', authData.user.id)
          .single();
        
        if (userAccountError || !userAccountData) {
          console.error('Error fetching user account:', userAccountError);
          setIsLoading(false);
          return;
        }
        
        const currentUserAccountId = userAccountData.id;
        setUserAccountId(currentUserAccountId);
        console.log(`User account ID: ${currentUserAccountId}`);
        
        // Check classroom access
        const { data: invitationData, error: invitationError } = await supabase
          .from('temp_classroomstudents')
          .select('uaid_child, invitation_status')
          .eq('crid', id)
          .eq('uaid_child', currentUserAccountId)
          .single();
        
        if (invitationError || !invitationData) {
          console.error('Invitation check error:', invitationError);
          setError('No invitation found for this classroom');
          setHasAccess(false);
          setIsLoading(false);
          return;
        }
        
        const { invitation_status } = invitationData;
        if (invitation_status === 'pending' || invitation_status === 'null' || invitation_status === 'rejected') {
          console.log(`Access denied. Invitation status: ${invitation_status}`);
          setError(`Your invitation status is ${invitation_status}. Access denied.`);
          setHasAccess(false);
          setIsLoading(false);
          return;
        }
      
        setHasAccess(true);
        console.log("Access granted, fetching classroom data...");
        
        // Retrieve classroom details
        const { data: classroomData, error: classroomError } = await supabase
          .from('temp_classroom')
          .select('crid, name, description, uaid_educator')
          .eq('crid', id)
          .single();
        
        if (classroomError) {
          console.error('Classroom data error:', classroomError);
          setError('Failed to fetch classroom details');
          setIsLoading(false);
          return;
        }
        
        // Retrieve educator details
        const { data: educatorData, error: educatorError } = await supabase
          .from('user_account')
          .select('fullname')
          .eq('id', classroomData.uaid_educator)
          .single();
        
        if (educatorError) {
          console.error('Educator data error:', educatorError);
          setError('Failed to fetch educator details');
          setIsLoading(false);
          return;
        }
        
        // Set classroom data
        setClassroom({
          crid: classroomData.crid,
          name: classroomData.name,
          description: classroomData.description,
          educatorFullName: educatorData?.fullname || 'Unknown Educator'
        });

        // Fetch announcements for this classroom
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcement_board')
          .select('*')
          .eq('crid', id)
          .order('created_at', { ascending: false });
          
        if (announcementsError) {
          console.error('Announcements error:', announcementsError);
        } else if (announcementsData && announcementsData.length > 0) {
          // Process each announcement
          const processedAnnouncements = await Promise.all(
            announcementsData.map(async (announcement) => {
              const isVideo = announcement.cid !== undefined && announcement.cid !== null;
              const contentId = isVideo ? announcement.cid : announcement.cid;
              
              if (!contentId) {
                return {
                  ...announcement,
                  contentTitle: 'Unknown Content',
                  contentImage: null,
                  contentUrl: null,
                  contentType: isVideo ? 'video' : 'book'
                };
              }
              
              // Fetch content details
              const { data: contentDetails, error: contentError } = await supabase
                .from('temp_content')
                .select('title, coverimage, contenturl, cfid')
                .eq('cid', contentId)
                .single();
                
              if (contentError) {
                console.error(`Error fetching content ${contentId}:`, contentError);
                return {
                  ...announcement,
                  contentTitle: 'Content Not Found',
                  contentImage: null,
                  contentUrl: null,
                  contentType: isVideo ? 'video' : 'book'
                };
              }
              
              // Determine content type based on cfid (1 = video, 2 = book/pdf)
              const contentType = contentDetails.cfid === 1 ? 'video' : 'book';
              
              return {
                ...announcement,
                contentTitle: contentDetails?.title || 'Unknown Content',
                contentImage: contentType === 'video' ? null : contentDetails?.coverimage || null,
                contentUrl: contentDetails?.contenturl || null,
                contentType: contentType
              };
            })
          );
          
          setAnnouncements(processedAnnouncements);
        }
        
        console.log("All data loaded successfully");
      } catch (err) {
        console.error('Unexpected error during data loading:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClassroomData();
  }, [id]);

  const handleRedirectToDetail = (cid: number, contentType: 'book' | 'video', videoId?: number) => {
    if (contentType === 'video') {
      router.push(`/child/videodetail/${videoId || cid}`);
    } else {
      router.push(`/child/bookdetail/${cid}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Function to get clean image URL
  const getCleanImageUrl = (url: string | undefined | null) => {
    if (!url) return null;
    return url.startsWith('@') ? url.substring(1) : url;
  };

  // Function to render video preview
  const renderVideoPreview = (url: string | undefined | null, title: string | undefined) => {
    const videoId = getYoutubeVideoId(url);
    
    if (!videoId) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <VideoIcon className="h-8 w-8 text-gray-400" />
        </div>
      );
    }
    
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title || 'Video'}
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    );
  };

  const handleBack = () => {
    router.back();
  };

  // Display loading state when page is loading
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-blue-100">
        <Navbar />
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-2xl text-blue-600">Loading Classroom...</div>
          </div>
        </div>
      </div>
    );
  }

  // Display error message if any
  if (error) {
    return (
      <div className="flex flex-col h-screen bg-red-100">
        <Navbar />
        <div className="flex justify-center items-center h-full">
          <div className="text-2xl text-red-600 text-center">{error}</div>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => router.push('/child/classroom')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!userAccountId) {
    return (
      <div className="flex flex-col h-screen bg-yellow-100">
        <Navbar />
        <div className="flex justify-center items-center h-full">
          <div className="text-2xl text-yellow-600">You must be logged in to view this classroom.</div>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if user has access to the classroom
  if (hasAccess === false) {
    return (
      <div className="flex flex-col h-screen bg-red-100">
        <Navbar />
        <div className="flex justify-center items-center h-full">
          <div className="text-2xl text-red-600 text-center">You do not have access to this classroom.</div>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => router.push('/child/classroom')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check if classroom data was fetched
  if (!classroom) {
    return (
      <div className="flex flex-col h-screen bg-yellow-100">
        <Navbar />
        <div className="flex justify-center items-center h-full">
          <div className="text-2xl text-yellow-600">No classroom found.</div>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => router.push('/child/classroom')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Filter announcements based on active tab
  const filteredAnnouncements = announcements.filter(a => a.contentType === activeTab);

  return (
    <div
    className="flex flex-col h-screen overflow-hidden"
    style={{
      backgroundImage: 'url("/spaceclassroom.jpg")',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }}
  >
      <Navbar />

      {/* Back button */}
      <div className="flex-1 overflow-y-auto pt-20 px-6 pb-6 mt-7">
        <div className="bg-white shadow-lg rounded-xl p-8 max-w-xl mx-auto mb-8">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handleBack}
              className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </button>
          </div>

          <h2 className="text-4xl font-bold text-center text-blue-600 mb-6">Welcome to Your Classroom!</h2>
          <div className="flex items-center mb-6">
            <span className="text-4xl text-yellow-500 mr-4">👨‍🏫</span>
            <h3 className="text-3xl font-semibold text-blue-600">{classroom.name}</h3>
          </div>

          <h4 className="text-sm font-bold text-gray-600 mb-2">Description</h4>
          <p className="text-lg text-gray-700">{classroom.description}</p>

          <div className="flex justify-between items-center mt-6">
            <div>
              <span className="text-sm font-bold text-gray-600">Managed by</span>
              <h4 className="text-lg font-medium text-gray-600">{classroom.educatorFullName}</h4>
            </div>
          </div>

          {/* View Discussion Board Section */}
          <div className="mt-10 text-center">
            <h4 className="text-xl font-semibold text-gray-700 mb-4">Want to discuss with your classmates?</h4>
            <button
              onClick={() => router.push(`/child/classroomboard/${id}/discussion`)}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl text-lg hover:bg-purple-700 transition duration-200"
            >
              View Discussion Board 💬
            </button>
          </div>
        </div>

        {/* Assignments Section - Always display, even when no announcements */}
        <div className="bg-white shadow-lg rounded-xl p-8 max-w-xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-blue-600">Content Assignments</h3>
            
            {/* Tab buttons for switching between book and video assignments */}
            <div className="flex bg-gray-100 rounded-md overflow-hidden">
              <button
                onClick={() => setActiveTab('book')}
                className={`flex items-center px-3 py-1 text-sm ${
                  activeTab === 'book' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Book className="h-4 w-4 mr-1" />
                Books
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`flex items-center px-3 py-1 text-sm ${
                  activeTab === 'video' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <VideoIcon className="h-4 w-4 mr-1" />
                Videos
              </button>
            </div>
          </div>
          
          {filteredAnnouncements.length > 0 ? (
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement) => (
                <div key={announcement.abid} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row">
                    {/* Content thumbnail/cover image or video player */}
                    <div className="w-full md:w-1/3 h-48 md:h-auto relative flex-shrink-0">
                      {announcement.contentType === 'video' && announcement.contentUrl ? (
                        // Video player for videos
                        <div className="w-full h-full aspect-video">
                          {renderVideoPreview(announcement.contentUrl, announcement.contentTitle)}
                        </div>
                      ) : announcement.contentImage ? (
                        // Book cover for books
                        <Image
                          src={getCleanImageUrl(announcement.contentImage) || '/placeholder-cover.jpg'}
                          alt={announcement.contentTitle || 'Book cover'}
                          width={180}
                          height={240}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      ) : (
                        // Fallback for missing content
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          {announcement.contentType === 'video' ? (
                            <VideoIcon className="h-12 w-12 text-gray-400" />
                          ) : (
                            <Book className="h-12 w-12 text-gray-400" />
                          )}
                          <span className="text-gray-400 text-xs ml-2">No {announcement.contentType}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <h3 className="font-medium text-lg text-gray-900">{announcement.contentTitle}</h3>
                          <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            {announcement.contentType === 'video' ? 'Video' : 'Book'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(announcement.created_at)}
                        </span>
                      </div>
                      
                      {announcement.message && (
                        <p className="text-sm text-gray-700 mt-2">{announcement.message}</p>
                      )}
                      
                      <div className="mt-4 flex">
                        <button 
                          onClick={() => handleRedirectToDetail(
                            announcement.cid, 
                            announcement.contentType,
                            announcement.cid
                          )}
                          className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors ml-auto"
                        >
                          View {announcement.contentType === 'video' ? 'Video' : 'Book'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg border">
              <div className="w-16 h-24 mx-auto mb-3 bg-gray-200 rounded flex items-center justify-center">
                {activeTab === 'video' ? (
                  <VideoIcon className="h-8 w-8 text-gray-400" />
                ) : (
                  <Book className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <p className="text-gray-500">
                No {activeTab === 'book' ? 'books' : 'videos'} have been assigned yet.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Check back later for new assignments!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}