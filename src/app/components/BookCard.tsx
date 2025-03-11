import Image from 'next/image';

interface BookCardProps {
  title: string;
  author: string;
  coverImage: string;
  volume?: string;
}

const BookCard: React.FC<BookCardProps> = ({ title, author, coverImage, volume }) => {
  return (
    <div className="space-y-2">
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {volume && (
          <div className="absolute top-2 left-2 bg-white/80 px-2 py-0.5 rounded text-xs">
            Volume {volume}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-medium text-xs text-black leading-tight line-clamp-2">{title}</h3>
        <p className="text-xs text-gray-600">{author}</p>
      </div>
    </div>
  );
}

export default BookCard; 