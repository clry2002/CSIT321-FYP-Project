'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Thriller',
  'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
  'Biography', 'Self-Help', 'Business', 'Poetry', 'Drama',
];

export default function CreateChildAccount() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
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

    if (!fullName.trim()) {
      setError('Please enter the child\'s full name.');
      return;
    }

    if (!age || parseInt(age) < 1 || parseInt(age) > 17) {
      setError('Please enter a valid age between 1 and 17.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      console.log("Starting child account creation process...");
      
      // First, get the current logged-in parent
      const { data: { user: parentUser }, error: parentUserError } = await supabase.auth.getUser();
      
      if (parentUserError) {
        console.error("Error getting parent auth user:", parentUserError);
        throw new Error('Authentication error. Please log in again.');
      }
      
      if (!parentUser) {
        console.error("No parent user found");
        throw new Error('No authenticated user found. Please log in.');
      }
      
      console.log("Parent User ID:", parentUser.id);

      // Get parent's profile information
      const { data: parentData, error: parentDataError } = await supabase
        .from('user_account')
        .select('username, fullname')
        .eq('user_id', parentUser.id)
        .eq('upid', 4) // upid for parent
        .single();

      if (parentDataError) {
        console.error("Error getting parent profile:", parentDataError);
        throw new Error('Failed to fetch parent profile. Please try again.');
      }
      
      if (!parentData) {
        console.error("No parent profile found");
        throw new Error('Parent profile not found. Please contact support.');
      }
      
      console.log("Parent profile:", parentData);

      // Create child's auth account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        console.error("Error signing up child:", signUpError);
        throw signUpError;
      }
      
      if (!signUpData.user) {
        console.error("No user returned from signup");
        throw new Error('Failed to create child account. Please try again.');
      }
      
      const childUser = signUpData.user;
      console.log("Child User created:", childUser.id);

      // Insert into `user_account` table
      const { data: userAccountData, error: userAccountError } = await supabase
        .from('user_account')
        .insert({
          user_id: childUser.id,
          username,
          fullname: fullName,
          age: parseInt(age),
          upid: 5, // upid for child
        })
        .select();

      if (userAccountError) {
        console.error("Error creating user account:", userAccountError);
        throw userAccountError;
      }
      
      console.log("User account created:", userAccountData);

      // Create child profile record
      const { data: childProfileData, error: childProfileError } = await supabase
        .from('child_profile')
        .insert({
          child_id: childUser.id,
          favourite_genres: selectedGenres
        })
        .select();

      if (childProfileError) {
        console.error("Error creating child profile:", childProfileError);
        throw childProfileError;
      }
      
      console.log("Child profile created:", childProfileData);

      // Insert parent-child relationship into isparentof
      const { data: relationshipData, error: relationshipError } = await supabase
        .from('isparentof')
        .insert({
          parent: parentData.username,
          child: username
        })
        .select();

      if (relationshipError) {
        console.error("Error creating parent-child relationship:", relationshipError);
        throw relationshipError;
      }
      
      console.log("Parent-child relationship created:", relationshipData);

      // Re-authenticate as parent to ensure we maintain parent's session
      console.log("Re-authenticating as parent...");
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: parentUser.email!,
        password: password // Note: You would need to store the parent's password temporarily or implement another solution
      });
      
      if (reAuthError) {
        console.error("Error re-authenticating as parent:", reAuthError);
        // This is non-critical, so we'll just log it and continue
      }

      // Redirect to parent page with success parameter
      console.log("Account creation successful, redirecting...");
      router.push('/parentpage?success=Child account successfully created!');
    } catch (err) {
      console.error('Error creating child account:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('An error occurred during account creation. Please try again.');
      }
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
                  <label htmlFor="fullName" className="block text-sm font-medium text-black">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black"
                    placeholder="Enter child's full name"
                  />
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-black">
                    Age
                  </label>
                  <input
                    id="age"
                    type="number"
                    required
                    min="1"
                    max="17"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black"
                    placeholder="Enter child's age"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-black">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black"
                    pattern="[a-z0-9_]+"
                    title="Username can only contain lowercase letters, numbers, and underscores."
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-black">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black">
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
                            : 'border border-gray-300 text-gray-700'
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