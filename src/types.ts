export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  username: string
  role: UserRole
  password?: string
}

export interface Chamber {
  id: string
  name: string
  description?: string
  status: 'available' | 'in-use' | 'maintenance'
  manufacturer: string
  model: string
  calibrationDate?: string
  createdAt: string
}

export interface Config {
  id: string
  name: string
  remark?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  customerName?: string
  configs?: Config[]
  wfs?: string[]
  createdAt: string
}

export interface TestProject {
  id: string
  name: string
  temperature: number
  humidity: number
  duration: number
  projectId?: string
  createdAt: string
}

export interface UsageLog {
  id: string
  chamberId: string
  projectId?: string
  testProjectId?: string
  startTime: string
  endTime?: string
  user: string
  status: 'not-started' | 'in-progress' | 'completed' | 'overdue'
  notes?: string
  selectedConfigIds?: string[]
  selectedWaterfall?: string
  createdAt: string
}

