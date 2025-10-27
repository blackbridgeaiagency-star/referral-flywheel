// components/dashboard/EarningsChartSkeleton.tsx

export function EarningsChartSkeleton() {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 animate-pulse">
      <div className="mb-6">
        <div className="h-6 bg-gray-800 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-800 rounded w-64"></div>
      </div>

      <div className="h-[300px] flex flex-col justify-between">
        {/* Simulated chart bars */}
        <div className="flex items-end justify-between h-full gap-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="bg-purple-900/20 rounded-t flex-1"
              style={{
                height: `${Math.random() * 80 + 20}%`,
                animation: `pulse ${1 + Math.random()}s ease-in-out infinite`
              }}
            />
          ))}
        </div>

        {/* Simulated X-axis */}
        <div className="flex justify-between mt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-800 rounded w-12"></div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="h-4 bg-gray-800 rounded w-32"></div>
        <div className="h-4 bg-gray-800 rounded w-24"></div>
      </div>
    </div>
  );
}
