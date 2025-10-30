import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.test-shem.ru/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - добавляем токен в каждый запрос
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - автоматическое обновление токена при 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
      } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Проверяем условия для обновления токена
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Если токен уже обновляется, добавляем запрос в очередь
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // Нет refresh токена - очищаем хранилище и редирект
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        console.log('[API] Refreshing access token...');
        
        // Обновляем токен
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://api.test-shem.ru/api/v1'}/auth/refresh`,
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Сохраняем новые токены
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        console.log('[API] Access token refreshed successfully');

        // Обновляем заголовок в axios
        if (api.defaults.headers.common) {
          api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        }
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Обрабатываем очередь неудавшихся запросов
        processQueue(null, accessToken);

        // Повторяем исходный запрос
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh токен невалиден - выходим
        console.error('[API] Failed to refresh token:', refreshError);
        processQueue(refreshError as AxiosError, null);
        
        localStorage.clear();
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Вспомогательные функции для работы с токенами
export const authUtils = {
  /**
   * Сохранить токены после логина
   */
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  /**
   * Получить access токен
   */
  getAccessToken: () => {
    return localStorage.getItem('accessToken');
  },

  /**
   * Получить refresh токен
   */
  getRefreshToken: () => {
    return localStorage.getItem('refreshToken');
  },

  /**
   * Проверить наличие токенов
   */
  hasTokens: () => {
    return !!(localStorage.getItem('accessToken') && localStorage.getItem('refreshToken'));
  },

  /**
   * Очистить токены (logout)
   */
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('auth_token');
  },

  /**
   * Logout с вызовом API
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('[API] Logout error:', error);
    } finally {
      authUtils.clearTokens();
      window.location.href = '/login';
    }
  },
};

// Обертка apiClient для обратной совместимости с Pages Router
const apiClient = {
  // Auth
  login: async (login: string, password: string, rememberMe: boolean) => {
    const response = await api.post('/auth/login', {
      login,
      password,
      role: 'master',
    });
    // Автоматически сохраняем токены
    authUtils.setTokens(response.data.data.accessToken, response.data.data.refreshToken);
    // Старая совместимость
    if (rememberMe) {
      localStorage.setItem('auth_token', response.data.data.accessToken);
    } else {
      sessionStorage.setItem('auth_token', response.data.data.accessToken);
    }
    return { success: true, data: response.data.data };
  },

  logout: async () => {
    await authUtils.logout();
  },

  clearToken: () => {
    authUtils.clearTokens();
  },

  isAuthenticated: () => {
    return authUtils.hasTokens() || !!(localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'));
  },

  getMasterProfile: async () => {
    const response = await api.get('/auth/profile');
    return { success: true, data: response.data.data };
  },

  // Orders
  getOrders: async (params?: any) => {
    const response = await api.get('/orders', { params });
    return { success: true, data: response.data };
  },

  getOrderById: async (id: string) => {
    const response = await api.get(`/orders/${id}`);
    return { success: true, data: response.data };
  },

  updateOrder: async (id: string, data: any) => {
    const response = await api.put(`/orders/${id}`, data);
    return { success: true, data: response.data };
  },

  // Calls
  getCallsByOrderId: async (orderId: string) => {
    const response = await api.get(`/calls/order/${orderId}`);
    return { success: true, data: response.data };
  },

  // Files
  uploadFile: async (file: File, folder: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/files/upload/${folder}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { success: true, data: response.data };
  },

  // Statistics
  getMasterStatistics: async (params?: any) => {
    const response = await api.get('/statistics/master', { params });
    return { success: true, data: response.data };
  },

  // Cash Submissions
  getMasterCashSubmissions: async () => {
    const response = await api.get('/cash/submissions/master');
    return { success: true, data: response.data };
  },

  submitCashForReview: async (orderId: number, receipt?: File) => {
    let receiptUrl;
    if (receipt) {
      const uploadResponse = await apiClient.uploadFile(receipt, 'receipts');
      receiptUrl = uploadResponse.data.url;
    }
    const response = await api.post('/cash/submissions', {
      orderId,
      receiptUrl,
    });
    return { success: true, data: response.data };
  },

  // Avito
  getOrderAvitoChat: async (orderId: string) => {
    const response = await api.get(`/orders/${orderId}/avito/chat`);
    return { success: true, data: response.data };
  },

  getAvitoMessages: async (chatId: string, avitoAccountName: string, limit?: number) => {
    const response = await api.get(`/avito/messages`, {
      params: { chatId, avitoAccountName, limit },
    });
    return response.data;
  },

  sendAvitoMessageNew: async (chatId: string, message: string, avitoAccountName: string) => {
    const response = await api.post(`/avito/messages`, {
      chatId,
      message,
      avitoAccountName,
    });
    return response.data;
  },

  markAvitoChatAsReadNew: async (chatId: string, avitoAccountName: string) => {
    const response = await api.post(`/avito/chat/read`, {
      chatId,
      avitoAccountName,
    });
    return response.data;
  },
};

export { apiClient };
export default api;
