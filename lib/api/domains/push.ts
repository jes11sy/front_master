type RequestFn = (endpoint: string, options?: RequestInit) => Promise<any>

export async function subscribeToPush(request: RequestFn, subscription: PushSubscriptionJSON) {
  return request('/push/master/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription }),
  })
}

export async function unsubscribeFromPush(request: RequestFn, endpoint: string) {
  return request('/push/master/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  })
}

export async function sendTestPush(request: RequestFn) {
  return request('/push/master/test', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}
