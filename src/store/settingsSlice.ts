import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'light' | 'dark'
export type DensityMode = 'comfortable' | 'compact'
export type DashboardRangePreset = '7d' | '30d' | '90d'

export interface SettingsState {
  themeMode: ThemeMode
  density: DensityMode
  primaryColor: string
  dashboard: {
    rangePreset: DashboardRangePreset
  }
  alerts: {
    calibrationDaysThreshold: number
    longOccupancyHoursThreshold: number
  }
  refreshSeconds: number
}

const STORAGE_KEY = 'settings'

const initialState: SettingsState = {
  themeMode: 'light',
  density: 'comfortable',
  primaryColor: '#155EEF',
  dashboard: {
    rangePreset: '30d',
  },
  alerts: {
    calibrationDaysThreshold: 30,
    longOccupancyHoursThreshold: 72,
  },
  refreshSeconds: 0,
}

const persist = (state: SettingsState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    loadSettingsFromStorage(state) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return
      try {
        const parsed = JSON.parse(stored) as Partial<SettingsState>
        return { ...state, ...parsed, dashboard: { ...state.dashboard, ...parsed.dashboard }, alerts: { ...state.alerts, ...parsed.alerts } }
      } catch {
        return state
      }
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload
      persist(state)
    },
    toggleThemeMode(state) {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light'
      persist(state)
    },
    setDensity(state, action: PayloadAction<DensityMode>) {
      state.density = action.payload
      persist(state)
    },
    setPrimaryColor(state, action: PayloadAction<string>) {
      state.primaryColor = action.payload
      persist(state)
    },
    setDashboardRangePreset(state, action: PayloadAction<DashboardRangePreset>) {
      state.dashboard.rangePreset = action.payload
      persist(state)
    },
    setCalibrationDaysThreshold(state, action: PayloadAction<number>) {
      state.alerts.calibrationDaysThreshold = Math.max(1, Math.floor(action.payload))
      persist(state)
    },
    setLongOccupancyHoursThreshold(state, action: PayloadAction<number>) {
      state.alerts.longOccupancyHoursThreshold = Math.max(1, Math.floor(action.payload))
      persist(state)
    },
    setRefreshSeconds(state, action: PayloadAction<number>) {
      state.refreshSeconds = Math.max(0, Math.floor(action.payload))
      persist(state)
    },
  },
})

export const {
  loadSettingsFromStorage,
  setThemeMode,
  toggleThemeMode,
  setDensity,
  setPrimaryColor,
  setDashboardRangePreset,
  setCalibrationDaysThreshold,
  setLongOccupancyHoursThreshold,
  setRefreshSeconds,
} = settingsSlice.actions

export default settingsSlice.reducer
