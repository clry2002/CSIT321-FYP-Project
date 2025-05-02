'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CreateChildAccount() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Please enter the child's full name.");
      return;
    }
    if (!age || parseInt(age) < 1 || parseInt(age) > 17) {
      setError('Please enter a valid age between 1 and 17.');
      return;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    } else {
      setPasswordError(null); // Clear any previous password error
    }
    setError(null);
    setLoading(true);

    try {
      // Get the current parent user
      const { data: { user: parentUser }, error: parentUserError } = await supabase.auth.getUser();
      if (parentUserError || !parentUser) {
        throw new Error('Authentication error. Please log in again.');
      }
      
      // Get the parent account details
      const { data: parentData, error: parentDataError } = await supabase
        .from('user_account')
        .select('id, user_id')
        .eq('user_id', parentUser.id)
        .eq('upid', 2)
        .single();
        
      if (parentDataError || !parentData) {
        throw new Error('Failed to fetch parent profile.');
      }

      // Create a child data object
      const childData = {
        parentId: parentData.id,
        username,
        email,
        password,
        fullName,
        age: parseInt(age),
        parentEmail: parentUser.email
      };

      // Store the child data in localStorage
      // Important: We're NOT creating the child account yet - just storing the data
      try {
        localStorage.setItem('pendingChildData', JSON.stringify(childData));
        
        // Debug: Log to console to verify it was set
        console.log('pendingChildData saved:', childData);
        
        // Add a small delay before redirect to ensure localStorage is updated
        setTimeout(() => {
          // Redirect to the parent reauth page with reauth=true parameter
          router.push('/parent/reauth?reauth=true');
        }, 100);
      } catch (storageError) {
        console.error('LocalStorage error:', storageError);
        throw new Error('Failed to save child data. Please check your browser settings.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 py-10 px-6 shadow-xl overflow-hidden">
      <div className="max-w-7xl mx-auto py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Create Child Account
            </h1>
            <p className="mt-1 text-md text-gray-500">Create a reading account for your little one &lt;3</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md font-semibold text-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-opacity-50 transition-colors"
            onClick={() => router.push('/parentpage')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 text-red-500">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter child's full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>

              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  id="age"
                  type="number"
                  required
                  min="1"
                  max="17"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter child's age"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  pattern="[a-z0-9_]+"
                  title="Username can only contain lowercase letters, numbers, and underscores."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Child's email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                      </svg>
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/parentpage')}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
              >
                {loading ? 'Continuing...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}