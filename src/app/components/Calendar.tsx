interface CalendarDay {
  date: number;
  dayOfWeek: string;
  isCurrentDay: boolean;
}

interface CalendarProps {
  currentMonth: string;
  days: CalendarDay[];
}

const Calendar: React.FC<CalendarProps> = ({ currentMonth, days }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-black">{currentMonth}</h3>
        <div className="flex space-x-2">
          <button className="p-1 hover:bg-gray-100 rounded">←</button>
          <button className="p-1 hover:bg-gray-100 rounded">→</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div
            key={index}
            className={`p-2 text-center rounded-lg ${
              day.isCurrentDay
                ? 'bg-gray-900 text-white'
                : 'hover:bg-gray-100 text-black'
            }`}
          >
            <div className="text-xs mb-1">{day.dayOfWeek}</div>
            <div className="font-medium">{day.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar; 