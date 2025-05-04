import React, { useState, useEffect, useRef } from 'react';
import { useChatbot } from '@/hooks/useChatbot';
import { useSpeech } from '@/hooks/useTextToSpeech';
import { Send } from 'lucide-react';
import Image from 'next/image';
import AudioButton from './child/chatbot/audioButton';
import ReadingCalendar from './ReadingCalendar';
import './styles.css';
import { supabase } from '@/lib/supabase';
import { 
  detectUserUncertainty, 
  detectBotSuggestion, 
  isUncertaintyQuestion,
  detectNewGenresRequest
} from '../utils/uncertaintyDetector';
import { 
  getRandomGenres
} from '../utils/genreRecommender';
import UncertaintyTracker from '../utils/uncertaintyTracker';

interface ReadingSchedule {
  id?: number;
  date: Date;
  bookTitle: string;
  pages: number;
  status: 'pending' | 'completed';
  content_id?: number;
}

const ChatBot: React.FC = () => {
  const { messages, isLoading, sendMessage, userFullName } = useChatbot();
  const { speakingItemId, isPaused, toggleSpeech, stopAllSpeech } = useSpeech();
  const [input, setInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRefs = useRef<{ [key: number]: HTMLIFrameElement | null }>({});
  const [pendingSchedules, setPendingSchedules] = useState<ReadingSchedule[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [showGenreSuggestions, setShowGenreSuggestions] = useState(false);
  const [randomGenres, setRandomGenres] = useState<string[]>([]);
  const [showRandomGenres, setShowRandomGenres] = useState(false);

  // Fetch favorite genres when component mounts
  useEffect(() => {
    const fetchFavoriteGenres = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // First get the child_id (which is the user_account.id)
        const { data: userData, error: userError } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (userError || !userData) {
          console.error('Error fetching user account details:', userError);
          return;
        }

        // Then get the favorite genres using the child_id
        const { data, error } = await supabase
          .from('child_details')
          .select('favourite_genres')
          .eq('child_id', userData.id)
          .single();

        if (error) {
          console.error('Error fetching favorite genres:', error);
          return;
        }

        // Handle the text[] array type from Supabase
        if (data && data.favourite_genres) {
          let genres: string[] = [];
          
          // Check if favourite_genres is already an array
          if (Array.isArray(data.favourite_genres)) {
            genres = data.favourite_genres;
          } else if (typeof data.favourite_genres === 'string') {
            // If it's a string, try to parse it
            try {
              // Try parsing as JSON first
              genres = JSON.parse(data.favourite_genres);
            } catch {
              // If not valid JSON and it's a string, use it as a single genre
              genres = [data.favourite_genres];
            }
          }
          
          setFavoriteGenres(genres);
        }
      } catch (error) {
        console.error('Error in fetchFavoriteGenres:', error);
      }
    };

    fetchFavoriteGenres();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Effect to monitor for bot responses that might indicate uncertainty
  useEffect(() => {
    // Only check the most recent bot message
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.role === 'assistant' && typeof lastMessage.content === 'string') {
      if (detectBotSuggestion(lastMessage.content)) {
        setShowGenreSuggestions(true);
      }
    }
  }, [messages]);

  // Fetch pending schedules when component mounts and when calendar closes
  useEffect(() => {
    const fetchPendingSchedules = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('reading_schedules')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending');

        if (error) throw error;

        setPendingSchedules(data || []);
      } catch (error) {
        console.error('Error fetching pending schedules:', error);
      }
    };

    fetchPendingSchedules();
  }, [isCalendarOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    
    // Check if this is a request for different genres
    const isRequestingNewGenres = detectNewGenresRequest(userMessage);
    
    if (isRequestingNewGenres) {
      console.log("User is requesting different genres");
      try {
        // Get random genres, explicitly excluding favorite genres
        const differentGenres = await getRandomGenres(5, favoriteGenres);
        setRandomGenres(differentGenres);
        setShowRandomGenres(true);
        setShowGenreSuggestions(false); // Hide favorite genres
      } catch (error) {
        console.error("Error getting different genres:", error);
      }
    } 
    // Check if the message indicates uncertainty using our utility function
    else if (detectUserUncertainty(userMessage)) {
      // Increment uncertainty counter when uncertainty is detected
      UncertaintyTracker.increment();
      console.log("Uncertainty count:", UncertaintyTracker.getCount());
      
      // Show favorite genres first
      setShowGenreSuggestions(true);
      
      // If the child has expressed uncertainty multiple times, suggest random genres
      if (UncertaintyTracker.shouldShowRandomSuggestions()) {
        try {
          const randomRecommendations = await getRandomGenres(3, favoriteGenres);
          setRandomGenres(randomRecommendations);
          setShowRandomGenres(true);
        } catch (error) {
          console.error("Error getting random genres:", error);
        }
      } else {
        setShowRandomGenres(false);
      }
    } else {
      // Reset uncertainty counter for non-uncertainty messages
      UncertaintyTracker.reset();
      setShowGenreSuggestions(false);
      setShowRandomGenres(false);
    }
    
    await sendMessage(userMessage);
  };

  const handleQuestionClick = async (question: string) => {
    // Check if this is an uncertainty question using our utility function
    const isUncertain = isUncertaintyQuestion(question);
    
    if (isUncertain) {
      // Increment uncertainty counter
      UncertaintyTracker.increment();
      console.log("Uncertainty count:", UncertaintyTracker.getCount());
      
      // Show favorite genres first
      setShowGenreSuggestions(true);
      
      // If the child has expressed uncertainty multiple times, suggest random genres
      if (UncertaintyTracker.shouldShowRandomSuggestions()) {
        try {
          const randomRecommendations = await getRandomGenres(3, favoriteGenres);
          setRandomGenres(randomRecommendations);
          setShowRandomGenres(true);
        } catch (error) {
          console.error("Error getting random genres:", error);
        }
      } else {
        setShowRandomGenres(false);
      }
    } else {
      // Reset uncertainty counter for non-uncertainty questions
      UncertaintyTracker.reset();
      setShowGenreSuggestions(false);
      setShowRandomGenres(false);
    }
    
    await sendMessage(question);
  };

  const handleGenreClick = async (genre: string) => {
    // Reset uncertainty counter when a genre is selected
    UncertaintyTracker.reset();
    console.log("Uncertainty reset");
    
    setShowGenreSuggestions(false);
    setShowRandomGenres(false);
    await sendMessage(`Can you recommend books and videos about ${genre}?`);
  };

  const handleImageClick = (imageUrl: string) => {
    setEnlargedImage(imageUrl);
  };

  const closeModal = () => {
    setEnlargedImage(null);
  };

  // Parse the message content into React components
  const processMessage = (message: string): React.ReactNode => {
    if (!message) return null;
    
    // First, replace <br> tags with actual line breaks
    const textWithLineBreaks = message.replace(/<br>/g, '\n');
    
    // Split the message by ** markers or newlines
    const parts = textWithLineBreaks.split(/(\*\*.*?\*\*|\n)/g);
    
    // Map each part to either plain text, bold text, or a line break
    return (
      <>
        {parts.map((part, index) => {
          if (part === '\n') {
            // This is a line break
            return <br key={index} />;
          } else if (part.startsWith('**') && part.endsWith('**')) {
            // This is bold text - remove the ** markers and make it bold
            const boldText = part.slice(2, -2);
            return <strong key={index}>{boldText}</strong>;
          } else {
            // This is regular text
            return <span key={index}>{part}</span>;
          }
        })}
      </>
    );
  };

  const renderVideoContent = (contenturl: string, index: number) => {
    // For YouTube videos
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|\S+\/\S+\/|\S+\?v=|v\/|(?:watch\?v=))(\S+))|(?:youtu\.be\/(\S+))/;
    const matchYouTube = contenturl.match(youtubeRegex);
    
    if (matchYouTube) {
      const videoId = matchYouTube[1] || matchYouTube[2];
      // Extract the clean video ID (remove any additional parameters)
      const cleanVideoId = videoId?.split('&')[0] || '';
      
      return (
        <iframe
          ref={el => {iframeRefs.current[index] = el;}}
          width="100%"
          height="315"
          src={`https://www.youtube.com/embed/${cleanVideoId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    }
    
    // For all other video links
    return (
      <a 
        href={contenturl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-block bg-blue-500 text-white px-3 py-1 rounded"
      >
        View Video
      </a>
    );
  };
  
  const stopVideoPlayer = () => {
    Object.values(iframeRefs.current).forEach(iframe => {
      if (iframe && iframe.src) {
        const currentSrc = iframe.src;
        iframe.src = '';
        iframe.src = currentSrc;
      }
    });
  };

  const handleCloseChat = () => {
    stopVideoPlayer();
    stopAllSpeech();
    setIsChatOpen(false);
  };

  const handleCalendarToggle = () => {
    if (!isCalendarOpen) {
      setIsCalendarOpen(true);
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300); // Match transition duration
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setIsCalendarOpen(false);
        setIsTransitioning(false);
      }, 300); // Match transition duration
    }
  };

  // Function to render age badge with appropriate colors
  const renderAgeBadge = (minimumAge: number | null) => {
    if (minimumAge === null || minimumAge === undefined) return null;
    
    // Determine age bracket for styling (for range 2-8)
    let ageBracket = "2";
    if (minimumAge >= 7) {
      ageBracket = "7"; // Ages 7-8
    } else if (minimumAge >= 5) {
      ageBracket = "5"; // Ages 5-6
    } else if (minimumAge >= 3) {
      ageBracket = "3"; // Ages 3-4
    } else {
      ageBracket = "2"; // Age 2
    }
    return (
      <div className="age-badge" data-age={ageBracket}>
        Ages {minimumAge}+
      </div>
    );
  };

  return (
    <div className="chatbot-wrapper">
      {/* Show mascot to the left of the popup when open */}
      {isChatOpen && (
        <Image 
          src="/mascot.png" 
          alt="Mascot" 
          className="chatbot-mascot-image"
          width={160}
          height={160}
        />
      )}
      {/* Blur background when chatbot popup is open */}
      {isChatOpen && (
        <div className="chatbot-popup-backdrop visible" />
      )}
      <div className="flex flex-col items-end space-y-2">
        <div className="relative">
          <button onClick={handleCalendarToggle} className="calendar-button">
            <Image src="/calendar.png" alt="Calendar" width={40} height={40} className="object-contain" />
          </button>
          {pendingSchedules.length > 0 && !isChatOpen && (
            <span className="notification-badge">
              {pendingSchedules.length}
            </span>
          )}
        </div>
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="chatbot-button">
          <Image src="/mascot.png" alt="Chatbot" width={64} height={64} className="object-contain" />
        </button>
      </div>

      {isCalendarOpen && (
        <>
          <div 
            className={`calendar-popup-backdrop ${isTransitioning ? '' : 'visible'}`} 
            onClick={handleCalendarToggle} 
          />
          <div className={`calendar-popup ${isTransitioning ? '' : 'visible'}`}>
            <div className="calendar-popup-content">
              <ReadingCalendar onScheduleUpdate={() => {
                // Trigger a re-fetch of pending schedules
                const fetchPendingSchedules = async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const { data, error } = await supabase
                      .from('reading_schedules')
                      .select('*')
                      .eq('user_id', user.id)
                      .eq('status', 'pending');

                    if (error) throw error;

                    setPendingSchedules(data || []);
                  } catch (error) {
                    console.error('Error fetching pending schedules:', error);
                  }
                };

                fetchPendingSchedules();
              }} />
              <button 
                onClick={handleCalendarToggle} 
                className="close-button"
              >
                ✖
              </button>
            </div>
          </div>
        </>
      )}

      <div className={`chatbot-container ${isChatOpen ? 'visible' : 'hidden'}`}>
        <div className="chatbot-header">
          <h2 className="text-lg font-semibold">CoReadability Bot</h2>
          <button onClick={handleCloseChat} className="close-button">✖</button>
        </div>

        <div ref={chatContainerRef} className="chat-container">
          {/* Welcome message with the child's name */}
          {messages.length === 1 && userFullName && (
            <div className="welcome-message">
              <p>Hello {userFullName}! I&apos;m here to help you discover amazing books and videos.</p>
            </div>
          )}

          {/* Favorite Genres Section - Moved from top to appear with messages */}
          {/* Now incorporated into the message flow */}

          <div className="predefined-questions">
            <h3>Try asking:</h3>
            {["Can you recommend the latest books?", "Can you recommend the latest videos?", "I'm not sure what to look for", "Recommend other genres"].map((question, index) => (
              <button 
                key={index} 
                onClick={() => {
                  if (question === "Recommend other genres") {
                    // Handle the request for different genres
                    const getAndShowDifferentGenres = async () => {
                      try {
                        const differentGenres = await getRandomGenres(5, favoriteGenres);
                        setRandomGenres(differentGenres);
                        setShowRandomGenres(true);
                        setShowGenreSuggestions(false); // Hide favorite genres
                      } catch (error) {
                        console.error("Error getting different genres:", error);
                      }
                    };
                    getAndShowDifferentGenres();
                  }
                  handleQuestionClick(question);
                }} 
                className="question-button"
              >
                {question}
              </button>
            ))}
          </div>

          {messages.map((message, msgIndex) => (
            <div key={msgIndex} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
              <div className={message.role === 'user' ? 'user-message' : 'bot-message'}>
                {message.role === 'assistant' && Array.isArray(message.content) ? (
                  <ul>
                    {message.content.map((item, idx) => {
                      // Create a unique ID for this item
                      const itemId = `item-${msgIndex}-${idx}`;
                      const isSpeaking = speakingItemId === itemId;
                      
                      return (
                        <li key={idx} className="book-item">
                          <div className="content-header">
                            <strong>{item.title}</strong>
                            {/* Display age badge if minimumage exists */}
                            {item.minimumage !== undefined && renderAgeBadge(item.minimumage)}
                          </div>
                          <div className="content-description">
                            {item.description}
                          </div>
                          <br />
                          {item.coverimage && item.cfid !== 1 && (
                            <Image
                              src={item.coverimage}
                              alt={`Cover of ${item.title}`}
                              width={100}
                              height={150}
                              className="book-cover-image"
                              onClick={() => handleImageClick(item.coverimage)}
                            />
                          )}

                          <AudioButton 
                            title={item.title}
                            description={item.description}
                            itemId={itemId}
                            isSpeaking={isSpeaking}
                            isPaused={isPaused}
                            onToggle={toggleSpeech}
                          />
                          
                          <div className="content-actions">
                            {item.cfid === 1 ? (
                              renderVideoContent(item.contenturl, msgIndex * 100 + idx)
                            ) : (
                              <>
                                <a
                                  href={item.contenturl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="chatbot-button-style view-book-link"
                                >
                                  View Book
                                </a>
                                {item.cid && item.cid !== 0 ? (
                                  <a
                                    href={`/bookdetail/${item.cid}`}
                                    className="chatbot-button-style view-details-link"
                                  >
                                    View Details
                                  </a>
                                ) : (
                                  <span>Details unavailable</span>
                                )}
                              </>
                            )}

                            {/* For Videos, Add Video Detail Button */}
                            {item.cfid === 1 && item.cid ? (
                              <a
                                href={`/videodetail/${item.cid}`}
                                className="inline-block bg-emerald-500 text-white px-3 py-1 rounded"
                              >
                                View Video Details
                              </a>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div>
                    {typeof message.content === "string" ? processMessage(message.content) : ""}

                    {/* Show favorite genres right after the bot message that triggered uncertainty */}
                    {showGenreSuggestions && 
                     message.role === 'assistant' && 
                     msgIndex === messages.length - 1 && 
                     favoriteGenres.length > 0 && (
                      <div className="favorite-genres-section in-message">
                        <h3>Here are some topics you might like:</h3>
                        <div className="favorite-genres-buttons">
                          {favoriteGenres.map((genre, index) => (
                            <button 
                              key={`fav-${index}`} 
                              onClick={() => handleGenreClick(genre)} 
                              className="genre-button"
                            >
                              {genre}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show random genre suggestions if child continues to express uncertainty or explicitly asks for them */}
                    {showRandomGenres && 
                     message.role === 'assistant' && 
                     msgIndex === messages.length - 1 && 
                     randomGenres.length > 0 && (
                      <div className="random-genres-section in-message">
                        <h3>{detectNewGenresRequest(message.content as string) ? 
                          "Here are some different genres you might like:" : 
                          "Or maybe try something new?"}</h3>
                        <div className="random-genres-buttons">
                          {randomGenres.map((genre, index) => (
                            <button 
                              key={`random-${index}`} 
                              onClick={() => handleGenreClick(genre)} 
                              className="genre-button random"
                            >
                              {genre}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && <div className="bot-message dots">Thinking</div>}
        </div>

        <form onSubmit={handleSubmit} className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for book recommendations..."
            className="input-field"
          />
          <button type="submit" disabled={isLoading} className="send-button">
            <Send size={20} />
          </button>
        </form>
      </div>

      {enlargedImage && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <Image 
              src={enlargedImage} 
              alt="Enlarged" 
              className="enlarged-image"
              width={600}
              height={900}
            />
            <button className="close-modal" onClick={closeModal}>✖</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;