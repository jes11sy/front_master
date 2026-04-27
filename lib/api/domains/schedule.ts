type RequestFn = (endpoint: string, options?: RequestInit) => Promise<any>

interface ScheduleDay {
  date: string
  isWorkDay: boolean
}

export async function getOwnSchedule(
  request: RequestFn,
  params?: { startDate?: string; endDate?: string }
) {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.append('startDate', params.startDate)
  if (params?.endDate) searchParams.append('endDate', params.endDate)

  const query = searchParams.toString()
  return request(`/masters/profile/schedule${query ? `?${query}` : ''}`)
}

export async function updateOwnSchedule(request: RequestFn, days: ScheduleDay[]) {
  return request('/masters/profile/schedule', {
    method: 'POST',
    body: JSON.stringify({ days }),
  })
}

export async function getMasterSchedule(
  request: RequestFn,
  masterId: number,
  params?: { startDate?: string; endDate?: string }
) {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.append('startDate', params.startDate)
  if (params?.endDate) searchParams.append('endDate', params.endDate)

  const query = searchParams.toString()
  return request(`/masters/${masterId}/schedule${query ? `?${query}` : ''}`)
}

export async function updateMasterSchedule(request: RequestFn, masterId: number, days: ScheduleDay[]) {
  return request(`/masters/${masterId}/schedule`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  })
}
