/**
 * Система валидации форм без внешних зависимостей
 * Легковесная, типобезопасная, с понятными сообщениями об ошибках
 */

export type ValidationRule<T = any> = (value: T) => string | null

export interface FieldValidation {
  rules: ValidationRule[]
  message?: string
}

export interface ValidationSchema {
  [field: string]: ValidationRule[]
}

export interface ValidationErrors {
  [field: string]: string
}

/**
 * Базовые правила валидации
 */
export const validators = {
  /**
   * Обязательное поле
   */
  required: (message = 'Это поле обязательно'): ValidationRule => (value: any) => {
    if (value === null || value === undefined || value === '') {
      return message
    }
    if (typeof value === 'string' && value.trim() === '') {
      return message
    }
    return null
  },

  /**
   * Минимальная длина строки
   */
  minLength: (min: number, message?: string): ValidationRule<string> => (value: string) => {
    if (!value) return null // Пропускаем если пусто (используйте required отдельно)
    if (value.length < min) {
      return message || `Минимум ${min} символов`
    }
    return null
  },

  /**
   * Максимальная длина строки
   */
  maxLength: (max: number, message?: string): ValidationRule<string> => (value: string) => {
    if (!value) return null
    if (value.length > max) {
      return message || `Максимум ${max} символов`
    }
    return null
  },

  /**
   * Email валидация
   */
  email: (message = 'Неверный формат email'): ValidationRule<string> => (value: string) => {
    if (!value) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return message
    }
    return null
  },

  /**
   * Номер телефона (российский формат)
   */
  phone: (message = 'Неверный формат телефона'): ValidationRule<string> => (value: string) => {
    if (!value) return null
    // Разрешаем +7, 8, и цифры с пробелами/дефисами
    const phoneRegex = /^(\+7|8|7)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/
    if (!phoneRegex.test(value)) {
      return message
    }
    return null
  },

  /**
   * Только буквы (латиница и кириллица)
   */
  alpha: (message = 'Только буквы'): ValidationRule<string> => (value: string) => {
    if (!value) return null
    const alphaRegex = /^[a-zA-Zа-яА-ЯёЁ\s\-]+$/
    if (!alphaRegex.test(value)) {
      return message
    }
    return null
  },

  /**
   * Только буквы и цифры
   */
  alphanumeric: (message = 'Только буквы и цифры'): ValidationRule<string> => (value: string) => {
    if (!value) return null
    const alphanumericRegex = /^[a-zA-Z0-9а-яА-ЯёЁ\s]+$/
    if (!alphanumericRegex.test(value)) {
      return message
    }
    return null
  },

  /**
   * Только цифры
   */
  numeric: (message = 'Только цифры'): ValidationRule<string> => (value: string) => {
    if (!value) return null
    const numericRegex = /^\d+$/
    if (!numericRegex.test(value)) {
      return message
    }
    return null
  },

  /**
   * Минимальное значение для числа
   */
  min: (min: number, message?: string): ValidationRule<number> => (value: number) => {
    if (value === null || value === undefined) return null
    if (value < min) {
      return message || `Минимум ${min}`
    }
    return null
  },

  /**
   * Максимальное значение для числа
   */
  max: (max: number, message?: string): ValidationRule<number> => (value: number) => {
    if (value === null || value === undefined) return null
    if (value > max) {
      return message || `Максимум ${max}`
    }
    return null
  },

  /**
   * Диапазон значений
   */
  range: (min: number, max: number, message?: string): ValidationRule<number> => (value: number) => {
    if (value === null || value === undefined) return null
    if (value < min || value > max) {
      return message || `Значение должно быть от ${min} до ${max}`
    }
    return null
  },

  /**
   * Регулярное выражение
   */
  pattern: (regex: RegExp, message = 'Неверный формат'): ValidationRule<string> => (value: string) => {
    if (!value) return null
    if (!regex.test(value)) {
      return message
    }
    return null
  },

  /**
   * Пользовательская валидация
   */
  custom: (fn: (value: any) => boolean, message: string): ValidationRule => (value: any) => {
    if (!fn(value)) {
      return message
    }
    return null
  },

  /**
   * Совпадение с другим полем (для подтверждения пароля)
   */
  match: (otherField: string, otherValue: any, message?: string): ValidationRule => (value: any) => {
    if (value !== otherValue) {
      return message || `Значения не совпадают`
    }
    return null
  },
}

/**
 * Валидировать одно поле
 */
export function validateField(value: any, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    const error = rule(value)
    if (error) {
      return error
    }
  }
  return null
}

/**
 * Валидировать форму по схеме
 */
export function validateForm<T extends Record<string, any>>(
  values: T,
  schema: ValidationSchema
): ValidationErrors {
  const errors: ValidationErrors = {}

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(values[field], rules)
    if (error) {
      errors[field] = error
    }
  }

  return errors
}

/**
 * Проверить есть ли ошибки валидации
 */
export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0
}

/**
 * Хук для валидации форм (без React Query/Formik)
 */
export function createFormValidator<T extends Record<string, any>>(schema: ValidationSchema) {
  return {
    validate: (values: T): ValidationErrors => {
      return validateForm(values, schema)
    },
    validateField: (field: keyof T, value: any): string | null => {
      const rules = schema[field as string]
      if (!rules) return null
      return validateField(value, rules)
    },
    isValid: (values: T): boolean => {
      const errors = validateForm(values, schema)
      return !hasErrors(errors)
    },
  }
}
