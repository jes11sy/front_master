import React from 'react'

interface NetworkErrorProps {
  onRetry: () => void
  isDark: boolean
  title?: string
  message?: string
  buttonText?: string
}

export function NetworkError({
  onRetry,
  isDark,
  title = 'Похоже, нет интернета',
  message = 'Проверьте подключение к Wi-Fi или мобильному интернету',
  buttonText = 'Обновить'
}: NetworkErrorProps) {
  return (
    <div className="my-16 flex animate-fade-in flex-col items-center justify-center px-4 text-center">
      <div className={`mb-6 ${isDark ? 'text-gray-500' : 'text-[#8e8e93]'}`}>
        <svg className="h-[56px] w-[56px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="10" r="2" />
          <path d="M12 12v9" />
          <path d="M7 6a6 6 0 0 0 0 8" />
          <path d="M17 6a6 6 0 0 1 0 8" />
        </svg>
      </div>
      <h3 className={`mb-3 text-[22px] font-bold tracking-tight ${isDark ? 'text-gray-100' : 'text-[#111113]'}`}>
        {title}
      </h3>
      <p className={`mb-10 max-w-[280px] text-[15px] leading-snug ${isDark ? 'text-gray-400' : 'text-[#6e6e73]'}`}>
        {message}
      </p>
      <button
        onClick={onRetry}
        className={`w-full max-w-[280px] rounded-full py-3.5 text-[17px] font-semibold transition-all duration-200 active:scale-[0.98] ${
          isDark
            ? 'bg-white text-[#111113] hover:bg-gray-100'
            : 'bg-[#0a4f42] text-white hover:bg-[#083f35]'
        }`}
      >
        {buttonText}
      </button>
    </div>
  )
}
