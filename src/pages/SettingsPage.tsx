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
import TitleWithIcon from '../components/TitleWithIcon'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  DashboardRangePreset,
  DensityMode,
  ThemeMode,
  setLanguage,
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
import { useI18n } from '../i18n'

const PRIMARY_PRESETS = [
  { zhName: '品牌蓝', enName: 'Brand Blue', value: '#155EEF' },
  { zhName: '深蓝', enName: 'Navy', value: '#003da5' },
  { zhName: '天蓝', enName: 'Sky Blue', value: '#0ea5e9' },
  { zhName: '青绿', enName: 'Teal', value: '#14b8a6' },
  { zhName: '橙色', enName: 'Orange', value: '#f97316' },
  { zhName: '紫色', enName: 'Purple', value: '#7c3aed' },
]

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const settings = useAppSelector((s) => s.settings)
  const auth = useAppSelector((s) => s.auth)
  const isAdmin = auth.isAuthenticated && auth.user?.role === 'admin'
  const { tr } = useI18n()

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
      setMigrationError(e?.message || tr('预览失败', 'Preview failed'))
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
      setMigrationError(e?.message || tr('迁移失败', 'Migration failed'))
    } finally {
      setMigrationLoading(false)
    }
  }

  return (
    <PageShell
      title={
        <TitleWithIcon icon={<SettingsIcon />}>{tr('设置', 'Settings')}</TitleWithIcon>
      }
      maxWidth="lg"
    >
      <Stack spacing={2}>
        <AppCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <PaletteIcon fontSize="small" />
              <span>{tr('外观', 'Appearance')}</span>
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
                label={settings.themeMode === 'dark' ? tr('深色模式', 'Dark mode') : tr('浅色模式', 'Light mode')}
              />
            </Box>

            <Divider />

            <FormControl>
              <FormLabel>{tr('语言', 'Language')}</FormLabel>
              <RadioGroup
                row
                value={settings.language}
                onChange={(e) => dispatch(setLanguage(e.target.value as any))}
              >
                <FormControlLabel value="zh" control={<Radio />} label={tr('中文', 'Chinese')} />
                <FormControlLabel value="en" control={<Radio />} label="English" />
              </RadioGroup>
            </FormControl>

            <Divider />

            <FormControl>
              <FormLabel>{tr('密度', 'Density')}</FormLabel>
              <RadioGroup
                row
                value={settings.density as DensityMode}
                onChange={(e) => dispatch(setDensity(e.target.value as DensityMode))}
              >
                <FormControlLabel value="comfortable" control={<Radio />} label={tr('舒适', 'Comfortable')} />
                <FormControlLabel value="compact" control={<Radio />} label={tr('紧凑', 'Compact')} />
              </RadioGroup>
            </FormControl>

            <Divider />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650, mb: 1 }}>
                {tr('主色', 'Primary color')}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {PRIMARY_PRESETS.map((p) => (
                  <Chip
                    key={p.value}
                    label={tr(p.zhName, p.enName)}
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

        <AppCard title={tr('仪表盘与告警', 'Dashboard & Alerts')}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>{tr('Dashboard 默认时间窗', 'Default time range')}</FormLabel>
              <RadioGroup
                row
                value={settings.dashboard.rangePreset as DashboardRangePreset}
                onChange={(e) => dispatch(setDashboardRangePreset(e.target.value as DashboardRangePreset))}
              >
                <FormControlLabel value="7d" control={<Radio />} label={tr('7天', '7 days')} />
                <FormControlLabel value="30d" control={<Radio />} label={tr('30天', '30 days')} />
                <FormControlLabel value="90d" control={<Radio />} label={tr('90天', '90 days')} />
              </RadioGroup>
            </FormControl>

            <Divider />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650, mb: 1 }}>
                {tr('校准提前提醒（天）', 'Calibration reminder (days)')}
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
                <Chip
                  label={
                    settings.language === 'en'
                      ? `${settings.alerts.calibrationDaysThreshold} d`
                      : `${settings.alerts.calibrationDaysThreshold} 天`
                  }
                  sx={{ fontWeight: 650 }}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650, mb: 1 }}>
                {tr('长时间占用阈值（小时）', 'Long occupancy threshold (hours)')}
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
                {tr('自动刷新（秒）', 'Auto refresh (seconds)')}
              </Typography>
              <TextField
                type="number"
                value={settings.refreshSeconds}
                onChange={(e) => dispatch(setRefreshSeconds(Number(e.target.value)))}
                inputProps={{ min: 0, step: 5 }}
                helperText={tr('0 表示关闭自动刷新', '0 disables auto refresh')}
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
                <span>{tr('数据迁移', 'Data migration')}</span>
              </Stack>
            }
          >
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {tr(
                  '当前系统已以 assets 集合作为设备台账数据源；若你的 Firebase 仍只有 chambers 集合，需要先迁移一次。',
                  'This app uses the assets collection as the source of truth. If your Firebase still only has the chambers collection, run a one-time migration first.'
                )}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  label={
                    strategy === 'skip'
                      ? tr('策略：跳过已存在', 'Strategy: skip existing')
                      : tr('策略：覆盖写入', 'Strategy: overwrite')
                  }
                  onClick={() => setStrategy((s) => (s === 'skip' ? 'overwrite' : 'skip'))}
                  sx={{ fontWeight: 650 }}
                />
                <Button variant="outlined" onClick={handlePreview} disabled={!canMigrate || migrationLoading}>
                  {migrationLoading ? <CircularProgress size={18} /> : tr('预览', 'Preview')}
                </Button>
                <Button variant="contained" onClick={handleMigrate} disabled={!canMigrate || migrationLoading}>
                  {migrationLoading ? <CircularProgress size={18} /> : tr('执行迁移', 'Run migration')}
                </Button>
              </Stack>

              {preview ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`chambers: ${preview.chambersCount}`} />
                  <Chip label={`assets(chamber): ${preview.assetsChamberCount}`} />
                  <Chip
                    label={
                      settings.language === 'en'
                        ? `To create: ${preview.wouldCreateCount}`
                        : `将新增: ${preview.wouldCreateCount}`
                    }
                    color="success"
                  />
                  <Chip
                    label={settings.language === 'en' ? `Conflicts: ${preview.conflictCount}` : `冲突: ${preview.conflictCount}`}
                    color={preview.conflictCount > 0 ? 'warning' : 'default'}
                  />
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
