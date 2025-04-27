import Link from 'next/link';
import { Home as HomeIcon, Book, Settings, LogOut } from 'lucide-react';

export default function EduNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 w-full bg-white border-t border-gray-200 shadow-md z-10">
      <div className="max-w-screen-xl mx-auto flex justify-around py-3">
        {/* Home */}
        <Link href="/teacherpage" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
          <HomeIcon className="w-5 h-5 text-gray-800" />
          <span className="text-xs text-gray-800 mt-1 font-bold">Home</span>
        </Link>

        {/* Available Content */}
        <Link href="/teacher/availableContent" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
          <Book className="w-5 h-5 text-gray-800" />
          <span className="text-xs text-gray-800 mt-1 font-bold">Content</span>
        </Link>

        {/* Settings */}
        <Link href="/teacher/settings" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
          <Settings className="w-5 h-5 text-gray-800" />
          <span className="text-xs text-gray-800 mt-1 font-bold">Settings</span>
        </Link>

        {/* Logout */}
        <Link href="/logout" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
          <LogOut className="w-5 h-5 text-gray-800" />
          <span className="text-xs text-gray-800 mt-1 font-bold">Logout</span>
        </Link>
      </div>
    </nav>
  );
}