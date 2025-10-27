'use client';

import { useState, useEffect } from 'react';
import { EarningsChart } from './EarningsChart';

interface EarningsChartWrapperProps {
  memberId: string;
  initialData: Array<{
    date: string;
    earnings: number;
    count: number;
  }>;
}

type DateRange = '7' | '30' | '90' | 'year' | 'custom';

export function EarningsChartWrapper({ memberId, initialData }: EarningsChartWrapperProps) {
  const [data, setData] = useState(initialData);
  const [timeRange, setTimeRange] = useState<DateRange>('30');
  const [isLoading, setIsLoading] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Fetch data when time range changes
  useEffect(() => {
    // Skip if custom range is selected but dates aren't set yet
    if (timeRange === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        let url = `/api/earnings/history?memberId=${memberId}&range=${timeRange}`;

        if (timeRange === 'custom') {
          url += `&start=${customStartDate}&end=${customEndDate}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const newData = await response.json();
          setData(newData);
        } else {
          console.error('Failed to fetch earnings data:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching earnings data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [timeRange, customStartDate, customEndDate, memberId]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 text-white">
            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      )}
      <EarningsChart
        data={data}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
      />
    </div>
  );
}
