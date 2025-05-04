import React from 'react';

interface VideoRendererProps {
  contentUrl: string;
  index: number;
  iframeRef: (el: HTMLIFrameElement | null) => void;
}

const VideoRenderer: React.FC<VideoRendererProps> = ({ contentUrl, iframeRef }) => {
  // For YouTube videos
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|\S+\/\S+\/|\S+\?v=|v\/|(?:watch\?v=))(\S+))|(?:youtu\.be\/(\S+))/;
  const matchYouTube = contentUrl.match(youtubeRegex);
  
  if (matchYouTube) {
    const videoId = matchYouTube[1] || matchYouTube[2];
    // Extract the clean video ID (remove any additional parameters)
    const cleanVideoId = videoId?.split('&')[0] || '';
    
    return (
      <iframe
        ref={iframeRef}
        width="100%"
        height="315"
        src={`https://www.youtube.com/embed/${cleanVideoId}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    );
  }
  
  // For all other video links
  return (
    <a 
      href={contentUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="inline-block bg-blue-500 text-white px-3 py-1 rounded"
    >
      View Video
    </a>
  );
};

export default VideoRenderer;