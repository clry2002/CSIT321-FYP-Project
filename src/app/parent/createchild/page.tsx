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
      
      if (userAccountError || !userAccountData) {
        console.error('User account error:', userAccountError);
        throw new Error('Failed to create user account record.');
      }

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
              <div className={`p-4 rounded-lg ${error.includes('successfully') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/parentpage')}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
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
            <input
              type="password"
              value={parentPassword}
              onChange={(e) => setParentPassword(e.target.value)}
              placeholder="Parent Password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
            />
            <button
              onClick={handleParentReauth}
              className="w-full bg-indigo-500 text-white py-2 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
            >
              Continue as Parent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}