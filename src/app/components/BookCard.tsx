import Image from 'next/image';

interface BookCardProps {
  title: string;
  author: string;
  cover_image: string;
}

const BookCard: React.FC<BookCardProps> = ({ title, author, cover_image }) => {
  return (
    <div className="space-y-2">
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
        <Image
          src={cover_image}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div>
        <h3 className="font-medium text-xs text-black leading-tight line-clamp-2">{title}</h3>
        <p className="text-xs text-gray-600">{author}</p>
      </div>
    </div>
  );
}

export default BookCard; 