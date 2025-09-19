// app/components/DateRangePicker.tsx
'use client';

import { useState } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  className?: string;
}

export default function DateRangePicker({ startDate, endDate, onDateChange, className = '' }: DateRangePickerProps) {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  const handleApply = () => {
    onDateChange(start, end);
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow-md ${className}`}>
      <h3 className="font-medium text-gray-700 mb-3">Select Date Range</h3>
      <div className="flex flex-col space-y-3">
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id="start-date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            id="end-date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <button
          onClick={handleApply}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Apply Dates
        </button>
      </div>
    </div>
  );
}