import Image from 'next/image';
import VideoPreview from './videopreview';
import { Book, Video, ContentResponse } from '../../../../types/database.types';

interface BookItemProps {
  book: Book;
  handleViewBookDetails: (book: { title: string; cid?: number | string }) => void;
}

export const BookItem = ({ book, handleViewBookDetails }: BookItemProps) => {
  return (
    <div className="bg-white p-3 rounded shadow-sm">
      <div className="flex">
        {book.coverimage ? (
          <Image
            src={book.coverimage}
            alt={`Cover of ${book.title}`}
            width={64} 
            height={80}
            className="object-cover rounded flex-shrink-0 mr-3"
          />
        ) : (
          <div className="w-16 h-20 bg-gray-200 rounded flex-shrink-0 mr-3 flex items-center justify-center">
            <span className="text-gray-500 text-xs">Cover</span>
          </div>
        )}
        <div className="flex-grow">
          <h4 className="font-bold">{book.title}</h4>
          <p className="text-sm">{book.description}</p>
          <p className="text-xs mt-1">For ages {book.minimumage}+</p>
          <button 
            className="mt-2 px-3 py-1 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
            onClick={() => handleViewBookDetails(book)}
          >
            View Book Details
          </button>
        </div>
      </div>
    </div>
  );
};

interface VideoItemProps {
  video: Video;
  handleViewVideoDetails: (video: { title: string; cid?: number | string; contentUrl?: string }) => void;
}

export const VideoItem = ({ video, handleViewVideoDetails }: VideoItemProps) => {
  return (
    <div className="bg-white p-3 rounded shadow-sm">
      <div className="flex flex-col">
        <div className="w-full mb-3">
          <VideoPreview 
            contentUrl={video.contenturl || undefined} 
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
            onClick={() => handleViewVideoDetails(video)}
          >
            View Video Details
          </button>
        </div>
      </div>
    </div>
  );
};

interface ContentResponseRenderProps {
  content: ContentResponse;
  handleViewBookDetails: (book: { title: string; cid?: number | string }) => void;
  handleViewVideoDetails: (video: { title: string; cid?: number | string; contentUrl?: string }) => void;
}

export const ContentResponseRender = ({ 
  content, 
  handleViewBookDetails, 
  handleViewVideoDetails 
}: ContentResponseRenderProps) => {
  return (
    <div className="space-y-4">
      {content.genre && (
        <p className="font-medium">
          Here are some {content.genre} recommendations for you:
        </p>
      )}

      {content.books && content.books.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">Books:</h3>
          {content.books.map((book, index) => (
            <BookItem 
              key={index} 
              book={book} 
              handleViewBookDetails={handleViewBookDetails} 
            />
          ))}
        </div>
      )}

      {content.videos && content.videos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">Videos:</h3>
          {content.videos.map((video, index) => (
            <VideoItem 
              key={index} 
              video={video} 
              handleViewVideoDetails={handleViewVideoDetails} 
            />
          ))}
        </div>
      )}

      {content.books_ai && (
        <div className="mt-3">
          <div dangerouslySetInnerHTML={{ __html: content.books_ai }} />
        </div>
      )}

      {content.videos_ai && (
        <div className="mt-3">
          <div dangerouslySetInnerHTML={{ __html: content.videos_ai }} />
        </div>
      )}

      {content.error && <p className="text-red-500">{content.error}</p>}
    </div>
  );
};

