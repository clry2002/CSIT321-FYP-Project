'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Thriller',
  'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
  'Biography', 'Self-Help', 'Business', 'Poetry', 'Drama',
];

export default function CreateChildAccount() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      } else if (prev.length < 3) {
        return [...prev, genre];
      }
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedGenres.length === 0) {
      setError('Please select at least one favorite genre.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // Retrieve the user ID after successful signup
      const { data: { user }, error: userFetchError } = await supabase.auth.getUser();
      if (!user || userFetchError) throw new Error('Failed to fetch user after signup.');

      // Insert into `user_account` table
      const { error: userAccountError } = await supabase
        .from('user_account')
        .insert({
          user_id: user.id,
          username,
          favorite_genres: selectedGenres,
        });

      if (userAccountError) throw userAccountError;

      setError('Account successfully created!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pt-16">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Child Account</h2>
          <div className="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    error.includes('successfully')
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-500'
                  }`}
                >
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500"
                    pattern="[a-z0-9_]+"
                    title="Username can only contain lowercase letters, numbers, and underscores."
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Select up to 3 favorite genres:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENRES.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => handleGenreToggle(genre)}
                        className={`p-2 text-sm rounded-lg ${
                          selectedGenres.includes(genre)
                            ? 'bg-rose-500 text-white'
                            : 'border-gray-300 text-gray-700'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href="/parentpage"
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
