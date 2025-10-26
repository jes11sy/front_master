/**
 * Безопасная санитизация пользовательского ввода
 * Защита от XSS атак
 */

// Простая санитизация без внешних библиотек (для production лучше использовать DOMPurify)
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Санитизация HTML (удаляет все теги)
 */
export function sanitizeHTML(input: string | null | undefined): string {
  if (!input) return '';
  
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Санитизация URL
 */
export function sanitizeURL(url: string | null | undefined): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    // Разрешаем только http и https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

/**
 * Санитизация номера телефона (оставляет только цифры и +)
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Санитизация email
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  // Базовая валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '';
  }
  
  return email.toLowerCase().trim();
}

/**
 * Санитизация имени (разрешает только буквы, пробелы и дефисы)
 */
export function sanitizeName(name: string | null | undefined): string {
  if (!name) return '';
  
  return name.replace(/[^a-zA-Zа-яА-ЯёЁ\s\-]/g, '').trim();
}

/**
 * Санитизация числа
 */
export function sanitizeNumber(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  
  const num = typeof input === 'string' ? parseFloat(input.replace(/[^\d.-]/g, '')) : input;
  return isNaN(num) ? 0 : num;
}

/**
 * Санитизация объекта (рекурсивно)
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item: any) => 
        typeof item === 'string' ? sanitizeString(item) : 
        typeof item === 'object' ? sanitizeObject(item) : 
        item
      );
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}
