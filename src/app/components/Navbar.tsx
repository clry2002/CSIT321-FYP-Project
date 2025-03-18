import Link from 'next/link';
import { Home as HomeIcon, Search, BookOpen, PlayCircle, Settings } from 'lucide-react';

export default function Navbar() {
  return (
  <nav className="fixed top-0 w-full bg-white border-t border-gray-200 flex justify-around py-3">
    <Link href="/home" className="p-2.5 rounded-lg hover:bg-gray-200">
    <HomeIcon className="w-5 h-5 text-gray-800" />
    <b><span className="text-xs text-gray-800 mt-1">Home</span></b>
    </Link>

    <Link href="/search" className="p-2.5 rounded-lg hover:bg-gray-200">
    <Search className="w-5 h-5 text-gray-800" />
    <b><span className="text-xs text-gray-800 mt-1">Search</span></b>
    </Link>

    <Link href="/bookmark" className="p-2.5 rounded-lg hover:bg-gray-200">
    <BookOpen className="w-5 h-5 text-gray-800" />
    <b><span className="text-xs text-gray-800 mt-1">Bookmark</span></b>
    </Link>

    <Link href="/videos" className="p-2.5 rounded-lg hover:bg-gray-200">
    <PlayCircle className="w-5 h-5 text-gray-800" />
    <b><span className="text-xs text-gray-800 mt-1">My Classroom</span></b>
    </Link>

    <Link href="/settings" className="p-2.5 rounded-lg hover:bg-gray-200">
    <Settings className="w-5 h-5 text-gray-800" />
    <b><span className="text-xs text-gray-800 mt-1">Settings</span></b>
    </Link>

    </nav>
    // <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around py-3">
    //   <Link href="/home" className="flex flex-col items-center text-gray-800 hover:text-rose-500">
    //     <HomeIcon className="w-5 h-5" />
    //     <span className="text-xs">Home</span>
    //   </Link>
    //   <Link href="/search" className="flex flex-col items-center text-gray-800 hover:text-rose-500">
    //     <Search className="w-5 h-5" />
    //     <span className="text-xs">Search</span>
    //   </Link>
    //   <Link href="/books" className="flex flex-col items-center text-rose-500">
    //     <BookOpen className="w-5 h-5" />
    //     <span className="text-xs">Books</span>
    //   </Link>
    //   <Link href="/videos" className="flex flex-col items-center text-gray-800 hover:text-rose-500">
    //     <PlayCircle className="w-5 h-5" />
    //     <span className="text-xs">Videos</span>
    //   </Link>
    //   <Link href="/settings" className="flex flex-col items-center text-gray-800 hover:text-rose-500">
    //     <Settings className="w-5 h-5" />
    //     <span className="text-xs">Settings</span>
    //   </Link>
    // </nav>
  );
}


