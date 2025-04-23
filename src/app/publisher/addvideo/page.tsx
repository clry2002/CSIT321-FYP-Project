'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const AddVideos: React.FC = () => {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [genres, setGenres] = useState<{ gid: number; genrename: string }[]>([]);
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [minimumAge, setMinimumAge] = useState<number | ''>('');
  const [credits, setCredits] = useState('');
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [titleAvailable, setTitleAvailable] = useState<boolean | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchGenres = async () => {
      const { data, error } = await supabase.from('temp_genre').select('gid, genrename');
      if (error) {
        console.error('Error fetching genres:', error);
      } else {
        setGenres(data);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
    const checkTitle = async () => {
      if (!title) {
        setTitleAvailable(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('temp_content')
          .select('title')
          .ilike('title', title)
          .eq('cfid', 1);

        if (error) {
          console.error('Error checking title:', error);
          return;
        }

        setTitleAvailable(!data || data.length === 0);
      } catch (error) {
        console.error('Error checking title:', error);
      }
    };

    checkTitle();
  }, [title]);

  const validateYouTubeUrl = (url: string) => {
    const regex = /^(https?\:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\/(?:.*\/.*\/.*|\S+)(?=\s|$)/;
    return regex.test(url);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
  };

  const handleSubmit = async () => {
    if (!title || !genre || !description || !videoUrl || minimumAge === '') {
      setErrorMessage('Please fill in all fields and provide a YouTube video link.');
      setShowErrorPopup(true);
      return;
    }

    if (!validateYouTubeUrl(videoUrl)) {
      setErrorMessage('Please provide a valid YouTube video link.');
      setShowErrorPopup(true);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user || userError) {
      setErrorMessage('You must be logged in to upload a video.');
      setShowErrorPopup(true);
      return;
    }

    if (!titleAvailable) {
      setErrorMessage('Video title already exists. Please choose a different title.');
      setShowErrorPopup(true);
      return;
    }

    const { data: userAccountData, error: userAccountError } = await supabase
      .from('user_account')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (userAccountError || !userAccountData?.id) {
      console.error('Error fetching user account:', userAccountError);
      setErrorMessage('Error fetching user account data!');
      setShowErrorPopup(true);
      return;
    }

    const uaid_publisher = userAccountData.id;

    const { data: insertedContent, error: insertError } = await supabase
      .from('temp_content')
      .insert([
        {
          coverimage: null,
          title,
          credit: credits || 'Unknown',
          cfid: 1,
          minimumage: minimumAge,
          description,
          contenturl: videoUrl,
          status: 'pending',
          uaid_publisher,
        },
      ])
      .select();

    if (insertError || !insertedContent?.length) {
      console.error('Insert error:', insertError?.message || insertError);
      setErrorMessage('Failed to save video to database!');
      setShowErrorPopup(true);
      return;
    }

    const insertedCid = insertedContent[0].cid;

    const { error: genreInsertError } = await supabase
      .from('temp_contentgenres')
      .insert([{ cid: insertedCid, gid: parseInt(genre) }]);

    if (genreInsertError) {
      console.error('Failed to insert genre relation:', genreInsertError.message || genreInsertError);
      setErrorMessage('Failed to save genre information!');
      setShowErrorPopup(true);
      return;
    }

    setShowSuccessPopup(true);
  };

  const handleAddAnother = () => {
    setTitle('');
    setGenre('');
    setDescription('');
    setVideoUrl('');
    setMinimumAge('');
    setCredits('');
    setShowSuccessPopup(false);
  };

  const handleReturnHome = () => {
    router.push('/publisherpage');
  };

  const handleCancel = () => {
    setTitle('');
    setGenre('');
    setDescription('');
    setVideoUrl('');
    setMinimumAge('');
    setCredits('');
    router.push('/publisherpage');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Add New Video</h1>

        {showSuccessPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-sm w-full">
              <div className="text-center">
                <div className="mb-4 text-green-600">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Success!</h3>
                <p className="text-sm text-gray-500 mb-6">Your video has been submitted and is pending approval.</p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddAnother}
                    className="flex-grow bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                  >
                    Add Another
                  </button>
                  <button
                    onClick={handleReturnHome}
                    className="flex-grow bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors"
                  >
                    Return Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showErrorPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-sm w-full">
              <div className="text-center">
                <div className="mb-4 text-red-600">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Error</h3>
                <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
                <button
                  onClick={() => setShowErrorPopup(false)}
                  className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title:</label>
          <div className="relative mt-1">
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 text-gray-900 ${
                title && (titleAvailable === false ? 'border-red-500' : '')
              }`}
              placeholder="Enter video title"
            />
            {title && titleAvailable === false && (
              <div className="absolute -bottom-5 left-0 text-red-500 text-sm">Video title already exists</div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="genre" className="block text-sm font-medium text-gray-700">Genre:</label>
          <select
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
          >
            <option value="" className="text-gray-700">Select genre</option>
            {genres.map((g) => (
              <option key={g.gid} value={g.gid} className="text-gray-900">
                {g.genrename}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="minimumAge" className="block text-sm font-medium text-gray-700">Minimum Age:</label>
          <input
            type="number"
            id="minimumAge"
            value={minimumAge}
            onChange={(e) =>
              setMinimumAge(e.target.value === '' ? '' : parseInt(e.target.value))
            }
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 text-gray-900"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 text-gray-900"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="credits" className="block text-sm font-medium text-gray-700">Credits:</label>
          <input
            type="text"
            id="credits"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 text-gray-900"
            placeholder="Enter credits"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700">YouTube Video Link:</label>
          <input
            type="text"
            id="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 text-gray-900"
            placeholder="Enter YouTube video link"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="bg-red-500 text-white py-2 px-4 rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white py-2 px-4 rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
          >
            Add Video
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddVideos;