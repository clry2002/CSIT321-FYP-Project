'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import BookAnnouncementBoard from './BookAnnouncement';
import VideoAnnouncementBoard from './VideoAnnouncement';

// Shared interfaces
export interface ContentItem {
  cid: number;
  title: string;
  author?: string;
  credit?: string;
  coverimage?: string;
  contenturl?: string;
  cfid: number;
}

export interface Announcement {
  abid: number;
  cid: number;
  crid: number;
  message: string;
  created_at: string;
  contentTitle?: string;
  contentImage?: string;
  contentUrl?: string;
  contentType: 'book' | 'video';
}

export interface AnnouncementBoardProps {
  classroomId: number;
}

// Shared utility functions
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

export const getCleanImageUrl = (url: string | undefined | null) => {
  if (!url) return null;
  return url.startsWith('@') ? url.substring(1) : url;
};

export const getYoutubeVideoId = (url: string | undefined | null) => {
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

const AnnouncementBoardSection: React.FC<AnnouncementBoardProps> = ({ classroomId }) => {
  const [contentType, setContentType] = useState<'book' | 'video'>('book');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch announcements for this classroom
  // Fetch announcements for this classroom
useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setIsLoadingAnnouncements(true);
        
        // Fetch announcements for this classroom
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcement_board')
          .select('*')
          .eq('crid', classroomId)
          .order('created_at', { ascending: false });
          
        if (announcementsError) throw announcementsError;
        
        console.log('Fetched announcements:', announcementsData);
        
        if (announcementsData && announcementsData.length > 0) {
          // Process each announcement
          const processedAnnouncements = await Promise.all(
            announcementsData.map(async (announcement) => {
              const contentId = announcement.cid;
              
              if (!contentId) {
                return {
                  ...announcement,
                  contentTitle: 'Unknown Content',
                  contentImage: null,
                  contentUrl: null,
                  contentType: 'book' // Default fallback
                };
              }
              
              // Fetch content details including cfid
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
                  contentType: 'book' // Default fallback
                };
              }
              
              // Determine content type based on cfid value
              const isVideo = contentDetails.cfid === 1;
              
              return {
                ...announcement,
                contentTitle: contentDetails?.title || 'Unknown Content',
                contentImage: isVideo ? null : contentDetails?.coverimage || null,
                contentUrl: contentDetails?.contenturl || null,
                contentType: isVideo ? 'video' : 'book'
              };
            })
          );
          
          setAnnouncements(processedAnnouncements);
        } else {
          setAnnouncements([]);
        }
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError('Failed to load announcements');
      } finally {
        setIsLoadingAnnouncements(false);
      }
    };
    
    fetchAnnouncements();
  }, [classroomId]);

  // Add new announcement to the list
  const addNewAnnouncement = (newAnnouncement: Announcement) => {
    setAnnouncements([newAnnouncement, ...announcements]);
  };
  
  // Remove announcement from the list
  const removeAnnouncement = async (announcementId: number) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('announcement_board')
        .delete()
        .eq('abid', announcementId);
        
      if (error) throw error;
      
      // Remove from state if database delete was successful
      setAnnouncements(announcements.filter(a => a.abid !== announcementId));
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error removing announcement:', err);
      return { success: false, error: 'Failed to remove assignment' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle between Books and Videos */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex bg-gray-100 rounded-md overflow-hidden">
          <button
            onClick={() => setContentType('book')}
            className={`flex items-center px-3 py-1 text-sm ${
              contentType === 'book' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Books
          </button>
          <button
            onClick={() => setContentType('video')}
            className={`flex items-center px-3 py-1 text-sm ${
              contentType === 'video' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Videos
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Render the correct component based on content type */}
      {contentType === 'book' ? (
        <BookAnnouncementBoard 
          classroomId={classroomId}
          announcements={announcements.filter(a => a.contentType === 'book')}
          isLoadingAnnouncements={isLoadingAnnouncements}
          addNewAnnouncement={addNewAnnouncement}
          removeAnnouncement={removeAnnouncement}
        />
      ) : (
        <VideoAnnouncementBoard 
          classroomId={classroomId}
          announcements={announcements.filter(a => a.contentType === 'video')}
          isLoadingAnnouncements={isLoadingAnnouncements}
          addNewAnnouncement={addNewAnnouncement}
          removeAnnouncement={removeAnnouncement}
        />
      )}
    </div>
  );
};

export default AnnouncementBoardSection;