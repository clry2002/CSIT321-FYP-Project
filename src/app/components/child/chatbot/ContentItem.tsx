import React from 'react';
import Image from 'next/image';
import AudioButton from './audioButton';
import VideoRenderer from './VideoRenderer';
import AgeBadge from './AgeBadge';
import { Sparkles } from 'lucide-react';

interface ContentItem {
    title: string;
    description: string;
    coverimage?: string;
    contenturl: string;
    cid?: number;
    cfid: number;
    minimumage?: number | null;
    theme?: string;
}
  
interface ContentItemProps {
    item: ContentItem;
    itemId: string;
    speakingItemId: string;
    isPaused: boolean;
    toggleSpeech: (title: string, description: string, itemId: string) => void;
    handleImageClick: (imageUrl: string) => void;
    index: number;
    addIframeRef: (index: number, ref: HTMLIFrameElement | null) => void;
    onAddToSchedule?: () => void;
    isSurprise?: boolean;
}

const ContentItem: React.FC<ContentItemProps> = ({
  item,
  itemId,
  speakingItemId,
  isPaused,
  toggleSpeech,
  handleImageClick,
  index,
  addIframeRef,
  onAddToSchedule,
  isSurprise = false
}) => {
  const isSpeaking = speakingItemId === itemId;
  
  // Function to add the iframe reference
  const handleIframeRef = (el: HTMLIFrameElement | null) => {
    addIframeRef(index, el);
  };
  
  return (
    <li 
      className={`book-item ${isSurprise ? 'surprise-content' : ''}`}
      data-cfid={item.cfid}
    >
      {/* Add surprise indicator if it's a surprise item */}
      {isSurprise && (
        <div className="surprise-indicator">
          <Sparkles size={20} color="#FFD700" />
          <span>Surprise Pick!</span>
        </div>
      )}
      
      <div className="content-header">
        <strong>{item.title}</strong>
        <AgeBadge minimumAge={item.minimumage} />
      </div>
      
      <div className="content-description">
        {item.description}
      </div>
      
      <br />
      
      {/* Group image and "Read Description" button for books */}
      {item.coverimage && item.cfid !== 1 && (
        <div className="image-button-group">
          <div className={`cover-image-container ${isSurprise ? 'surprise-image' : ''}`}>
            <Image
              src={item.coverimage}
              alt={`Cover of ${item.title}`}
              width={100}
              height={150}
              className="book-cover-image"
              onClick={() => item.coverimage && handleImageClick(item.coverimage)}
              unoptimized
            />
            {isSurprise && (
              <div className="surprise-sparkles">
                <Sparkles size={24} color="#FFD700" />
              </div>
            )}
          </div>
          
          <div className="audio-button-wrapper">
            <AudioButton 
              title={item.title}
              description={item.description}
              itemId={itemId}
              isSpeaking={isSpeaking}
              isPaused={isPaused}
              onToggle={toggleSpeech}
            />
          </div>
        </div>
      )}
      
      {/* For videos or items without covers, show AudioButton normally */}
      {(!item.coverimage || item.cfid === 1) && (
        <AudioButton 
          title={item.title}
          description={item.description}
          itemId={itemId}
          isSpeaking={isSpeaking}
          isPaused={isPaused}
          onToggle={toggleSpeech}
        />
      )}
      
      <div className="content-actions">
        {item.cfid === 1 ? (
          <VideoRenderer 
            contentUrl={item.contenturl} 
            index={index} 
            iframeRef={handleIframeRef} 
          />
        ) : (
          <>
            <a
              href={item.contenturl}
              target="_blank"
              rel="noopener noreferrer"
              className="chatbot-button-style view-book-link"
            >
              View Book
            </a>
            {item.cid && item.cid !== 0 ? (
              <>
                <a
                  href={`/child/bookdetail/${item.cid}`}
                  className="chatbot-button-style view-details-link"
                >
                  View Details
                </a>
                <button
                  className="chatbot-button-style add-to-schedule-link"
                  type="button"
                  onClick={onAddToSchedule}
                >
                  Add to Reading Schedule
                </button>
              </>
            ) : (
              <span>Details unavailable</span>
            )}
          </>
        )}

        {/* For Videos */}
        {item.cfid === 1 && item.cid ? (
          <a
            href={`/videodetail/${item.cid}`}
            className="inline-block bg-emerald-500 text-white px-3 py-1 rounded"
          >
            View Video Details
          </a>
        ) : null}
      </div>
    </li>
  );
};

export default ContentItem;