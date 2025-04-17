// components/BookCard.tsx
import { useState } from 'react';
import Image from 'next/image';

interface BookCardProps {
  title: string;
  credit: string;
  coverimage?: string | null;
  cid: number;
  minimumage: number;
  description: string;
  cfid: number;
  status: string;
  genre?: string[]; // genre is optional
}

const BookCard = (props: BookCardProps) => {
  const { title, credit, coverimage, genre = [], minimumage, cid } = props; // Provide default empty array
  const [imgError, setImgError] = useState(false);

  // Function to handle navigation
  const navigateToDetail = () => {
    window.location.href = `/bookdetail/${cid}`;
  };
  
  return (
    <div className="border rounded-lg overflow-hidden">
    <div className="relative group cursor-pointer" onClick={navigateToDetail} role="button"
      tabIndex={0} aria-label={`View details for ${title}`} 
      onKeyDown={(e) => e.key === 'Enter' && navigateToDetail()}
    >

    {!imgError && coverimage ? (
      <div className="relative w-full aspect-[3/4]">
        <Image 
          src={coverimage}
          alt={`Cover for ${title}`}
          width={300} // Add an appropriate width
          height={400} // 
          className="w-full aspect-[3/4] object-cover"
          onError={() => setImgError(true)}
        />
        </div>
      ) : (
        <div className="w-full aspect-[3/4] bg-gray-200 flex items-center justify-center text-gray-500">
          No Image
        </div>
      )}

      {/* Tooltip overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <span className="text-white text-sm font-medium">View book details</span>
      </div>

        {minimumage > 0 && (
          <div className="absolute top-1 right-1 bg-blue-900 text-white rounded-full px-2 h-6 flex items-center justify-center">
            <span className="text-xs font-medium">{minimumage}+</span>
          </div>
        )}
      </div>

      <div className="p-2">
        <h3 className="font-medium text-xs text-black leading-tight">{title}</h3>
        <p className="text-xs text-gray-500">{credit}</p>
        {genre && genre.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {genre.slice(0, 2).map((genreName, idx) => (
              <span key={idx} className="text-black text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                {genreName}
              </span>
            ))}
            {genre.length > 2 && (
              <span className="text-black text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                +{genre.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;