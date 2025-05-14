import Image from 'next/image';

interface ReaderFriendProps {
  name: string;
  avatarUrl: string;
  comment: string;
  chapter: string;
  timeAgo: string;
}

export default function ReaderFriend({ name, avatarUrl, comment, chapter, timeAgo }: ReaderFriendProps) {
  return (
    <div className="flex items-start space-x-4 py-4">
      <Image
        src={avatarUrl}
        alt={name}
        width={48}
        height={48}
        className="rounded-full"
        unoptimized
      />
      <div className="flex-1">
        <h3 className="font-medium">{name}</h3>
        <p className="text-gray-600 mt-1">{comment}</p>
        <div className="flex items-center space-x-2 mt-2">
          <span className="text-rose-500 text-sm">{chapter}</span>
          <span className="text-gray-400 text-sm">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
} 