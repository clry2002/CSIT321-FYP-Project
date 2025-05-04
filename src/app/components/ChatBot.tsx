import React, { useEffect, useRef } from 'react';
import { useChatbot } from '@/hooks/useChatbot';
import { useSpeech } from '@/hooks/useTextToSpeech';
import { Send } from 'lucide-react';
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

const ChatBot: React.FC = () => {
  const { messages, isLoading, sendMessage, userFullName } = useChatbot();
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
  
  // Ref for chat container scrolling
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

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
          <button onClick={toggleCalendar} className="calendar-button">
            <Image src="/calendar.png" alt="Calendar" width={40} height={40} className="object-contain" />
          </button>
          {pendingSchedules.length > 0 && !isChatOpen && (
            <span className="notification-badge">
              {pendingSchedules.length}
            </span>
          )}
        </div>
        <button onClick={toggleChat} className="chatbot-button">
          <Image src="/mascot.png" alt="Chatbot" width={64} height={64} className="object-contain" />
        </button>
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

          {/* Predefined questions */}
          <div className="predefined-questions">
            <h3>Try asking:</h3>
            {["Can you recommend the latest books?", "Can you recommend the latest videos?", "I'm not sure what to look for", "Recommend other genres"].map((question, index) => (
              <button 
                key={index} 
                onClick={() => handleQuestionClick(question)} 
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
                      const index = msgIndex * 100 + idx;
                      
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
                        />
                      );
                    })}
                  </ul>
                ) : (
                  <div>
                    {/* Render text message */}
                    {typeof message.content === "string" && (
                      <MessageRenderer message={message.content} />
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
            placeholder="Ask for book recommendations..."
            className="input-field"
          />
          <button type="submit" disabled={isLoading} className="send-button">
            <Send size={20} />
          </button>
        </form>
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
            />
            <button className="close-modal" onClick={closeEnlargedImage}>✖</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;