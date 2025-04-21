import React, { useState, useEffect, useRef } from 'react';
import { useChatbot } from '@/hooks/useChatbot';
import { useSpeech } from '@/hooks/useTextToSpeech';
import { Send, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import AudioButton from './child/chatbot/audioButton';
import './styles.css';


const ChatBot: React.FC = () => {
  const { messages, isLoading, sendMessage } = useChatbot();
  const { speakingItemId, isPaused, toggleSpeech, stopAllSpeech } = useSpeech();
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRefs = useRef<{ [key: number]: HTMLIFrameElement | null }>({});

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    await sendMessage(userMessage);
  };

  const handleQuestionClick = async (question: string) => {
    await sendMessage(question);
  };

  const handleImageClick = (imageUrl: string) => {
    setEnlargedImage(imageUrl);
  };

  const closeModal = () => {
    setEnlargedImage(null);
  };

  const renderVideoContent = (contenturl: string, index: number) => {
    if (contenturl.includes("<iframe")) {
      return <div dangerouslySetInnerHTML={{ __html: contenturl }} />;
    }

    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|\S+\/\S+\/|\S+\?v=|v\/|(?:watch\?v=))(\S+))|(?:youtu\.be\/(\S+))/;
    const matchYouTube = contenturl.match(youtubeRegex);
    if (matchYouTube) {
      const videoId = matchYouTube[1] || matchYouTube[2];
      return (
        <iframe
          ref={el => {iframeRefs.current[index] = el;}}
          width="100%"
          height="315"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    }

    return <a href={contenturl} target="_blank" rel="noopener noreferrer">View Video</a>;
  };

  const processMessage = (message: string) => {
    // Replace double asterisks with <b> tags
    return message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
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
    setIsOpen(false);
  };

  return (
    <div className="chatbot-wrapper">
      <button onClick={() => setIsOpen(!isOpen)} className="chatbot-button">
        <MessageCircle size={28} />
      </button>

      <div className={`chatbot-container ${isOpen ? 'visible' : 'hidden'}`}>
        <div className="chatbot-header">
          <h2 className="text-lg font-semibold">CoReadability Bot</h2>
          <button onClick={handleCloseChat} className="close-button">✖</button>
        </div>

        <div ref={chatContainerRef} className="chat-container">
          <div className="predefined-questions">
            <h3>Try asking:</h3>
            {["Can you recommend the latest books?", "Can you recommend the latest videos?"].map((question, index) => (
              <button key={index} onClick={() => handleQuestionClick(question)} className="question-button">
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
                          <strong>{item.title}</strong> - {item.description}
                          <br />
                          {item.coverimage && item.cfid !== 1 && (
                            <Image
                              src={item.coverimage}
                              alt={`Cover of ${item.title}`}
                              width="100"
                              height={150}
                              style={{ borderRadius: '8px', marginTop: '5px', cursor: 'pointer' }}
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
                          
                          <div style={{ marginTop: '8px' }}>
                            {item.cfid === 1 ? (
                              renderVideoContent(item.contenturl, msgIndex * 100 + idx)
                            ) : (
                              <>
                                <a
                                  href={item.contenturl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block mr-2 bg-blue-500 text-white px-3 py-1 rounded"
                                >
                                  View Book
                                </a>
                                {item.cid && item.cid !== 0 ? (
                                  <a
                                    href={`/bookdetail/${item.cid}`}
                                    className="inline-block bg-emerald-500 text-white px-3 py-1 rounded"
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
                  <div dangerouslySetInnerHTML={{ __html: typeof message.content === "string" ? processMessage(message.content) : "" }} />
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