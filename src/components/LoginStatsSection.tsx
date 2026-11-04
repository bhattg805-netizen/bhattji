import React from 'react';

export interface StatItem {
  id: string;
  value: string | number;
  label: string;
}

interface LoginStatsSectionProps {
  stats?: {
    ordersDelivered?: string | number;
    registeredUsers?: string | number;
    activeServices?: string | number;
    ordersToday?: string | number;
  };
}

export const LoginStatsSection: React.FC<LoginStatsSectionProps> = ({ stats }) => {
  const statItems: StatItem[] = [
    {
      id: 'orders-delivered',
      value: stats?.ordersDelivered ?? '25,000',
      label: 'Orders delivered',
    },
    {
      id: 'registered-users',
      value: stats?.registeredUsers ?? '10,000',
      label: 'Registered users',
    },
    {
      id: 'active-services',
      value: stats?.activeServices ?? '2,487',
      label: 'Active services',
    },
    {
      id: 'orders-today',
      value: stats?.ordersToday ?? '1,188',
      label: 'Orders today',
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-10 mb-8 sm:mb-12">
      {/* Container Card with soft shadow and sleek borders */}
      <div className="bg-[#FFFDF9]/95 backdrop-blur-sm border border-[#EAE3D2] rounded-2xl sm:rounded-3xl shadow-[0_10px_35px_-8px_rgba(160,140,110,0.1)] overflow-hidden transition-all duration-300 hover:shadow-[0_16px_40px_-8px_rgba(160,140,110,0.15)]">
        {/* Responsive Grid: 2x2 on Mobile, 4x1 on Desktop with thin divider lines */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-[#EAE3D2] sm:divide-x sm:divide-[#EAE3D2]">
          {statItems.map((item, index) => (
            <div
              key={item.id}
              className={`flex flex-col items-center justify-center p-5 sm:p-7 md:p-8 text-center transition-colors duration-200 hover:bg-[#FAF7EE]/50 ${
                /* Add right border on mobile for item 0 and 2 to create a clean 2x2 grid */
                index % 2 === 0 ? 'border-r border-[#EAE3D2] lg:border-r-0' : ''
              }`}
            >
              {/* Large Bold Number */}
              <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 font-display tracking-tight leading-none mb-1.5 sm:mb-2">
                {item.value}
              </span>
              {/* Smaller Stone Label */}
              <span className="text-xs sm:text-sm font-medium text-stone-500 tracking-normal">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
