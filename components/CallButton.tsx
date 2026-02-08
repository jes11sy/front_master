'use client';

import { useState } from 'react';
import { Phone, Loader2, X } from 'lucide-react';
import apiClient from '@/lib/api';
import { useDesignStore } from '@/store/design.store';

interface CallButtonProps {
  orderId: number;
  clientPhone: string;
  clientName: string;
}

export function CallButton({ orderId, clientPhone, clientName }: CallButtonProps) {
  const { theme } = useDesignStore();
  const isDark = theme === 'dark';
  
  const [isOpen, setIsOpen] = useState(false);
  const [masterPhone, setMasterPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 11);
    
    if (limited.length === 0) return '';
    if (limited.length <= 1) return `+${limited}`;
    if (limited.length <= 4) return `+${limited.slice(0, 1)} (${limited.slice(1)}`;
    if (limited.length <= 7) return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4)}`;
    if (limited.length <= 9) return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7)}`;
    return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7, 9)}-${limited.slice(9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setMasterPhone(formatted);
    setError('');
  };

  const handleCall = async () => {
    const digits = masterPhone.replace(/\D/g, '');
    
    if (digits.length < 10) {
      setError('Введите корректный номер телефона');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.initiateCallback(orderId, `+${digits}`);
      
      if (response.success) {
        setSuccess('Звонок инициирован! Ожидайте входящего звонка.');
        setTimeout(() => {
          setIsOpen(false);
          setMasterPhone('');
          setSuccess('');
        }, 3000);
      } else {
        setError(response.message || 'Ошибка при инициации звонка');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при инициации звонка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setMasterPhone('');
    setError('');
    setSuccess('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2.5 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg transition-colors"
      >
        <Phone className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className={`rounded-xl p-5 max-w-sm w-full shadow-2xl ${
            isDark ? 'bg-[#2a3441]' : 'bg-white'
          }`}>
            {/* Заголовок */}
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                Звонок клиенту
              </h3>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className={`p-1 rounded transition-colors ${
                  isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Информация о клиенте */}
            <div className={`rounded-lg p-3 mb-4 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={`text-xs mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Клиент</p>
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{clientName}</p>
                </div>
                <div>
                  <p className={`text-xs mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Телефон</p>
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{clientPhone}</p>
                </div>
              </div>
            </div>
            
            {/* Поле ввода */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Ваш номер телефона
              </label>
              <input
                type="tel"
                value={masterPhone}
                onChange={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
                className={`w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0d5c4b] transition-colors ${
                  isDark 
                    ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                disabled={isLoading}
                autoFocus
              />
              <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Сначала вам позвонит система, затем соединит с клиентом
              </p>
            </div>

            {/* Ошибка */}
            {error && (
              <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-red-900/40 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>{error}</p>
              </div>
            )}

            {/* Успех */}
            {success && (
              <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-green-900/40 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>{success}</p>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex gap-3">
              <button
                onClick={handleCall}
                disabled={isLoading || !masterPhone}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0d5c4b] hover:bg-[#0a4a3c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Звоним...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    Позвонить
                  </>
                )}
              </button>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className={`px-4 py-2.5 font-medium rounded-lg transition-colors ${
                  isDark 
                    ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
