'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Video as VideoIcon, Clock } from 'lucide-react';
import Link from 'next/link';
import { 
  ContentItem, 
  Announcement, 
  formatDate, 
  getYoutubeVideoId 
} from './AnnouncementBoard';

interface VideoAnnouncementBoardProps {
  classroomId: number;
  announcements: Announcement[];
  isLoadingAnnouncements: boolean;
  addNewAnnouncement: (announcement: Announcement) => void;
  removeAnnouncement: (announcementId: number) => Promise<{ success: boolean; error: string | null }>;
}

const VideoAnnouncementBoard: React.FC<VideoAnnouncementBoardProps> = ({ 
  classroomId, 
  announcements, 
  isLoadingAnnouncements,
  addNewAnnouncement,
  removeAnnouncement
}) => {
  const [videos, setVideos] = useState<ContentItem[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<ContentItem | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string>('');
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Fetch videos for assignment
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        
        // Fetch videos
        const { data: videosData, error: videosError } = await supabase
          .from('temp_content')
          .select('cid, title, credit, coverimage, cfid, contenturl')
          .eq('cfid', 1); // Videos only
          
        if (videosError) throw videosError;
        
        console.log('Videos fetched:', videosData?.length || 0);
        
        setVideos(videosData || []);
        
        // Initial filtered videos is empty until search
        setFilteredVideos([]);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // Filter videos based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVideos([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = videos.filter(video => {
      // Filter by search query
      return video.title.toLowerCase().includes(query) || 
        (video.credit && video.credit.toLowerCase().includes(query));
    });
    
    setFilteredVideos(filtered);
  }, [searchQuery, videos]);

  const handleAssignVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVideo) {
      setError('Please select a video to assign');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Prepare data to insert
      const insertData = {
        crid: classroomId,
        cid: selectedVideo.cid, // Store in cid field
        message: assignmentMessage || `The video "${selectedVideo.title}" has been assigned to this classroom.`,
        created_at: new Date().toISOString()
      };
      
      console.log('Assigning video with data:', insertData);
      
      // Insert into announcement_board table
      const { data, error } = await supabase
        .from('announcement_board')
        .insert(insertData)
        .select();
      
      if (error) throw error;
      
      // Show success message
      setSuccess(`Video "${selectedVideo.title}" has been assigned to the classroom!`);
      
      // Add the new announcement to the list
      if (data && data.length > 0) {
        const newAnnouncement: Announcement = {
          ...data[0],
          contentTitle: selectedVideo.title,
          contentImage: null,
          contentUrl: selectedVideo.contenturl,
          contentType: 'video'
        };
        
        addNewAnnouncement(newAnnouncement);
      }
      
      // Reset form
      setShowAssignForm(false);
      setSelectedVideo(null);
      setAssignmentMessage('');
      setSearchQuery('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error assigning video:', err);
      setError('Failed to assign video');
    } finally {
      setIsLoading(false);
    }
  };

  const selectVideo = (video: ContentItem) => {
    setSelectedVideo(video);
    setSearchQuery(video.title); // Update search field with selected video title
    setShowSearchResults(false); // Hide results after selection
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

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Video Assignments</h2>
        <button
          onClick={() => {
            setShowAssignForm(!showAssignForm);
            if (!showAssignForm) {
              setSelectedVideo(null);
              setSearchQuery('');
              setShowSearchResults(false);
            }
          }}
          className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          {showAssignForm ? 'Cancel' : 'Assign Video'}
        </button>
      </div>
      
      {/* Add video assignment form */}
      {showAssignForm && (
        <div className="bg-gray-50 p-4 rounded-lg border mb-4">
          <h3 className="text-black font-medium mb-3">Assign a Video</h3>
          <form onSubmit={handleAssignVideo}>
            <div className="mb-3 relative">
              <label htmlFor="video-search" className="block text-sm font-medium text-black mb-1">
                Search for a Video
              </label>
              <div className="relative">
                <input
                  id="video-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                    if (e.target.value === '' && selectedVideo) {
                      setShowSearchResults(false);
                    } else if (selectedVideo && e.target.value !== selectedVideo.title) {
                      setSelectedVideo(null);
                    }
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Type to search for videos..."
                  className="text-black w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              
              {/* Search results */}
              {showSearchResults && searchQuery.trim() !== '' && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-3 text-gray-500">Loading videos...</div>
                  ) : filteredVideos.length > 0 ? (
                    <ul>
                      {filteredVideos.map((video) => (
                        <li 
                          key={video.cid}
                          onClick={() => selectVideo(video)}
                          className="text-black p-3 hover:bg-gray-100 cursor-pointer flex items-center border-b last:border-b-0"
                        >
                          <div className="w-10 h-14 bg-gray-200 flex-shrink-0 mr-3 overflow-hidden">
                            <div className="w-full h-full flex items-center justify-center">
                              <VideoIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">{video.title}</div>
                            {video.credit && <div className="text-xs text-gray-500">by {video.credit}</div>}
                            <div className="text-xs text-gray-400">Video</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-gray-500">
                      No videos found matching {searchQuery}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Selected video preview */}
            {selectedVideo && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                <p className="text-sm text-black font-medium">Selected Video:</p>
                <div className="flex items-center mt-1">
                  <div className="w-24 h-16 mr-3 overflow-hidden">
                    {selectedVideo.contenturl ? (
                      <div className="w-full h-full">
                        {renderVideoPreview(selectedVideo.contenturl, selectedVideo.title)}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <VideoIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <Link href={`/educator/videodetail/${selectedVideo.cid}`}>
                      <p className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                        {selectedVideo.title}
                      </p>
                    </Link>
                    {selectedVideo.credit && (
                      <p className="text-xs text-gray-600">by {selectedVideo.credit}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-3">
              <label htmlFor="message" className="block text-sm font-medium text-black mb-1">
                Assignment Message (optional)
              </label>
              <textarea
                id="message"
                value={assignmentMessage}
                onChange={(e) => setAssignmentMessage(e.target.value)}
                className="text-black w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Instructions for students..."
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !selectedVideo}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-400"
              >
                {isLoading ? 'Assigning...' : 'Assign Video'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
          {success}
        </div>
      )}
      
      {/* Video Assignments List */}
      {isLoadingAnnouncements ? (
        <div className="space-y-2">
          <div className="h-28 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="h-28 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      ) : announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement.abid} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row">
                {/* Video player */}
                <div className="w-full md:w-1/3 h-48 md:h-auto relative flex-shrink-0">
                  {announcement.contentUrl ? (
                    <div className="w-full h-full aspect-video">
                      {renderVideoPreview(announcement.contentUrl, announcement.contentTitle)}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <VideoIcon className="h-12 w-12 text-gray-400" />
                      <span className="text-gray-400 text-xs ml-2">No video</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-grow p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <h3 className="font-medium text-lg text-gray-900">{announcement.contentTitle}</h3>
                      <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                        Video
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
                  
                  <div className="mt-4 flex justify-end space-x-2">
                    <Link 
                      href={`/educator/videodetail/${announcement.cid || announcement.cid}`}
                      className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                    >
                      View Video
                    </Link>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        if (window.confirm(`Remove "${announcement.contentTitle}" from assignments?`)) {
                          const result = await removeAnnouncement(announcement.abid);
                          if (!result.success && result.error) {
                            setError(result.error);
                            setTimeout(() => setError(null), 3000);
                          } else {
                            setSuccess("Assignment removed successfully");
                            setTimeout(() => setSuccess(null), 3000);
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                    >
                      Remove
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
            <VideoIcon className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500">
            No videos have been assigned to this classroom yet.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Assign a video to get started!
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoAnnouncementBoard;