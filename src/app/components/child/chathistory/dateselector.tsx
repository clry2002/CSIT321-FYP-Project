import React from 'react';
import { ChatMessage } from '../../../../types/database.types';

interface DateSelectorProps {
  groupedMessages: { date: string; messages: ChatMessage[] }[];
  selectedDate: string;
  formatDate: (dateString: string) => string;
  onDateSelect: (date: string) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({
  groupedMessages,
  selectedDate,
  formatDate,
  onDateSelect
}) => {
  return (
    <div className="mb-4">
      <h3 className="text-md font-medium text-gray-700 mb-2">Select Date:</h3>
      <div className="relative inline-block w-full md:w-64 text-gray-700">
        <select
          className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
          value={selectedDate}
          onChange={(e) => onDateSelect(e.target.value)}
        >
          <option value="" disabled>Select a date</option>
          {groupedMessages.map((group, index) => (
            <option key={`date-option-${index}`} value={group.date}>
              {formatDate(group.date)}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DateSelector;