import React, { useState } from 'react';
import HelpChatModal from './HelpChatModal';

const HelpButton: React.FC = () => {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const handleHelpClick = () => {
    console.log('Opening help modal...');
    setIsHelpModalOpen(true);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleHelpClick}
          onMouseEnter={() => setIsTooltipVisible(true)}
          onMouseLeave={() => setIsTooltipVisible(false)}
          className="fixed bottom-4 right-4 z-[9999] bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-full shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-110 border-2 border-white"
          title="Manual de Usuario"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </button>

        {/* Tooltip */}
        {isTooltipVisible && (
          <div className="fixed bottom-16 right-4 z-[9999] bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <div className="flex items-center space-x-2">
              <span>📘</span>
              <span>Manual de Usuario</span>
            </div>
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-800 transform rotate-45"></div>
          </div>
        )}
      </div>

      <HelpChatModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)} 
      />
    </>
  );
};

export default HelpButton;