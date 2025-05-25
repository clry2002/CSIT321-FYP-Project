import React from 'react';
import { ChatMessage } from '../../../../types/database.types';
import { UseRecommendationExtractor } from './utils';
import { ContentResponseRender } from './ContentRender';
import { useRouter } from 'next/navigation';

interface MessageDisplayProps {
  message: ChatMessage;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
  const extractRecommendations = UseRecommendationExtractor();
  const router = useRouter();

  const handleViewBookDetails = (book: { title: string; cid?: number | string }) => {
    if (book.cid !== undefined) {
      const bookId = typeof book.cid === 'string' ? parseInt(book.cid, 10) : book.cid;
      router.push(`/child/bookdetail/${bookId}`);
    } else {
      // Handle search fallback
      const path = '/child/searchbooks';
      router.push(`${path}?q=${encodeURIComponent(book.title.trim())}`);
    }
  };

  const handleViewVideoDetails = (video: { title: string; cid?: number | string; contentUrl?: string }) => {
    if (video.cid !== undefined && video.cid !== null) {
      const videoId = typeof video.cid === 'string' ? parseInt(video.cid, 10) : video.cid;
      if (!isNaN(videoId)) {
        router.push(`/child/videodetail/${videoId}`);
        return;
      }
    }
    
    // Handle search fallback
    const path = '/child/searchvideos';
    router.push(`${path}?q=${encodeURIComponent(video.title.trim())}`);
  };

  const renderBotMessage = () => {
    try {
      // Try to parse as JSON first (for new structured messages)
      const parsed = JSON.parse(message.context);
      
      if (parsed.type === 'content_response') {
        // This is a structured content response
        const contentResponse = {
          genre: parsed.genre,
          books: parsed.books || [],
          videos: parsed.videos || [],
          message: parsed.message
        };
        
        return (
          <div className="space-y-3">
            {/* Display the message */}
            <p className="break-words">{parsed.message}</p>
            
            {/* Display the structured content */}
            <ContentResponseRender
              content={contentResponse}
              handleViewBookDetails={handleViewBookDetails}
              handleViewVideoDetails={handleViewVideoDetails}
            />
          </div>
        );
      }
    } catch {
      // Not JSON or not structured content, fall back to extraction
    }
    
    // Fall back to the original extraction method for older messages
    return (
      <div className="break-words">
        {extractRecommendations(message.context)}
      </div>
    );
  };

  return (
    <div
      className={`max-w-[80%] p-4 rounded-lg shadow-md ${
        message.ischatbot
          ? 'bg-gray-200 text-gray-900 self-start'
          : 'bg-rose-500 text-white self-end'
      }`}
    >
      {message.ischatbot ? (
        renderBotMessage()
      ) : (
        <p className="mb-1 break-words whitespace-pre-wrap">
          {message.context}
        </p>
      )}
      <span className={`text-xs block text-right ${
        message.ischatbot ? 'text-gray-500' : 'text-white' 
      }`}>
        {new Date(message.createddate + 'Z').toLocaleString('en-GB', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: "Asia/Singapore",
        })}
      </span>
    </div>
  );
};

export default MessageDisplay;