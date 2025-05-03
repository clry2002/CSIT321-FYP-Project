import Link from 'next/link';
import { Home as HomeIcon, Book, Settings, LogOut } from 'lucide-react';

export default function EduNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-200 shadow-md z-50">
      <div className="max-w-screen-xl mx-auto flex justify-around py-3">
        {/* Home */}
        <Link href="/educatorpage" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-100 transition-colors">
          <HomeIcon className="w-6 h-6 text-gray-800" />
          <span className="text-xs text-gray-800 mt-1 font-medium">Home</span>
        </Link>

        {/* Available Content */}
        <Link href="/educator/availableContent" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-100 transition-colors">
          <Book className="w-6 h-6 text-gray-800" />
          <span className="text-xs text-gray-800 mt-1 font-medium">Content</span>
        </Link>

        {/* Settings */}
        <Link href="/educator/settings" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-100 transition-colors">
          <Settings className="w-6 h-6 text-gray-800" />
          <span className="text-xs text-gray-800 mt-1 font-medium">Settings</span>
        </Link>

        {/* Logout */}
        <Link href="/logout" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-100 transition-colors">
          <LogOut className="w-6 h-6 text-gray-800" />
          <span className="text-xs text-gray-800 mt-1 font-medium">Logout</span>
        </Link>
      </div>
    </nav>
  );
}
