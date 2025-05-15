import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import VideoPreview from './videopreview';
import RecommendationDisplay from './recommendationdisplay';
import { ChatMessage, Book, Video, ContentResponse } from '../../../../types/database.types';

// Chat processing utilities
export const groupMessagesByDate = (messages: ChatMessage[]) => {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  
  messages.forEach((message) => {
    const messageDate = new Date(message.createddate);
    const dateString = messageDate.toDateString();
    
    const existingGroup = groups.find(group => group.date === dateString);
    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groups.push({
        date: dateString,
        messages: [message]
      });
    }
  });
  
  return groups;
};

// Content extraction and parsing utilities
export const containsRecommendations = (text: string): boolean => {
  return (
    text.includes('recommendations for you') ||
    text.includes('Books:') ||
    text.includes('Videos:') ||
    (text.includes('For ages') && text.includes('–'))
  );
};

// Video-related utilities
export const getVideoId = (contentUrl: string | null): string | null => {
  console.log('Attempting to extract video ID from:', contentUrl);
  if (!contentUrl) {
    console.log('No content URL provided');
    return null;
  }
  
  try {
    // Handle different YouTube URL formats
    if (contentUrl.includes('youtube.com/watch')) {
      const url = new URL(contentUrl);
      const videoId = url.searchParams.get('v');
      console.log('Extracted video ID from youtube.com/watch format:', videoId);
      return videoId;
    } else if (contentUrl.includes('youtu.be/')) {
      const parts = contentUrl.split('youtu.be/');
      if (parts.length >= 2) {
        const videoId = parts[1].split('?')[0].split('&')[0];
        console.log('Extracted video ID from youtu.be format:', videoId);
        return videoId;
      }
    } else if (contentUrl.includes('youtube.com/embed/')) {
      const parts = contentUrl.split('youtube.com/embed/');
      if (parts.length >= 2) {
        const videoId = parts[1].split('?')[0].split('&')[0];
        console.log('Extracted video ID from youtube.com/embed format:', videoId);
        return videoId;
      }
    }
    
    console.warn('Could not extract video ID from URL format:', contentUrl);
    return null;
  } catch (err) {
    console.error('Error parsing YouTube URL:', err, contentUrl);
    return null;
  }
};

// Router action utility functions - can be called within components
export const handleViewDetails = (book: Book, router: ReturnType<typeof useRouter>) => {
  if (book.cid !== undefined) {
    const bookId = typeof book.cid === 'string' ? parseInt(book.cid, 10) : book.cid;
    router.push(`/child/bookdetail/${bookId}`);
  } else {
    handleSearch(book.title, 'books', router);
  }
};

export const handleWatchVideo = (video: Video, router: ReturnType<typeof useRouter>) => {
  console.log("Video object:", video);
  
  if (video.cid !== undefined && video.cid !== null) {
    const videoId = typeof video.cid === 'string' ? parseInt(video.cid, 10) : video.cid;
    if (!isNaN(videoId)) {
      router.push(`/child/videodetail/${videoId}`);
      return;
    }
  }
  
  handleSearch(video.title, 'videos', router);
};

export const handleSearch = (query: string, type: 'books' | 'videos', router: ReturnType<typeof useRouter>) => {
  if (!query.trim()) return;
  const path = type === 'books' ? '/child/searchbooks' : '/child/searchvideos';
  router.push(`${path}?q=${encodeURIComponent(query.trim())}`);
};

// Content formatting and rendering functions - to be used in your components
// Each component that uses these should have its own useRouter hook

export const UseRecommendationExtractor = () => {
  const router = useRouter();
  
  // This hook returns a function that extracts recommendations
  return (content: string) => {
    console.log('Extracting recommendations from content:', content);
    try {
      content = content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Replace double asterisks with <b> tags
      
      // Check if it's already in a recommendations format
      if (containsRecommendations(content)) {
        return renderUIBasedRecommendations(content, router);
      }

      // Try to parse as JSON
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        try {
          // Clean and prepare the string for parsing
          const processedContent = content
            .replace(/'/g, '"') // Replace all single quotes with double quotes
            .replace(/\\"/g, '\\"') // Preserve escaped quotes
            .replace(/(\w+):/g, '"$1":') // Ensure property names are in double quotes
            .replace(/:\s*"([^"]*?)"/g, ':"$1"'); // Fix value formatting
            
          const contentObj = JSON.parse(processedContent);
          
          if (
            contentObj.genre ||
            contentObj.books ||
            contentObj.videos ||
            contentObj.books_ai ||
            contentObj.videos_ai
          ) {
            return renderContentResponse(contentObj, router);
          }
        } catch {
          // If JSON parsing fails, try to extract books and videos using regex
          return extractContentWithRegex(content, router);
        }
      }

      // Handle HTML content
      if (content.includes('<br>') || content.includes('<h3>') || content.includes('<b>')) {
        return <div dangerouslySetInnerHTML={{ __html: content }} />;
      }

      // Default case: plain text
      return <p className="whitespace-pre-wrap">{content}</p>;
    } catch (error) {
      console.error('Error formatting chatbot response:', error);
      return <p className="whitespace-pre-wrap">{content}</p>;
    }
  };
};

// These functions are used by the hook above but don't need to be exported
const renderUIBasedRecommendations = (content: string, router: ReturnType<typeof useRouter>) => {
  // Split the content by lines to find book and video sections
  const lines = content.split('\n');
  const genre = lines.find(line => line.includes('recommendations for you'))?.trim() || 'Content recommendations';
  
  // Extract book sections using regex
  const bookPattern = /(\w[\w\s'&-]+)(?:\s–\s)([^]*?)(?:For ages (\d+)\+|$)/g;
  const books: Book[] = [];
  let match;
  
  const contentString = content.toString();
  while ((match = bookPattern.exec(contentString)) !== null) {
    const title = match[1]?.trim();
    const description = match[2]?.trim();
    const age = match[3] ? parseInt(match[3], 10) : 0;
    
          if (title) {
      // Create a book object with required fields
      const book: Book = {
        title,
        description: description || '',
        minimumage: age,
        cid: 0,
        credit: '', 
        genre: [],
        cfid: 0,
        status: ''
      };
      books.push(book);
    }
  }

  // Extract video sections and URLs
  const videos: Video[] = [];
  const videoSectionStart = content.indexOf("Videos:");
  
  if (videoSectionStart !== -1) {
    const videoSection = content.substring(videoSectionStart);
    const videoPattern = /(\w[\w\s'&-]+)(?:\s–\s)([^]*?)(?:(?:URL|Link):\s*([^\n]+)|For ages (\d+)\+|$)/g;
    
    while ((match = videoPattern.exec(videoSection)) !== null) {
      const title = match[1]?.trim();
      const description = match[2]?.trim();
      const contentUrl = match[3]?.trim();
      const age = match[4] ? parseInt(match[4], 10) : 0;
      
      if (title) {
        // Create a video object with required fields
        const video: Video = {
          title,
          description: description || '',
          contenturl: contentUrl || '',
          minimumage: age,
          cid: 0, // Default to 0 since undefined is not allowed
          credit: '',
          genre: [],
          cfid: 0
        };
        videos.push(video);
      }
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{genre}</p>
      
      {books.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">Books:</h3>
          {books.map((book, index) => (
            <div key={index} className="bg-white p-3 rounded shadow-sm">
              <div className="flex">
                <div className="w-16 h-20 bg-gray-200 rounded flex-shrink-0 mr-3 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">Cover</span>
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold">{book.title}</h4>
                  <p className="text-sm">{book.description}</p>
                  {book.minimumage && book.minimumage > 0 && (
                    <p className="text-xs mt-1">For ages {book.minimumage}+</p>
                  )}
                  <button 
                    className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                    onClick={() => handleViewDetails(book, router)}
                  >
                    View Book Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {videos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">Videos:</h3>
          {videos.map((video, index) => (
            <div key={index} className="bg-white p-3 rounded shadow-sm">
              <div className="flex flex-col">
                <div className="w-full mb-3">
                  <VideoPreview 
                    contentUrl={video.contenturl || null} 
                    title={video.title} 
                  />
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold">{video.title}</h4>
                  <p className="text-sm">{video.description}</p>
                  {video.minimumage !== undefined && video.minimumage > 0 && (
                    <p className="text-xs mt-1">For ages {video.minimumage}+</p>
                  )}
                  <button 
                    className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                    onClick={() => handleWatchVideo(video, router)}
                  >
                    View Video Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const renderContentResponse = (content: ContentResponse, router: ReturnType<typeof useRouter>) => {
  return (
    <RecommendationDisplay 
      content={content}
      handleViewDetails={(book) => handleViewDetails(book, router)}
      handleWatchVideo={(video) => handleWatchVideo(video, router)}
    />
  );
};

const extractContentWithRegex = (content: string, router: ReturnType<typeof useRouter>) => {
  try {
    // Extract genre
    const genreMatch = content.match(/'genre':\s*'([^']+)'/);
    const genre = genreMatch ? genreMatch[1] : null;
    
    // Extract books section
    let booksString = '';
    const booksMatch = content.match(/'books':\s*\[([\s\S]*?)\]/);
    if (booksMatch && booksMatch[1]) {
      booksString = booksMatch[1];
    }
    
    // Extract individual book objects
    const books: Book[] = [];
    const bookRegex = /{[\s\S]*?}/g;
    let bookMatch;
    
    while ((bookMatch = bookRegex.exec(booksString)) !== null) {
      const bookStr = bookMatch[0];
      
      // Extract book properties
      const titleMatch = bookStr.match(/'title':\s*'([^']+)'/);
      const descMatch = bookStr.match(/'description':\s*'([^']+)'/);
      const ageMatch = bookStr.match(/'minimumage':\s*(\d+)/);
      const coverMatch = bookStr.match(/'coverimage':\s*'([^']+)'/);
      const cidMatch = bookStr.match(/'cid':\s*(\d+)/);
      
      const title = titleMatch ? titleMatch[1] : '';
      const description = descMatch ? descMatch[1] : '';
      const minimumage = ageMatch ? parseInt(ageMatch[1], 10) : 0;
      const coverimage = coverMatch ? coverMatch[1] : '';
      const cid = cidMatch ? cidMatch[1] : '';
      
      // Create a book object with all required fields
      const book: Book = {
        title,
        description,
        minimumage,
        coverimage,
        cid: cid ? parseInt(cid, 10) : 0, // Use 0 instead of undefined
        credit: '',
        genre: [] ,
        cfid: 0,
        status: ''
      };
      books.push(book);
    }
    
    // Extract videos section
    let videosString = '';
    const videosMatch = content.match(/'videos':\s*\[([\s\S]*?)\]/);
    if (videosMatch && videosMatch[1]) {
      videosString = videosMatch[1];
    }
    
    // Extract individual video objects
    const videos: Video[] = [];
    const videoRegex = /{[\s\S]*?}/g;
    let videoMatch;
    
    while ((videoMatch = videoRegex.exec(videosString)) !== null) {
      const videoStr = videoMatch[0];
      
      // Extract video properties
      const titleMatch = videoStr.match(/'title':\s*'([^']+)'/);
      const descMatch = videoStr.match(/'description':\s*'([^']+)'/);
      const ageMatch = videoStr.match(/'minimumage':\s*(\d+)/);
     // const thumbnailMatch = videoStr.match(/'thumbnailUrl':\s*'([^']+)'/);
      const contentUrlMatch = videoStr.match(/'contenturl':\s*'([^']+)'/);
      const cidMatch = videoStr.match(/'cid':\s*(\d+)/);
      
      const title = titleMatch ? titleMatch[1] : '';
      const description = descMatch ? descMatch[1] : '';
      const minimumage = ageMatch ? parseInt(ageMatch[1], 10) : 0;
      //const thumbnailUrl = thumbnailMatch ? thumbnailMatch[1] : '';
      const contenturl = contentUrlMatch ? contentUrlMatch[1] : '';
      const cid = cidMatch ? cidMatch[1] : '';
      
      // Create a video object with all required fields
      const video: Video = {
        title,
        description,
        minimumage,// Note: Make sure this matches your Video type definition
        contenturl,   // Note: This should match exactly the field name in your type
        cid: cid ? parseInt(cid, 10) : 0, // Use 0 instead of undefined
        credit: '',
        genre: [],
        cfid: 0
      };
      videos.push(video);
    }

    // Check if we successfully extracted any data
    if (genre || books.length > 0 || videos.length > 0) {
      return (
        <div className="space-y-4">
          {genre && (
            <p className="font-medium">
              Here are some {genre} recommendations for you:
            </p>
          )}
          
          {books.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg">Books:</h3>
              {books.map((book, index) => (
                <div key={index} className="bg-white p-3 rounded shadow-sm">
                  <div className="flex flex-col">
                    <div className="w-full mb-3">
                      {book.coverimage ? (
                        <Image
                          src={book.coverimage}
                          alt={`Cover of ${book.title}`}
                          width={800} 
                          height={400}
                          className="w-full object-cover rounded"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-64 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-500 text-xs">Cover</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold">{book.title}</h4>
                      <p className="text-sm">{book.description}</p>
                      <p className="text-xs mt-1">For ages {book.minimumage}+</p>
                      <button 
                        className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                        onClick={() => handleViewDetails(book, router)}
                      >
                        View Book Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {videos.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg">Videos:</h3>
              {videos.map((video, index) => (
                <div key={index} className="bg-white p-3 rounded shadow-sm">
                  <div className="flex flex-col">
                    <div className="w-full mb-3">
                      <VideoPreview 
                        contentUrl={video.contenturl || null} 
                        title={video.title}
                      />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold">{video.title}</h4>
                      <p className="text-sm">{video.description}</p>
                      {video.minimumage !== undefined && video.minimumage > 0 && (
                        <p className="text-xs mt-1">For ages {video.minimumage}+</p>
                      )}
                      <button 
                        className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                        onClick={() => handleWatchVideo(video, router)}
                      >
                        View Video Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    // Fallback to plain text if regex extraction fails
    return <p className="whitespace-pre-wrap">{content}</p>;
  } catch (error) {
    console.error('Error in regex extraction:', error);
    return <p className="whitespace-pre-wrap">{content}</p>;
  }
};