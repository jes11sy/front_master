/**
 * Безопасная санитизация пользовательского ввода
 * Защита от XSS атак с использованием DOMPurify
 */
import DOMPurify from 'dompurify';

// Конфигурация DOMPurify для строгой санитизации
const STRICT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [], // Не разрешаем никакие теги
  ALLOWED_ATTR: [], // Не разрешаем никакие атрибуты
  KEEP_CONTENT: true, // Сохраняем текстовое содержимое
};

// Конфигурация для HTML с ограниченным набором тегов
const HTML_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'span'],
  ALLOWED_ATTR: ['class'],
};

/**
 * Санитизация строки - удаляет все HTML теги, оставляя только текст
 * @param input - входная строка
 * @returns очищенная строка
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  
  // Используем DOMPurify для удаления всех HTML тегов
  return DOMPurify.sanitize(input, STRICT_CONFIG).trim();
}

/**
 * Санитизация HTML - разрешает безопасное подмножество тегов
 * @param input - входная HTML строка
 * @returns очищенный HTML
 */
export function sanitizeHTML(input: string | null | undefined): string {
  if (!input) return '';
  
  return DOMPurify.sanitize(input, HTML_CONFIG);
}

/**
 * Полное удаление HTML (только текст)
 * @param input - входная строка
 * @returns текст без HTML
 */
export function stripHTML(input: string | null | undefined): string {
  if (!input) return '';
  
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], KEEP_CONTENT: true });
}

/**
 * Санитизация URL
 * @param url - URL для проверки
 * @returns безопасный URL или пустая строка
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
 * @param phone - номер телефона
 * @returns очищенный номер
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Санитизация email
 * @param email - email адрес
 * @returns валидный email или пустая строка
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  // Сначала очищаем от HTML
  const cleaned = sanitizeString(email);
  
  // Базовая валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    return '';
  }
  
  return cleaned.toLowerCase().trim();
}

/**
 * Санитизация имени (разрешает только буквы, пробелы и дефисы)
 * @param name - имя
 * @returns очищенное имя
 */
export function sanitizeName(name: string | null | undefined): string {
  if (!name) return '';
  
  // Сначала удаляем HTML
  const cleaned = sanitizeString(name);
  
  return cleaned.replace(/[^a-zA-Zа-яА-ЯёЁ\s\-]/g, '').trim();
}

/**
 * Санитизация числа
 * @param input - строка или число
 * @returns число или 0
 */
export function sanitizeNumber(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  
  const num = typeof input === 'string' ? parseFloat(input.replace(/[^\d.-]/g, '')) : input;
  return isNaN(num) ? 0 : num;
}

/**
 * Санитизация объекта (рекурсивно)
 * @param obj - объект для санитизации
 * @returns очищенный объект
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item: unknown) => 
        typeof item === 'string' ? sanitizeString(item) : 
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) : 
        item
      );
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}
