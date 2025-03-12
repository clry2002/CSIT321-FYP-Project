'use client';

<<<<<<< HEAD
import Image from 'next/image';
import { Bell, User } from 'lucide-react';
=======
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, User, LogOut } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/lib/supabase';
>>>>>>> fbdb6d5 (webpage v1.1)

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
<<<<<<< HEAD
=======
  const router = useRouter();
  const { userProfile } = useSession();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

>>>>>>> fbdb6d5 (webpage v1.1)
  return (
    <header className="flex justify-between items-center mb-5 px-6 py-4">
      {showSearch && (
        <div className="relative">
<<<<<<< HEAD
=======
          <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
>>>>>>> fbdb6d5 (webpage v1.1)
          <input
            type="text"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch?.(e.target.value)}
            className="pl-9 pr-4 py-1.5 w-[400px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-800 !text-black text-sm font-medium"
          />
        </div>
      )}
      <div className={`flex items-center space-x-3 ${!showSearch && 'ml-auto'}`}>
<<<<<<< HEAD
        <button className="hover:bg-gray-100 p-2 rounded-full">
          <Bell className="w-5 h-5 text-gray-800" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="relative w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <span className="font-medium text-sm">Alexander Mark</span>
        </div>
=======
        <button 
          onClick={handleLogout}
          className="hover:bg-gray-100 p-2 rounded-full text-gray-800 hover:text-rose-500 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
        <Link href="/profile" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <span className="font-medium text-sm">{userProfile?.full_name || 'Loading...'}</span>
        </Link>
>>>>>>> fbdb6d5 (webpage v1.1)
      </div>
    </header>
  );
};

export default Header; 