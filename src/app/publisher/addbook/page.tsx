'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const AddBooks: React.FC = () => {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [genres, setGenres] = useState<{ gid: number; genrename: string }[]>([]);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null); // For cover image
  const [minimumAge, setMinimumAge] = useState<number | ''>('');
  const [credits, setCredits] = useState('');  // New state for credits input
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
          .ilike('title', title) // Using ilike for case-insensitive comparison
          .eq('cfid', 2); // For books only

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

  const handleTitleChange = (value: string) => {
    setTitle(value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleCoverImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setCoverImage(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    // First check: All required fields
    if (!title || !genre || !description || !file || !coverImage || minimumAge === '') {
      setErrorMessage('Please fill in all fields and upload both a book file and cover image.');
      setShowErrorPopup(true);
      return;
    }

    // Second check: User authentication
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user || userError) {
      setErrorMessage('You must be logged in to upload a book.');
      setShowErrorPopup(true);
      return;
    }

    // Third check: Title availability
    if (!titleAvailable) {
      setErrorMessage('Book title already exists in database. Please choose a different title.');
      setShowErrorPopup(true);
      return;
    }

    // Use the user auth to gain the user_id, then we use the user_id to get the ID.
    const { data: userAccountData, error: userAccountError } = await supabase
      .from('user_account') 
      .select('id') 
      .eq('user_id', user.id) 
      .single();

    if (userAccountError) {
      console.error('Error fetching user account:', userAccountError);
      setErrorMessage('Error fetching user account data!');
      setShowErrorPopup(true);
      return;
    }

    const uaid_publisher = userAccountData?.id; 

    if (!uaid_publisher) {
      console.error('User UUID not found!');
      setErrorMessage('User UUID not found!');
      setShowErrorPopup(true);
      return;
    }

    // file upload (directly into the root of 'content-pdf' bucket)
    const filePath = file.name;  // Uploading book file directly to the root of 'content-pdf' bucket
    const { error: uploadError } = await supabase.storage
      .from('content-pdf') // Uploading book file to 'content-pdf' bucket
      .upload(filePath, file);

    if (uploadError) {
      console.error('File upload error:', uploadError.message || uploadError);
      setErrorMessage('File upload failed!');
      setShowErrorPopup(true);
      return;
    }
    // remove localhost popup

    // public url for book file
    const { data: publicURLData } = supabase.storage
      .from('content-pdf')
      .getPublicUrl(filePath);
    const contenturl = publicURLData.publicUrl;

    // cover image upload (directly into the root of 'book-covers' bucket)
    const coverImagePath = coverImage.name;  // Uploading cover image directly to the root of 'book-covers' bucket
    const { error: coverImageUploadError } = await supabase.storage
      .from('book-covers') // Uploading cover image to 'book-covers' bucket
      .upload(coverImagePath, coverImage);

    if (coverImageUploadError) {
      console.error('Cover image upload error:', coverImageUploadError.message || coverImageUploadError);
      setErrorMessage('Cover image upload failed!');
      setShowErrorPopup(true);
      return;
    }

    // public url for cover image
    const { data: coverImagePublicURLData } = supabase.storage
      .from('book-covers')
      .getPublicUrl(coverImagePath);
    const coverImageUrl = coverImagePublicURLData.publicUrl;

    // Insert book details into db
    const { data: insertedContent, error: insertError } = await supabase
      .from('temp_content')
      .insert([
        {
          coverimage: coverImageUrl, // Save the cover image URL
          title,
          credit: credits || 'Unknown', // Use credits field instead of user email
          cfid: 2, // Assuming 2 is for PDF content type
          minimumage: minimumAge,
          description,
          contenturl,
          status: 'pending',
          uaid_publisher, // Use the UUID (uaid) as the foreign key reference
        },
      ])
      .select();

    if (insertError || !insertedContent || insertedContent.length === 0) {
      console.error('Insert error:', insertError?.message || insertError);
      setErrorMessage('Failed to save book to database!');
      setShowErrorPopup(true);
      return;
    }

    const insertedCid = insertedContent[0].cid;

    // Insert the genre relation into the 'temp_contentgenres' table
    const { error: genreInsertError } = await supabase
      .from('temp_contentgenres')
      .insert([{ cid: insertedCid, gid: parseInt(genre) }]);

    if (genreInsertError) {
      console.error('Failed to insert genre relation:', genreInsertError.message || genreInsertError);
      setErrorMessage('Failed to save genre information!');
      setShowErrorPopup(true);
      return;
    }

    // Show success popup instead of alert
    setShowSuccessPopup(true);
  };

  const handleAddAnother = () => {
    setTitle('');
    setGenre('');
    setDescription('');
    setFile(null);
    setCoverImage(null);
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
    setFile(null);
    setCoverImage(null);
    setMinimumAge('');
    setCredits(''); // Reset credits input
    router.push('/publisherpage');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-serif text-black mb-6">Add a New Book</h1>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mb-4 text-green-600">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Success!</h3>
              <p className="text-sm text-gray-500 mb-6">Your book has been submitted successfully and is pending approval.</p>
              <div className="flex space-x-4">
                <button
                  onClick={handleAddAnother}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Another
                </button>
                <button
                  onClick={handleReturnHome}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Return Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="mb-4 text-red-600">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Error</h3>
              <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
              <button
                onClick={() => setShowErrorPopup(false)}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Title:</label>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter book title"
              className={`w-full px-4 py-2 border rounded-lg text-gray-700 ${
                title && (
                  titleAvailable === false
                    ? 'border-red-500 focus:ring-red-500'
                    : ''
                )
              }`}
            />
            {title && titleAvailable === false && (
              <div className="text-sm text-red-600 mt-1">
                Book exists in database
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Genre:</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          >
            <option value="">Select genre</option>
            {genres.map((g) => (
              <option key={g.gid} value={g.gid}>
                {g.genrename}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Minimum Age:</label>
          <input
            type="number"
            value={minimumAge}
            onChange={(e) =>
              setMinimumAge(e.target.value === '' ? '' : parseInt(e.target.value))
            }
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Credits:</label>
          <input
            type="text"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            placeholder="Enter credits"
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Upload Book File (PDF):</label>
          <input
            type="file"
            onChange={handleFileUpload}
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Upload Cover Image:</label>
          <input
            type="file"
            onChange={handleCoverImageUpload}
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleCancel}
            className="bg-red-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-red-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600"
          >
            Add Book
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBooks;
