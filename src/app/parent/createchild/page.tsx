'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CreateChildAccount() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genres, setGenres] = useState<{ gid: number; genrename: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parentEmail, setParentEmail] = useState('');
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [parentPassword, setParentPassword] = useState('');

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const { data, error } = await supabase.from('temp_genre').select('gid, genrename');
      if (error) throw error;
      setGenres(data);
    } catch (err) {
      console.error('Error fetching genres:', err);
      setError('Failed to load genres. Please try again.');
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGenres.length === 0) {
      setError('Please select at least one favorite genre.');
      return;
    }
    if (!fullName.trim()) {
      setError("Please enter the child's full name.");
      return;
    }
    if (!age || parseInt(age) < 1 || parseInt(age) > 17) {
      setError('Please enter a valid age between 1 and 17.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { data: { user: parentUser }, error: parentUserError } = await supabase.auth.getUser();
      if (parentUserError || !parentUser) throw new Error('Authentication error. Please log in again.');
      setParentEmail(parentUser.email || '');

      const { data: parentData, error: parentDataError } = await supabase
        .from('user_account')
        .select('id, user_id')
        .eq('user_id', parentUser.id)
        .eq('upid', 2)
        .single();
      if (parentDataError || !parentData) throw new Error('Failed to fetch parent profile.');

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError || !signUpData.user) throw new Error('Failed to create child account.');

      const childUser = signUpData.user;
      
      // Create user_account
      const { data: userAccountData, error: userAccountError } = await supabase
      .from('user_account')
      .insert({
        user_id: childUser.id,
        username,
        fullname: fullName,
        age: parseInt(age),
        upid: 3,
      })
      .select('*')
      .single();
      
      if (userAccountError || !userAccountData)
      {
        console.error('User account error:', userAccountError);
        throw new Error('Failed to create user account record.');
      }

      await supabase.from('child_details').insert({
        child_id: userAccountData.id,
        favourite_genres: selectedGenres
      });

      const genreInteractions = genres
        .filter(genre => selectedGenres.includes(genre.genrename))
        .map(genre => ({
          child_id: userAccountData.id,
          genreid: genre.gid,
          score: 20
        }));

      await supabase.from('userInteractions2').insert(genreInteractions);

      await supabase.from('isparentof').insert({
        parent_id: parentData.id,
        child_id: userAccountData.id,
        timeLimitMinute: 60  // Set a default time limit if needed
      });

      setShowReauthModal(true);
    } catch (err) {
      console.error('Error creating child account:', err);
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setLoading(false);
    }
  };

  const handleParentReauth = async () => {
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: parentEmail,
      password: parentPassword
    });

    if (reauthError) {
      setError('Failed to log back in as parent. Please try again.');
      return;
    }

    router.push('/parentpage?success=Child account successfully created!');
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pt-16">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Child Account</h2>
          <div className="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className={`p-3 rounded-lg text-sm ${error.includes('successfully') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{error}</div>
              )}

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-black">Full Name</span>
                  <input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter child's full name" className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black" />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-black">Age</span>
                  <input id="age" type="number" required min="1" max="17" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Enter child's age" className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black" />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-black">Username</span>
                  <input id="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} pattern="[a-z0-9_]+" title="Username can only contain lowercase letters, numbers, and underscores." className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black" />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-black">Email</span>
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Child's email" className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black" />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-black">Password</span>
                  <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black" />
                </label>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Select up to 3 favorite genres:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {genres.map((genre) => (
                      <button key={genre.gid} type="button" onClick={() => handleGenreToggle(genre.genrename)} className={`p-2 text-sm rounded-lg ${selectedGenres.includes(genre.genrename) ? 'bg-rose-500 text-white' : 'border border-gray-300 text-gray-700'}`}>{genre.genrename}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Link href="/parentpage" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</Link>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600">{loading ? 'Creating...' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showReauthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg space-y-4 max-w-sm w-full">
            <h3 className="text-lg text-black font-semibold">Re-enter Parent Password</h3>
            <input type="password" value={parentPassword} onChange={(e) => setParentPassword(e.target.value)} placeholder="Parent Password" className="w-full px-3 py-2 border border-gray-300 rounded text-black" />
            <button onClick={handleParentReauth} className="w-full bg-rose-500 text-white py-2 rounded hover:bg-rose-600">Continue as Parent</button>
          </div>
        </div>
      )}
    </div>
  );
}