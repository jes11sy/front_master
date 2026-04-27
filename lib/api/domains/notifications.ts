type RequestFn = (endpoint: string, options?: RequestInit) => Promise<any>

export async function getNotifications(request: RequestFn) {
  return request('/notifications')
}

export async function markNotificationAsRead(request: RequestFn, notificationId: string) {
  return request('/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ notificationId }),
  })
}

export async function markAllNotificationsAsRead(request: RequestFn) {
  return request('/notifications/read-all', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function deleteNotification(request: RequestFn, notificationId: string) {
  return request(`/notifications/${notificationId}`, {
    method: 'DELETE',
  })
}
