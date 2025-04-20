import { getVideoId } from './utils';

interface VideoDetailsProps {
  contentUrl?: string | null;  // Updated to accept string | null | undefined
  title: string;
}

const VideoDetails: React.FC<VideoDetailsProps> = ({ contentUrl, title }) => {
  console.log('Rendering video thumbnail for:', title, 'URL:', contentUrl);

  if (!contentUrl) {
    console.warn(`Missing contentUrl for video: "${title}"`);
  }
  
  const videoId = contentUrl ? getVideoId(contentUrl) : null;
  console.log('Extracted video ID:', videoId);

  // If we couldn't extract a video ID or there's no content URL, show fallback immediately
  if (!videoId || !contentUrl) {
    return (
      <div className="w-full aspect-video bg-gray-200 rounded flex items-center justify-center">
        <span className="text-gray-500 text-xs">Video preview not available</span>
      </div>
    );
  }

  // Render the iframe with the extracted video ID
  return (
    <div className="aspect-video relative">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        className="absolute inset-0 w-full h-full rounded"
        allowFullScreen
      />
    </div>
  );
};

export default VideoDetails;