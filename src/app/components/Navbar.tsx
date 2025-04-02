import Link from 'next/link';
import { Home as HomeIcon, Search, BookOpen, PlayCircle, Settings, LogOut } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full bg-white border-t border-gray-200 flex justify-around py-3">
      <Link href="/childpage" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <HomeIcon className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">Home</span></b>
      </Link>

      <Link href="/search" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <Search className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">Search</span></b>
      </Link>

      <Link href="/bookmark" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <BookOpen className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">Bookmark</span></b>
      </Link>

      <Link href="/videos" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <PlayCircle className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">My Classroom</span></b>
      </Link>

      <Link href="/settings" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <Settings className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">Settings</span></b>
      </Link>

      {/* Logout link */}
      <Link href="/logout" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <LogOut className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">Logout</span></b>
      </Link>
    </nav>
  );
}