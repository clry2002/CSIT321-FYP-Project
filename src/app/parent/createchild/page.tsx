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
  const [parentEmail, setParentEmail] = useState('');
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [parentPassword, setParentPassword] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showParentPassword, setShowParentPassword] = useState(false);

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

      if (userAccountError || !userAccountData) {
        throw new Error('Failed to create user account record.');
      }

      await supabase.from('isparentof').insert({
        parent_id: parentData.id,
        child_id: userAccountData.id,
        timeLimitMinute: 60,
      });

      setShowReauthModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setLoading(false);
    }
  };

  const handleParentReauth = async () => {
    setReauthError(null);
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: parentEmail,
      password: parentPassword,
    });

    if (reauthError) {
      setReauthError('Incorrect password. Please try again.');
      return;
    }

    router.push('/parentpage?success=Child account successfully created!');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleParentPasswordVisibility = () => {
    setShowParentPassword(!showParentPassword);
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
            className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md font-semibold text-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-opacity-50 transition-colors"
            onClick={() => router.push('/parentpage')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter child's full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Child's email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
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
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
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
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {showReauthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-5">Re-enter Parent Password</h3>
            <p className="text-gray-600 mb-6">Please enter your password to complete the child account creation.</p>
            <div className="relative mb-3"> {/* Added a wrapper div for positioning */}
              <input
                type={showParentPassword ? 'text' : 'password'}
                value={parentPassword}
                onChange={(e) => setParentPassword(e.target.value)}
                placeholder="Parent Password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
              />
              <button
                type="button"
                onClick={toggleParentPasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showParentPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                </svg>
                )}
              </button>
            </div>
            {reauthError && (
              <div className="text-red-500 text-sm mb-4">{reauthError}</div>
            )}
            <button
              onClick={handleParentReauth}
              className="w-full bg-indigo-500 text-white py-2 rounded-md hover:bg-indigo-600"
            >
              Continue as Parent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}