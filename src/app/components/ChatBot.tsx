import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChatbot } from '@/hooks/useChatbot';
import { useSpeech } from '@/hooks/useTextToSpeech';
import { Sparkles, Send } from 'lucide-react';
import Image from 'next/image';
import ReadingCalendar from './ReadingCalendar';
import './styles.css';

// Import custom hooks
import useFavoriteGenres from '../../hooks/chatbot/useFavoriteGenres';
import usePendingSchedules from '../../hooks/chatbot/usePendingSchedules';
import useGenreRecommendations from '../../hooks/chatbot/useGenreRecommendations';
import useChatModals from '../../hooks/chatbot/useChatModals';

// Import chatbot related components
import MessageRenderer from './child/chatbot/MessageRenderer';
import GenreSuggestions from './child/chatbot/GenreSuggestions';
import ContentItem from './child/chatbot/ContentItem';

// Add type for handle direction
const HANDLE_DIRECTIONS = [
  'top', 'left',
  'top-left'
] as const;
type HandleDirection = typeof HANDLE_DIRECTIONS[number];


const ChatBot: React.FC = () => {
  const { messages, isLoading, sendMessage, sendSurpriseRequest } = useChatbot();
  const { speakingItemId, isPaused, toggleSpeech, stopAllSpeech } = useSpeech();
  const { favoriteGenres } = useFavoriteGenres();
  const { 
    pendingSchedules, 
    refreshPendingSchedules 
  } = usePendingSchedules();
  const {
    showGenreSuggestions,
    randomGenres,
    showRandomGenres,
    processUserMessage,
    processQuestion,
    processBotMessage,
    handleRequestDifferentGenres,
    handleGenreSelected
  } = useGenreRecommendations({ favoriteGenres });
  const {
    isChatOpen,
    isCalendarOpen,
    isTransitioning,
    enlargedImage,
    toggleChat,
    closeChat,
    toggleCalendar,
    showEnlargedImage,
    closeEnlargedImage,
    addIframeRef
  } = useChatModals();

  // State for input field
  const [input, setInput] = React.useState('');

  const [isLoadingSurprise, setIsLoadingSurprise] = useState(false);
  const [showSurpriseAnimation, setShowSurpriseAnimation] = useState(false);
  
  // State for mascot hover effect
  const [isMascotHovered, setIsMascotHovered] = useState(false);
  
  // Ref for chat container scrolling
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef(false);
  const [dimensions, setDimensions] = useState(() => {
    // Try to load saved dimensions from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatbotDimensions');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing saved dimensions:', e);
        }
      }
    }
    return { width: 800, height: 600 };
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<HandleDirection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startDimRef = useRef({ width: 0, height: 0, left: 0, top: 0 });

  // Add state for reading schedule modal and selected book
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleBook, setScheduleBook] = useState<{ cid: number; title: string } | null>(null);

  // Save dimensions to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatbotDimensions', JSON.stringify(dimensions));
    }
  }, [dimensions]);

  // Custom smooth scroll function with longer duration
  const smoothScrollToBottom = (element: HTMLDivElement) => {
    const targetPosition = element.scrollHeight;
    const startPosition = element.scrollTop;
    const distance = targetPosition - startPosition;
    const duration = 8000; // 8 seconds duration
    let startTime: number | null = null;
    isUserScrollingRef.current = false;

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      if (!isUserScrollingRef.current) {
        element.scrollTop = startPosition + distance * easeInOutCubic(progress);
      }

      if (timeElapsed < duration && !isUserScrollingRef.current) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  // Add scroll event listener to detect user scrolling
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      isUserScrollingRef.current = true;
    };

    chatContainer.addEventListener('wheel', handleScroll);
    chatContainer.addEventListener('touchmove', handleScroll);

    return () => {
      chatContainer.removeEventListener('wheel', handleScroll);
      chatContainer.removeEventListener('touchmove', handleScroll);
    };
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      const lastMessage = messages[messages.length - 1];
      
      // Always scroll for user messages
      if (lastMessage && lastMessage.role === 'user') {
        smoothScrollToBottom(chatContainerRef.current);
        return;
      }

      // For assistant messages
      if (lastMessage && lastMessage.role === 'assistant') {
        // Check if it's a recommendation
        const isRecommendation = Array.isArray(lastMessage.content);
        
        // For the first message or non-recommendation messages, scroll
        if (messages.length === 1 || !isRecommendation) {
          // Add a small delay to ensure content is rendered
          setTimeout(() => {
            if (chatContainerRef.current) {
              smoothScrollToBottom(chatContainerRef.current);
            }
          }, 100);
        }
      }
    }
  }, [messages]);

  // Add a separate effect to handle loading state
  useEffect(() => {
    if (!isLoading && chatContainerRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        // Scroll after loading is complete
        setTimeout(() => {
          if (chatContainerRef.current) {
            smoothScrollToBottom(chatContainerRef.current);
          }
        }, 100);
      }
    }
  }, [isLoading, messages]);
  
  // Effect to monitor for bot responses that might indicate uncertainty
  useEffect(() => {
    // Only check the most recent bot message
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.role === 'assistant' && typeof lastMessage.content === 'string') {
      processBotMessage(lastMessage.content);
    }
  }, [messages, processBotMessage]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Process message for genre recommendations
    await processUserMessage(userMessage);
    
    // Send the message to the chatbot
    await sendMessage(userMessage);
  };

  // Handle predefined question click
  const handleQuestionClick = async (question: string) => {
    // Handle special case for "Recommend other genres"
    if (question === "Recommend other genres") {
      await handleRequestDifferentGenres();
    }
    
    // Process question for genre recommendations
    await processQuestion(question);
    
    // Send the question to the chatbot
    await sendMessage(question);
  };

  // Handle genre button click
  const handleGenreClick = async (genre: string) => {
    // Reset genre suggestions
    handleGenreSelected();
    
    // Send the genre recommendation request
    await sendMessage(`Can you recommend books and videos about ${genre}?`);
  };

  // Handle closing the chat
  const handleCloseChat = () => {
    closeChat(stopAllSpeech);
  };

  // Handle the "Surprise Me!" button click
  const handleSurpriseMe = async () => {
    if (isLoadingSurprise || isLoading) return;
    
    setIsLoadingSurprise(true);
    setShowSurpriseAnimation(true);
    
    try {
      // Start surprise animation
      setTimeout(() => {
        setShowSurpriseAnimation(false);
      }, 2500); // Animation duration
      
      // Call sendSurpriseRequest function from your useChatbot hook
      await sendSurpriseRequest();
    } catch (error) {
      console.error('Error getting surprise content:', error);
    } finally {
      setIsLoadingSurprise(false);
    }
  };

  // Using useCallback to fix the dependency warning for handleResizeMove
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeDirection) return;
    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    let newWidth = startDimRef.current.width;
    let newHeight = startDimRef.current.height;

    switch (resizeDirection) {
      case 'left':
        newWidth = Math.max(400, startDimRef.current.width - deltaX);
        break;
      case 'top':
        newHeight = Math.max(300, startDimRef.current.height - deltaY);
        break;
      case 'top-left':
        newWidth = Math.max(400, startDimRef.current.width - deltaX);
        newHeight = Math.max(300, startDimRef.current.height - deltaY);
        break;
    }
    setDimensions({ width: newWidth, height: newHeight });
  }, [isResizing, resizeDirection]);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, direction: HandleDirection) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeDirection(direction);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    const rect = containerRef.current?.getBoundingClientRect();
    startDimRef.current = {
      width: dimensions.width,
      height: dimensions.height,
      left: rect?.left || 0,
      top: rect?.top || 0
    };
  };

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeDirection(null);
  }, []);

  // Add and remove resize event listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, resizeDirection, handleResizeMove, handleResizeEnd]);

  // Handle mascot click
  const handleMascotClick = () => {
    if (isChatOpen) {
      handleCloseChat();
    } else {
      toggleChat();
    }
  };

  // Callback to open schedule modal with book
  const handleAddToSchedule = (book: { cid: number; title: string }) => {
    setScheduleBook(book);
    setIsScheduleModalOpen(true);
  };

  return (
    <div className="chatbot-wrapper">
      {/* Show mascot to the left of the popup when open */}
      {isChatOpen && (
        <div 
          className="mascot-container"
          onMouseEnter={() => setIsMascotHovered(true)}
          onMouseLeave={() => setIsMascotHovered(false)}
        >
          <Image 
            src="/mascotnew.png" 
            alt="Mascot" 
            className={`chatbot-mascot-image ${isMascotHovered ? 'mascot-wobble' : ''}`}
            width={160}
            height={160}
            onClick={handleMascotClick}
            style={{ cursor: 'pointer' }}
            unoptimized
          />
          {isMascotHovered && (
            <div className="mascot-speech-bubble">
              <p>Click me to close the chat!</p>
            </div>
          )}
        </div>
      )}
      
      {/* Blur background when chatbot popup is open */}
      {isChatOpen && (
        <div className="chatbot-popup-backdrop visible" />
      )}
      
      <div className="flex flex-col items-end space-y-2">
        <div className="relative">
          <button onClick={toggleCalendar} className="calendar-button">
            <Image src="/calendar.png" alt="Calendar" width={40} height={40} className="object-contain" unoptimized/>
          </button>
          {pendingSchedules.length > 0 && !isChatOpen && (
            <span className="notification-badge">
              {pendingSchedules.length}
            </span>
          )}
        </div>
        <div 
          className="mascot-button-container"
          onMouseEnter={() => setIsMascotHovered(true)}
          onMouseLeave={() => setIsMascotHovered(false)}
        >
          <button 
            onClick={handleMascotClick} 
            className={`chatbot-button ${isMascotHovered ? 'mascot-bounce' : ''}`}
          >
            <Image 
              src="/mascotnew.png" 
              alt="Chatbot" 
              width={64} 
              height={64} 
              className="object-contain" 
              unoptimized 
            />
          </button>
          {isMascotHovered && !isChatOpen && (
            <div className="mascot-tooltip">
              <p>Click me to chat!</p>
              <div className="tooltip-arrow"></div>
            </div>
          )}
        </div>
      </div>

      {isCalendarOpen && (
        <>
          <div 
            className={`calendar-popup-backdrop ${isTransitioning ? '' : 'visible'}`} 
            onClick={toggleCalendar} 
          />
          <div className={`calendar-popup ${isTransitioning ? '' : 'visible'}`}>
            <div className="calendar-popup-content">
              <ReadingCalendar onScheduleUpdate={refreshPendingSchedules} />
              <button 
                onClick={toggleCalendar} 
                className="close-button"
              >
                ✖
              </button>
            </div>
          </div>
        </>
      )}

      <div 
        className={`chatbot-container ${isChatOpen ? 'visible' : 'hidden'} ${isResizing ? 'resizing' : ''}`}
        ref={containerRef}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <div className="chatbot-header">
          <h2 className="text-lg font-semibold">CoReadability Bot</h2>
          <button onClick={handleCloseChat} className="close-button">✖</button>
        </div>

        <div ref={chatContainerRef} className="chat-container">

          {/* Predefined questions */}
          <div className="predefined-questions">
            <h3>Try asking:</h3>
            {[
              "Show me popular content",
              "What's trending now?", 
              "Recommend books for me",
              "Explore different genres",
              "I'm not sure what to look for", 
              "Recommend other genres"
            ].map((question, index) => (
              <button 
                key={index} 
                onClick={() => handleQuestionClick(question)} 
                className="question-button"
              >
                {question}
              </button>
            ))}
          </div>

          {/* Add surprise animation overlay */}
          {showSurpriseAnimation && (
            <div className="surprise-animation-overlay">
              <div className="surprise-animation">
                <Sparkles size={48} color="#FFD700" />
                <h2>Finding a magical surprise for you!</h2>
              </div>
            </div>
          )}

          {messages.map((message, msgIndex) => (
            <div key={msgIndex} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
              <div className={message.role === 'user' ? 'user-message' : 'bot-message'}>
                {message.role === 'assistant' && Array.isArray(message.content) ? (
                  <ul>
                    {message.content.map((item, idx) => {
                      // Create a unique ID for this item
                      const itemId = `item-${msgIndex}-${idx}`;
                      const index = msgIndex * 100 + idx;
                      
                      // Check if this is from a surprise request
                      const isSurpriseItem = (
                      // Either check previous message for surprise phrases
                      (message.content.length === 1 && 
                        messages[msgIndex - 1]?.content && (
                        messages[msgIndex - 1]?.content?.toString().includes("Surprise!") || 
                         messages[msgIndex - 1]?.content?.toString().includes("Ta-da!") || 
                         messages[msgIndex - 1]?.content?.toString().includes("Magic time!") )
                        ) || 
                        // OR check for explicit theme property 
                        item.theme === 'surprise'
                      );
                      
                      return (
                        <ContentItem
                          key={idx}
                          item={item}
                          itemId={itemId}
                          speakingItemId={speakingItemId || ''}
                          isPaused={isPaused}
                          toggleSpeech={toggleSpeech}
                          handleImageClick={showEnlargedImage}
                          index={index}
                          addIframeRef={addIframeRef}
                          onAddToSchedule={item.cid && item.title ? () => handleAddToSchedule({ cid: item.cid, title: item.title }) : undefined}
                          isSurprise={isSurpriseItem} // Pass the surprise flag
                        />
                      );
                    })}
                  </ul>
                ) : (
                  <div>
                    {/* Render text message with clickable genres */}
                    {typeof message.content === "string" && (
                      <MessageRenderer 
                        message={message.content} 
                        onGenreClick={message.role === 'assistant' ? handleGenreClick : undefined} 
                      />
                    )}

                    {/* Only show genre suggestions after the latest bot message */}
                    {message.role === 'assistant' && msgIndex === messages.length - 1 && (
                      <GenreSuggestions
                        showGenreSuggestions={showGenreSuggestions}
                        favoriteGenres={favoriteGenres}
                        showRandomGenres={showRandomGenres}
                        randomGenres={randomGenres}
                        messageContent={typeof message.content === 'string' ? message.content : ''}
                        handleGenreClick={handleGenreClick}
                      />
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
            placeholder="✨ What awesome books or videos do you want to discover? ✨"
            className="input-field"
          />
          <button 
            type="button" 
            onClick={handleSurpriseMe} 
            disabled={isLoadingSurprise || isLoading}
            className="surprise-button"
            aria-label="Get a surprise recommendation"
          >
            <Sparkles size={18} />
            <span>Surprise Me!</span>
          </button>
          <button type="submit" disabled={isLoading} className="send-button">
            <Send size={20} />
          </button>
        </form>

        {HANDLE_DIRECTIONS.map((dir) => (
          <div
            key={dir}
            className={`resize-handle resize-handle-${dir}`}
            onMouseDown={(e) => handleResizeStart(e, dir)}
          />
        ))}

        {isScheduleModalOpen && (
          <div className="chatbot-modal-overlay" onClick={() => setIsScheduleModalOpen(false)}>
            <div className="chatbot-modal-content" onClick={(e) => e.stopPropagation()}>
              <ReadingCalendar 
                onScheduleUpdate={refreshPendingSchedules}
                selectedBook={scheduleBook || undefined}
                onClose={() => setIsScheduleModalOpen(false)}
                isChatbot={true}
              />
              <button className="close-modal" onClick={() => setIsScheduleModalOpen(false)}>✖</button>
            </div>
          </div>
        )}
      </div>

      {enlargedImage && (
        <div className="modal-overlay" onClick={closeEnlargedImage}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <Image 
              src={enlargedImage} 
              alt="Enlarged" 
              className="enlarged-image"
              width={600}
              height={900}
              unoptimized
            />
            <button className="close-modal" onClick={closeEnlargedImage}>✖</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;