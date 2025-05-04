import React from 'react';

interface MessageRendererProps {
  message: string;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ message }) => {
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

export default MessageRenderer;