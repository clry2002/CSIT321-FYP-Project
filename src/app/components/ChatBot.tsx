import React, { useState, useEffect, useRef } from 'react';
import { useChatbot } from '@/hooks/useChatbot';
import { Send, MessageCircle } from 'lucide-react';
import './styles.css';

const ChatBot: React.FC = () => {
  const { messages, isLoading, sendMessage } = useChatbot();
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null); // State to track the enlarged image
  const chatContainerRef = useRef<HTMLDivElement | null>(null);


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

  // Function to handle clicking on a book cover image
  const handleImageClick = (imageUrl: string) => {
    setEnlargedImage(imageUrl); // Set the clicked image URL to be displayed in the modal
  };

  // Function to close the enlarged image modal
  const closeModal = () => {
    setEnlargedImage(null); // Close the modal by setting it to null
  };

  // Function to check and render iframe if contenturl is an iframe or regular video URL
  const renderVideoContent = (contenturl: string) => {
    // Check if contenturl already contains iframe tag
    if (contenturl.includes("<iframe")) {
      return <div dangerouslySetInnerHTML={{ __html: contenturl }} />;
    } 

    // For YouTube (if it's a regular YouTube URL, convert it to embed)
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|\S+\/\S+\/|\S+\?v=|v\/|(?:watch\?v=))(\S+))|(?:youtu\.be\/(\S+))/;
    const matchYouTube = contenturl.match(youtubeRegex);
    if (matchYouTube) {
      const videoId = matchYouTube[1] || matchYouTube[2];
      return (
        <iframe
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

    // If it's not an iframe or YouTube, return as a link or other handling
    return <a href={contenturl} target="_blank" rel="noopener noreferrer">View Video</a>;
  };
  

  return (
    <div className="chatbot-wrapper">
      {/* Floating Button to Open Chatbot */}
      <button onClick={() => setIsOpen(!isOpen)} className="chatbot-button">
        <MessageCircle size={28} />
      </button>

      {/* Chatbot Panel */}
      <div className={`chatbot-container ${isOpen ? 'visible' : 'hidden'}`}>
        <div className="chatbot-header">
          <h2 className="text-lg font-semibold">CoReadability Bot</h2>
          <button onClick={() => setIsOpen(false)} className="close-button">✖</button>
        </div>

        <div ref={chatContainerRef} className="chat-container">
          <div className="predefined-questions">
            <h3>Try asking:</h3>
            {["Can you recommend the latest books?", "Can you recommend the latest videos?"].map((question, index) => (
              <button key={`question-${index}`} onClick={() => handleQuestionClick(question)} className="question-button">
                {question}
              </button>
            ))}
          </div>

          {messages.map((message, index) => (
            <div key={`message-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
              <div className={message.role === 'user' ? 'user-message' : 'bot-message'}>
                {message.role === 'assistant' && Array.isArray(message.content) ? (
                  <ul>
                    {message.content.map((item, idx) => (
                      <li key={idx} className="book-item">
                        <strong>{item.title}</strong> - {item.description}
                        <br />
                        {/* Render the cover image if available */}
                        {item.coverimage && (
                          <img
                            src={item.coverimage}
                            alt={`Cover of ${item.title}`}
                            width="100"
                            style={{ borderRadius: '8px', marginTop: '5px', cursor: 'pointer' }}
                            onClick={() => handleImageClick(item.coverimage)} // Trigger image click
                          />
                        )}

                        {/* Render video content */}
                        {renderVideoContent(item.contenturl)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: typeof message.content === "string" ? message.content : "" }} />
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

      {/* Modal for enlarging the image */}
      {enlargedImage && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={enlargedImage}
              alt="Enlarged"
              className="enlarged-image"
            />
            <button className="close-modal" onClick={closeModal}>✖</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
