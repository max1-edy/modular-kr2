import type {
  Substation,
  SubstationPayload,
  SwitchgearCell,
  CellPayload,
  SubstationFilters
} from '../types/energy'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Помилка запиту (${res.status})`
    try {
      const data = await res.json()
      if (data && typeof data.message === 'string') {
        message = data.message
      }
    } catch {}
    const err = new Error(message) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export async function fetchSubstations(filters: SubstationFilters = {}): Promise<Substation[]> {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.voltageClass) params.set('voltageClass', filters.voltageClass)
  if (filters.status) params.set('status', filters.status)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.order) params.set('order', filters.order)

  const query = params.toString()
  const url = query ? `${BASE_URL}/substations?${query}` : `${BASE_URL}/substations`
  const res = await fetch(url)
  return handleResponse<Substation[]>(res)
}

export async function fetchSubstationById(id: string): Promise<Substation> {
  const res = await fetch(`${BASE_URL}/substations/${encodeURIComponent(id)}`)
  return handleResponse<Substation>(res)
}

export async function createSubstation(payload: SubstationPayload): Promise<Substation> {
  const res = await fetch(`${BASE_URL}/substations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return handleResponse<Substation>(res)
}

export async function updateSubstation(id: string, payload: SubstationPayload): Promise<Substation> {
  const res = await fetch(`${BASE_URL}/substations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return handleResponse<Substation>(res)
}

export async function deleteSubstation(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/substations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  await handleResponse<unknown>(res)
}

export async function fetchCells(substationId: string): Promise<SwitchgearCell[]> {
  const res = await fetch(`${BASE_URL}/substations/${encodeURIComponent(substationId)}/cells`)
  return handleResponse<SwitchgearCell[]>(res)
}

export async function createCell(substationId: string, payload: CellPayload): Promise<SwitchgearCell> {
  const res = await fetch(`${BASE_URL}/substations/${encodeURIComponent(substationId)}/cells`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return handleResponse<SwitchgearCell>(res)
}

export async function deleteCell(cellId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/cells/${encodeURIComponent(cellId)}`, {
    method: 'DELETE'
  })
  await handleResponse<unknown>(res)
}