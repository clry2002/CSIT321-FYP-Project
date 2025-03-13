'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home as HomeIcon, BookOpen, Settings, PlayCircle, Search, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/contexts/SessionContext';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Thriller',
  'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
  'Biography', 'Self-Help', 'Business', 'Poetry', 'Drama'
];

export default function ProfilePage() {
  const { userProfile, refreshProfile } = useSession();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [currentUsername, setCurrentUsername] = useState('');

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.full_name);
      setUsername(userProfile.username);
      setAge(userProfile.age.toString());
      setSelectedGenres(userProfile.favorite_genres);
      setCurrentUsername(userProfile.username);
    }
  }, [userProfile]);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else if (prev.length < 3) {
        return [...prev, genre];
      }
      return prev;
    });
  };

  const checkUsername = async (username: string) => {
    if (!username || username === currentUsername) {
      setUsernameAvailable(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (error && error.code === 'PGRST116') {
        // No results found, username is available
        setUsernameAvailable(true);
      } else {
        // Username exists
        setUsernameAvailable(false);
      }
    } catch (error) {
      console.error('Error checking username:', error);
    }
  };
  
  const [usernameEdited, setUsernameEdited] = useState(false);

  const handleUsernameChange = (value: string) => {
    setUsernameEdited(true);  // Mark username as manually edited
    const sanitizedUsername = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitizedUsername);
  
    // Only check username if the user has actually edited it
    if (sanitizedUsername !== currentUsername) {
      checkUsername(sanitizedUsername);
    } else {
      setUsernameAvailable(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (selectedGenres.length === 0) {
      setError('Please select at least one favorite genre');
      return;
    }
  
    if (usernameEdited && !usernameAvailable) { 
      setError('Please choose a different username');
      return;
    }
  
    setError(null);
    setLoading(true);
  
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');
  
      const { error } = await supabase
        .from('user_profiles')
        .update({
          username: usernameEdited ? username : currentUsername,
          full_name: name,
          age: parseInt(age),
          favorite_genres: selectedGenres
        })
        .eq('user_id', user.id);
  
      if (error) throw error;
  
      await refreshProfile();
      setError('Profile updated successfully');
      setUsernameEdited(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating your profile');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
        <div className="text-xl">✋</div>
        <nav className="flex flex-col space-y-3">
          <Link href="/home" className="p-2.5 rounded-lg hover:bg-gray-100">
            <HomeIcon className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/search" className="p-2.5 rounded-lg hover:bg-gray-100">
            <Search className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/books" className="p-2.5 rounded-lg hover:bg-gray-100">
            <BookOpen className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/videos" className="p-2.5 rounded-lg hover:bg-gray-100">
            <PlayCircle className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/settings" className="p-2.5 rounded-lg hover:bg-gray-100">
            <Settings className="w-5 h-5 text-gray-800" />
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h2>
          
          <div className="max-w-2xl">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className={`p-3 rounded-lg text-sm ${error.includes('successfully') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent !text-black"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent !text-black ${
                        username && username !== currentUsername && (
                          usernameAvailable
                            ? 'border-green-500 focus:ring-green-500'
                            : 'border-red-500 focus:ring-red-500'
                        )
                      }`}
                      pattern="[a-z0-9_]+"
                      title="Username can only contain lowercase letters, numbers, and underscores"
                    />
                    {username && username !== currentUsername && (
                      <div className={`mt-1 text-sm ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {usernameAvailable ? 'Username is available' : 'Username is taken'}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                    Age
                  </label>
                  <input
                    id="age"
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent !text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select up to 3 favorite genres
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENRES.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => handleGenreToggle(genre)}
                        className={`p-2 text-sm rounded-lg border ${
                          selectedGenres.includes(genre)
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'border-gray-300 text-gray-700 hover:border-rose-500'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/settings"
                  className="px-4 py-2 bg-gray-200 text-gray-700 border border-gray-300 rounded-lg text-sm hover:bg-gray-300"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 