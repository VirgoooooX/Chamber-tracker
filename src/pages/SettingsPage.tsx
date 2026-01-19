import React, { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import PaletteIcon from '@mui/icons-material/Palette'
import SettingsIcon from '@mui/icons-material/Settings'
import PageShell from '../components/PageShell'
import AppCard from '../components/AppCard'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  DashboardRangePreset,
  DensityMode,
  ThemeMode,
  setCalibrationDaysThreshold,
  setDashboardRangePreset,
  setDensity,
  setLongOccupancyHoursThreshold,
  setPrimaryColor,
  setRefreshSeconds,
  toggleThemeMode,
} from '../store/settingsSlice'
import { migrateChambersToAssets, previewChambersToAssetsMigration } from '../services/migrationService'
import { fetchAssetsByType } from '../store/assetsSlice'

const PRIMARY_PRESETS = [
  { name: '品牌蓝', value: '#155EEF' },
  { name: '深蓝', value: '#003da5' },
  { name: '天蓝', value: '#0ea5e9' },
  { name: '青绿', value: '#14b8a6' },
  { name: '橙色', value: '#f97316' },
  { name: '紫色', value: '#7c3aed' },
]

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const settings = useAppSelector((s) => s.settings)
  const auth = useAppSelector((s) => s.auth)
  const isAdmin = auth.isAuthenticated && auth.user?.role === 'admin'

  const [migrationLoading, setMigrationLoading] = useState(false)
  const [migrationError, setMigrationError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    chambersCount: number
    assetsChamberCount: number
    wouldCreateCount: number
    conflictCount: number
  } | null>(null)
  const [strategy, setStrategy] = useState<'skip' | 'overwrite'>('skip')

  const canMigrate = useMemo(() => {
    if (!isAdmin) return false
    return true
  }, [isAdmin])

  const handlePreview = async () => {
    setMigrationError(null)
    setMigrationLoading(true)
    try {
      const p = await previewChambersToAssetsMigration()
      setPreview(p)
    } catch (e: any) {
      setMigrationError(e?.message || '预览失败')
    } finally {
      setMigrationLoading(false)
    }
  }

  const handleMigrate = async () => {
    setMigrationError(null)
    setMigrationLoading(true)
    try {
      await migrateChambersToAssets({ strategy })
      await dispatch(fetchAssetsByType('chamber'))
      await handlePreview()
    } catch (e: any) {
      setMigrationError(e?.message || '迁移失败')
    } finally {
      setMigrationLoading(false)
    }
  }

  return (
    <PageShell
      title={
        <Stack direction="row" spacing={1} alignItems="center">
          <SettingsIcon fontSize="inherit" />
          <span>设置</span>
        </Stack>
      }
      maxWidth="lg"
    >
      <Stack spacing={2}>
        <AppCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <PaletteIcon fontSize="small" />
              <span>外观</span>
            </Stack>
          }
        >
          <Stack spacing={2}>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.themeMode === 'dark'}
                    onChange={() => dispatch(toggleThemeMode())}
                  />
                }
                label={settings.themeMode === 'dark' ? '深色模式' : '浅色模式'}
              />
            </Box>

            <Divider />

            <FormControl>
              <FormLabel>密度</FormLabel>
              <RadioGroup
                row
                value={settings.density as DensityMode}
                onChange={(e) => dispatch(setDensity(e.target.value as DensityMode))}
              >
                <FormControlLabel value="comfortable" control={<Radio />} label="舒适" />
                <FormControlLabel value="compact" control={<Radio />} label="紧凑" />
              </RadioGroup>
            </FormControl>

            <Divider />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650, mb: 1 }}>
                主色
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {PRIMARY_PRESETS.map((p) => (
                  <Chip
                    key={p.value}
                    label={p.name}
                    variant={settings.primaryColor === p.value ? 'filled' : 'outlined'}
                    onClick={() => dispatch(setPrimaryColor(p.value))}
                    sx={{
                      borderColor: p.value,
                      backgroundColor: settings.primaryColor === p.value ? p.value : undefined,
                      color: settings.primaryColor === p.value ? '#fff' : undefined,
                      fontWeight: 650,
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </AppCard>

        <AppCard title="仪表盘与告警">
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>Dashboard 默认时间窗</FormLabel>
              <RadioGroup
                row
                value={settings.dashboard.rangePreset as DashboardRangePreset}
                onChange={(e) => dispatch(setDashboardRangePreset(e.target.value as DashboardRangePreset))}
              >
                <FormControlLabel value="7d" control={<Radio />} label="7天" />
                <FormControlLabel value="30d" control={<Radio />} label="30天" />
                <FormControlLabel value="90d" control={<Radio />} label="90天" />
              </RadioGroup>
            </FormControl>

            <Divider />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650, mb: 1 }}>
                校准提前提醒（天）
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Slider
                  value={settings.alerts.calibrationDaysThreshold}
                  min={1}
                  max={90}
                  step={1}
                  onChange={(_, v) => dispatch(setCalibrationDaysThreshold(v as number))}
                  valueLabelDisplay="auto"
                  sx={{ flexGrow: 1 }}
                />
                <Chip label={`${settings.alerts.calibrationDaysThreshold} 天`} sx={{ fontWeight: 650 }} />
              </Stack>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650, mb: 1 }}>
                长时间占用阈值（小时）
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Slider
                  value={settings.alerts.longOccupancyHoursThreshold}
                  min={1}
                  max={240}
                  step={1}
                  onChange={(_, v) => dispatch(setLongOccupancyHoursThreshold(v as number))}
                  valueLabelDisplay="auto"
                  sx={{ flexGrow: 1 }}
                />
                <Chip label={`${settings.alerts.longOccupancyHoursThreshold} h`} sx={{ fontWeight: 650 }} />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650, mb: 1 }}>
                自动刷新（秒）
              </Typography>
              <TextField
                type="number"
                value={settings.refreshSeconds}
                onChange={(e) => dispatch(setRefreshSeconds(Number(e.target.value)))}
                inputProps={{ min: 0, step: 5 }}
                helperText="0 表示关闭自动刷新"
                fullWidth
              />
            </Box>
          </Stack>
        </AppCard>

        {isAdmin ? (
          <AppCard
            title={
              <Stack direction="row" spacing={1} alignItems="center">
                <SyncAltIcon fontSize="small" />
                <span>数据迁移</span>
              </Stack>
            }
          >
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                当前系统已以 assets 集合作为设备台账数据源；若你的 Firebase 仍只有 chambers 集合，需要先迁移一次。
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  label={strategy === 'skip' ? '策略：跳过已存在' : '策略：覆盖写入'}
                  onClick={() => setStrategy((s) => (s === 'skip' ? 'overwrite' : 'skip'))}
                  sx={{ fontWeight: 650 }}
                />
                <Button variant="outlined" onClick={handlePreview} disabled={!canMigrate || migrationLoading}>
                  {migrationLoading ? <CircularProgress size={18} /> : '预览'}
                </Button>
                <Button variant="contained" onClick={handleMigrate} disabled={!canMigrate || migrationLoading}>
                  {migrationLoading ? <CircularProgress size={18} /> : '执行迁移'}
                </Button>
              </Stack>

              {preview ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`chambers: ${preview.chambersCount}`} />
                  <Chip label={`assets(chamber): ${preview.assetsChamberCount}`} />
                  <Chip label={`将新增: ${preview.wouldCreateCount}`} color="success" />
                  <Chip label={`冲突: ${preview.conflictCount}`} color={preview.conflictCount > 0 ? 'warning' : 'default'} />
                </Stack>
              ) : null}

              {migrationError ? (
                <Typography variant="body2" color="error">
                  {migrationError}
                </Typography>
              ) : null}
            </Stack>
          </AppCard>
        ) : null}
      </Stack>
    </PageShell>
  )
}

export default SettingsPage
