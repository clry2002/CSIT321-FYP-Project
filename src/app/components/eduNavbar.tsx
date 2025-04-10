import Link from 'next/link';
import { Home as HomeIcon, BookOpen, ClipboardList, Settings, LogOut } from 'lucide-react';

export default function eduNavbar() {
  return (
    <nav className="fixed top-0 w-full bg-white border-t border-gray-200 flex justify-around py-3">
      {/* Home */}
      <Link href="/teacherpage" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <HomeIcon className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">Home</span></b>
      </Link>

      {/* Manage Classroom */}
      <Link href="/teacher/view-classroom-new" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <BookOpen className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">Manage Classroom</span></b>
      </Link>

      {/* Announcement Board */}
      <Link href="/teacher/announcement-board" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <ClipboardList className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">Announcement Board</span></b>
      </Link>

      {/* Settings */}
      <Link href="/teacher/settings" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <Settings className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">Settings</span></b>
      </Link>

      {/* Logout */}
      <Link href="/logout" className="flex flex-col items-center p-2.5 rounded-lg hover:bg-gray-200">
        <LogOut className="w-5 h-5 text-gray-800" />
        <b><span className="text-xs text-gray-800 mt-1">Logout</span></b>
      </Link>
    </nav>
  );
}
