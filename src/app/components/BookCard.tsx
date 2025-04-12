// components/BookCard.tsx
import { useState } from 'react';

interface BookCardProps {
  title: string;
  credit: string;
  coverimage?: string | null;
  cid: number;
  minimumage: number;
  description: string;
  cfid: number;
  status: string;
  genre?: string[]; // Make genre optional since it might not be available immediately
}

const BookCard = (props: BookCardProps) => {
  const { title, credit, coverimage, genre = [], minimumage } = props; // Provide default empty array
  const [imgError, setImgError] = useState(false);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="relative">
        {!imgError && coverimage ? (
          <img 
            src={coverimage}
            alt={`Cover for ${title}`}
            className="w-full aspect-[3/4] object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400 text-xs">No Cover</span>
          </div>
        )}
        {minimumage > 0 && (
          <div className="absolute top-1 right-1 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center">
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
              <span key={idx} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                {genreName}
              </span>
            ))}
            {genre.length > 2 && (
              <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
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