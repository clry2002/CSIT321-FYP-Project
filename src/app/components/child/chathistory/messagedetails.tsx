import { ChatMessage } from '../../../../types/database.types';
import { UseRecommendationExtractor } from './utils';

interface MessageDisplayProps {
  message: ChatMessage;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
  const extractRecommendations = UseRecommendationExtractor();

  return (
    <div
      className={`max-w-[80%] p-4 rounded-lg shadow-md ${
        message.ischatbot
          ? 'bg-gray-200 text-gray-900 self-start'
          : 'bg-rose-500 text-white self-end'
      }`}
    >
      {message.ischatbot ? (
        <div className="break-words">
          {extractRecommendations(message.context)}
        </div>
      ) : (
        <p className="mb-1 break-words whitespace-pre-wrap">
          {message.context}
        </p>
      )}
      <span className="text-xs text-gray-600 block text-right">
        {new Date(message.createddate + 'Z').toLocaleString('en-US', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: "Asia/Singapore", // SG timezone
        })}
      </span>
    </div>
  );
};

export default MessageDisplay;