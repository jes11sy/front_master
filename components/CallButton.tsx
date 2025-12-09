'use client';

import { useState } from 'react';
import { Phone, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api';

interface CallButtonProps {
  orderId: number;
  clientPhone: string;
  clientName: string;
}

export function CallButton({ orderId, clientPhone, clientName }: CallButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [masterPhone, setMasterPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatPhoneInput = (value: string) => {
    // Убираем все нецифровые символы
    const digits = value.replace(/\D/g, '');
    
    // Ограничиваем до 11 цифр
    const limited = digits.slice(0, 11);
    
    // Форматируем
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
    // Извлекаем только цифры
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
        setSuccess('Звонок инициирован! Ожидайте входящего звонка на ваш номер.');
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
      <Button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border-0"
      >
        <Phone className="w-4 h-4" />
        <span className="hidden sm:inline">Позвонить клиенту</span>
        <span className="sm:hidden">Позвонить</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Звонок клиенту
              </h3>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-1">
                  Клиент:
                </p>
                <p className="font-semibold text-gray-900">{clientName}</p>
                <p className="text-sm text-gray-600 mt-2 mb-1">
                  Номер клиента:
                </p>
                <p className="font-semibold text-gray-900">{clientPhone}</p>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ваш номер телефона: <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={masterPhone}
                onChange={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-gray-900 placeholder-gray-400 transition-colors"
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Сначала вам позвонит система, затем соединит с клиентом
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm font-medium">{success}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleCall}
                disabled={isLoading || !masterPhone}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-all duration-200 border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Инициация...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    Позвонить
                  </>
                )}
              </Button>
              <Button
                onClick={handleClose}
                disabled={isLoading}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-all duration-200 border-0"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

