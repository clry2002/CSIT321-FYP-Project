'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Book, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ContentItem, 
  Announcement, 
  formatDate, 
  getCleanImageUrl 
} from './AnnouncementBoard';

interface BookAnnouncementBoardProps {
  classroomId: number;
  announcements: Announcement[];
  isLoadingAnnouncements: boolean;
  addNewAnnouncement: (announcement: Announcement) => void;
  removeAnnouncement: (announcementId: number) => Promise<{ success: boolean; error: string | null }>;
}

const BookAnnouncementBoard: React.FC<BookAnnouncementBoardProps> = ({ 
  classroomId, 
  announcements, 
  isLoadingAnnouncements,
  addNewAnnouncement,
  removeAnnouncement
}) => {
  const [books, setBooks] = useState<ContentItem[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<ContentItem | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string>('');
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Fetch books for assignment
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        
        // Fetch books with status = 'approved'
        const { data: booksData, error: booksError } = await supabase
          .from('temp_content')
          .select('cid, title, credit, coverimage, cfid, contenturl')
          .eq('cfid', 2) // Books only
          .eq('status', 'approved'); // Only approved content
          
        if (booksError) throw booksError;
        
        console.log('Approved books fetched:', booksData?.length || 0);
        
        setBooks(booksData || []);
        
        // Initial filtered books is empty until search
        setFilteredBooks([]);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError('Failed to load books');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // Filter books based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBooks([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = books.filter(book => {
      // Filter by search query
      return book.title.toLowerCase().includes(query) || 
        (book.credit && book.credit.toLowerCase().includes(query));
    });
    
    setFilteredBooks(filtered);
  }, [searchQuery, books]);

  const handleAssignBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBook) {
      setError('Please select a book to assign');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Prepare data to insert
      const insertData = {
        crid: classroomId,
        cid: selectedBook.cid,
        message: assignmentMessage || `The book "${selectedBook.title}" has been assigned to this classroom.`,
        created_at: new Date().toISOString()
      };
      
      console.log('Assigning book with data:', insertData);
      
      // Insert into announcement_board table
      const { data, error } = await supabase
        .from('announcement_board')
        .insert(insertData)
        .select();
      
      if (error) throw error;
      
      // Show success message
      setSuccess(`Book "${selectedBook.title}" has been assigned to the classroom!`);
      
      // Add the new announcement to the list
      if (data && data.length > 0) {
        const newAnnouncement: Announcement = {
          ...data[0],
          contentTitle: selectedBook.title,
          contentImage: selectedBook.coverimage,
          contentUrl: selectedBook.contenturl,
          contentType: 'book'
        };
        
        addNewAnnouncement(newAnnouncement);
      }
      
      // Reset form
      setShowAssignForm(false);
      setSelectedBook(null);
      setAssignmentMessage('');
      setSearchQuery('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error assigning book:', err);
      setError('Failed to assign book');
    } finally {
      setIsLoading(false);
    }
  };

  const selectBook = (book: ContentItem) => {
    setSelectedBook(book);
    setSearchQuery(book.title); // Update search field with selected book title
    setShowSearchResults(false); // Hide results after selection
  };

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Book Assignments</h2>
        <button
          onClick={() => {
            setShowAssignForm(!showAssignForm);
            if (!showAssignForm) {
              setSelectedBook(null);
              setSearchQuery('');
              setShowSearchResults(false);
            }
          }}
          className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          {showAssignForm ? 'Cancel' : 'Assign Book'}
        </button>
      </div>
      
      {/* Add book assignment form */}
      {showAssignForm && (
        <div className="bg-gray-50 p-4 rounded-lg border mb-4">
          <h3 className="text-black font-medium mb-3">Assign a Book</h3>
          <form onSubmit={handleAssignBook}>
            <div className="mb-3 relative">
              <label htmlFor="book-search" className="block text-sm font-medium text-black mb-1">
                Search for a Book
              </label>
              <div className="relative">
                <input
                  id="book-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                    if (e.target.value === '' && selectedBook) {
                      setShowSearchResults(false);
                    } else if (selectedBook && e.target.value !== selectedBook.title) {
                      setSelectedBook(null);
                    }
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Type to search for books..."
                  className="text-black w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              
              {/* Search results */}
              {showSearchResults && searchQuery.trim() !== '' && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-3 text-gray-500">Loading books...</div>
                  ) : filteredBooks.length > 0 ? (
                    <ul>
                      {filteredBooks.map((book) => (
                        <li 
                          key={book.cid}
                          onClick={() => selectBook(book)}
                          className="text-black p-3 hover:bg-gray-100 cursor-pointer flex items-center border-b last:border-b-0"
                        >
                          <div className="w-10 h-14 bg-gray-200 flex-shrink-0 mr-3 overflow-hidden">
                            {book.coverimage ? (
                              <Image
                                src={getCleanImageUrl(book.coverimage) || '/placeholder-cover.jpg'}
                                alt="Book cover"
                                width={40}
                                height={56}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Book className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{book.title}</div>
                            {book.credit && <div className="text-xs text-gray-500">by {book.credit}</div>}
                            <div className="text-xs text-gray-400">Book</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-gray-500">
                      No approved books found matching {searchQuery}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Selected book preview */}
            {selectedBook && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                <p className="text-sm text-black font-medium">Selected Book:</p>
                <div className="flex items-center mt-1">
                  {selectedBook.coverimage ? (
                    <Image
                      src={getCleanImageUrl(selectedBook.coverimage) || '/placeholder-cover.jpg'}
                      alt="Book cover"
                      width={40}
                      height={60}
                      className="object-cover mr-3 border"
                    />
                  ) : (
                    <div className="w-10 h-16 bg-gray-200 flex items-center justify-center mr-3">
                      <Book className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-grow">
                    <Link href={`/educator/bookdetail/${selectedBook.cid}`}>
                      <p className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                        {selectedBook.title}
                      </p>
                    </Link>
                    {selectedBook.credit && (
                      <p className="text-xs text-gray-600">by {selectedBook.credit}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-3">
              <label htmlFor="message" className="block text-sm font-medium text-black mb-1">
                Assignment Message (optional)
              </label>
              <textarea
                id="message"
                value={assignmentMessage}
                onChange={(e) => setAssignmentMessage(e.target.value)}
                className="text-black w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Instructions for students..."
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !selectedBook}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-400"
              >
                {isLoading ? 'Assigning...' : 'Assign Book'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
          {success}
        </div>
      )}
      
      {/* Book Assignments List */}
      {isLoadingAnnouncements ? (
        <div className="space-y-2">
          <div className="h-28 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="h-28 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      ) : announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement.abid} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row">
                {/* Book cover image */}
                <div className="w-full md:w-1/3 h-48 md:h-auto relative flex-shrink-0">
                  {announcement.contentImage ? (
                    <Image
                      src={getCleanImageUrl(announcement.contentImage) || '/placeholder-cover.jpg'}
                      alt={announcement.contentTitle || 'Book cover'}
                      width={180}
                      height={240}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Book className="h-12 w-12 text-gray-400" />
                      <span className="text-gray-400 text-xs ml-2">No cover</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-grow p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <h3 className="font-medium text-lg text-gray-900">{announcement.contentTitle}</h3>
                      <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                        Book
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(announcement.created_at)}
                    </span>
                  </div>
                  
                  {announcement.message && (
                    <p className="text-sm text-gray-700 mt-2">{announcement.message}</p>
                  )}
                  
                  <div className="mt-4 flex justify-end space-x-2">
                    <Link 
                      href={`/educator/bookdetail/${announcement.cid}`}
                      className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                    >
                      View Book
                    </Link>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        if (window.confirm(`Remove "${announcement.contentTitle}" from assignments?`)) {
                          const result = await removeAnnouncement(announcement.abid);
                          if (!result.success && result.error) {
                            setError(result.error);
                            setTimeout(() => setError(null), 3000);
                          } else {
                            setSuccess("Assignment removed successfully");
                            setTimeout(() => setSuccess(null), 3000);
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg border">
          <div className="w-16 h-24 mx-auto mb-3 bg-gray-200 rounded flex items-center justify-center">
            <Book className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500">
            No books have been assigned to this classroom yet.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Assign a book to get started!
          </p>
        </div>
      )}
    </div>
  );
};

export default BookAnnouncementBoard;