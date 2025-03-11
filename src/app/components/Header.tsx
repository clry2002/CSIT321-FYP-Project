'use client';

import Image from 'next/image';
import { Bell, User } from 'lucide-react';

interface HeaderProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  showSearch = false, 
  searchPlaceholder = "Search...",
  onSearch 
}) => {
  return (
    <header className="flex justify-between items-center mb-5 px-6 py-4">
      {showSearch && (
        <div className="relative">
          <input
            type="text"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch?.(e.target.value)}
            className="pl-9 pr-4 py-1.5 w-[400px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-800 !text-black text-sm font-medium"
          />
        </div>
      )}
      <div className={`flex items-center space-x-3 ${!showSearch && 'ml-auto'}`}>
        <button className="hover:bg-gray-100 p-2 rounded-full">
          <Bell className="w-5 h-5 text-gray-800" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="relative w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <span className="font-medium text-sm">Alexander Mark</span>
        </div>
      </div>
    </header>
  );
};

export default Header; 