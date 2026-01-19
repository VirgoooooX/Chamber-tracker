import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import RefreshIcon from '@mui/icons-material/Refresh'
import PageShell from '../components/PageShell'
import AppCard from '../components/AppCard'
import TitleWithIcon from '../components/TitleWithIcon'
import ConfirmDialog from '../components/ConfirmDialog'
import { alpha } from '@mui/material/styles'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchAssetsByType } from '../store/assetsSlice'
import {
  addRepairTicket,
  deleteRepairTicket,
  fetchRepairTickets,
  transitionRepairTicketStatus,
  updateRepairTicket,
} from '../store/repairTicketsSlice'
import type { Asset, RepairStatus, RepairTicket } from '../types'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { zhCN } from 'date-fns/locale'

type StatusFilter = RepairStatus | 'all'

const statusLabel: Record<RepairStatus, string> = {
  'quote-pending': '未询价',
  'repair-pending': '待维修',
  completed: '已完成',
}

const statusColor: Record<RepairStatus, 'warning' | 'info' | 'success'> = {
  'quote-pending': 'warning',
  'repair-pending': 'info',
  completed: 'success',
}

const formatDays = (value: number) => `${Math.max(0, Math.floor(value))} 天`

const calcDaysFrom = (iso: string) => {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 0
  return (Date.now() - t) / (24 * 60 * 60 * 1000)
}

const RepairsPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const assetsState = useAppSelector((s) => s.assets)
  const ticketsState = useAppSelector((s) => s.repairTickets)

  const [filter, setFilter] = useState<StatusFilter>('quote-pending')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const [createAssetId, setCreateAssetId] = useState('')
  const [createProblemDesc, setCreateProblemDesc] = useState('')
  const [createExpectedReturnAt, setCreateExpectedReturnAt] = useState<Date | null>(null)

  const [editing, setEditing] = useState<RepairTicket | null>(null)
  const [editProblemDesc, setEditProblemDesc] = useState('')
  const [editVendorName, setEditVendorName] = useState('')
  const [editQuoteAmount, setEditQuoteAmount] = useState<string>('')
  const [editExpectedReturnAt, setEditExpectedReturnAt] = useState<Date | null>(null)

  useEffect(() => {
    dispatch(fetchAssetsByType('chamber'))
    dispatch(fetchRepairTickets(undefined))
  }, [dispatch])

  const assetById = useMemo(() => {
    const map = new Map<string, Asset>()
    assetsState.assets.forEach((a) => map.set(a.id, a))
    return map
  }, [assetsState.assets])

  const sortedAssets = useMemo(() => {
    return assetsState.assets
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'base' }))
  }, [assetsState.assets])

  const filteredTickets = useMemo(() => {
    if (filter === 'all') return ticketsState.tickets
    return ticketsState.tickets.filter((t) => t.status === filter)
  }, [filter, ticketsState.tickets])

  const counts = useMemo(() => {
    const all = ticketsState.tickets
    const quotePending = all.filter((t) => t.status === 'quote-pending').length
    const repairPending = all.filter((t) => t.status === 'repair-pending').length
    const completed = all.filter((t) => t.status === 'completed').length
    const open = quotePending + repairPending
    return { quotePending, repairPending, completed, open }
  }, [ticketsState.tickets])

  const openProgress = useMemo(() => {
    const total = Math.max(1, ticketsState.tickets.length)
    return Math.min(100, Math.round((counts.open / total) * 100))
  }, [counts.open, ticketsState.tickets.length])

  const openCreate = () => {
    setCreateAssetId('')
    setCreateProblemDesc('')
    setCreateExpectedReturnAt(null)
    setCreateOpen(true)
  }

  const openEdit = (ticket: RepairTicket) => {
    setEditing(ticket)
    setEditProblemDesc(ticket.problemDesc || '')
    setEditVendorName(ticket.vendorName || '')
    setEditQuoteAmount(ticket.quoteAmount !== undefined ? String(ticket.quoteAmount) : '')
    setEditExpectedReturnAt(ticket.expectedReturnAt ? new Date(ticket.expectedReturnAt) : null)
    setEditOpen(true)
  }

  const handleRefresh = () => {
    dispatch(fetchAssetsByType('chamber'))
    dispatch(fetchRepairTickets(undefined))
  }

  const handleSubmitCreate = async () => {
    if (!createAssetId || !createProblemDesc.trim()) return
    await dispatch(
      addRepairTicket({
        assetId: createAssetId,
        problemDesc: createProblemDesc.trim(),
        expectedReturnAt: createExpectedReturnAt ? createExpectedReturnAt.toISOString() : undefined,
      })
    )
    setCreateOpen(false)
  }

  const handleSubmitEdit = async () => {
    if (!editing) return
    await dispatch(
      updateRepairTicket({
        id: editing.id,
        changes: {
          problemDesc: editProblemDesc.trim(),
          vendorName: editVendorName.trim() || undefined,
          quoteAmount: editQuoteAmount ? Number(editQuoteAmount) : undefined,
          expectedReturnAt: editExpectedReturnAt ? editExpectedReturnAt.toISOString() : undefined,
        },
      })
    )
    setEditOpen(false)
    setEditing(null)
  }

  const handleMarkQuoted = async () => {
    if (!editing) return
    const vendor = editVendorName.trim()
    const quote = editQuoteAmount ? Number(editQuoteAmount) : NaN
    if (!vendor || Number.isNaN(quote)) return
    await dispatch(
      transitionRepairTicketStatus({
        id: editing.id,
        to: 'repair-pending',
        vendorName: vendor,
        quoteAmount: quote,
      })
    )
    setEditOpen(false)
    setEditing(null)
  }

  const handleMarkCompleted = async () => {
    if (!editing) return
    await dispatch(
      transitionRepairTicketStatus({
        id: editing.id,
        to: 'completed',
      })
    )
    setEditOpen(false)
    setEditing(null)
  }

  const handleConfirmDelete = async () => {
    if (!editing) return
    await dispatch(deleteRepairTicket(editing.id))
    setConfirmDeleteOpen(false)
    setEditOpen(false)
    setEditing(null)
  }

  return (
    <PageShell
      title={
        <TitleWithIcon icon={<BuildCircleIcon />}>维修管理</TitleWithIcon>
      }
      maxWidth="xl"
      actions={
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            label={`Open: ${counts.open}`}
            color={counts.open > 0 ? 'warning' : 'default'}
            sx={{ fontWeight: 650 }}
          />
          <Chip label={`未询价: ${counts.quotePending}`} variant="outlined" sx={{ fontWeight: 650 }} />
          <Chip label={`待维修: ${counts.repairPending}`} variant="outlined" sx={{ fontWeight: 650 }} />
          <Chip label={`已完成: ${counts.completed}`} variant="outlined" sx={{ fontWeight: 650 }} />
          <Tooltip title="刷新">
            <IconButton onClick={handleRefresh} size="small" color="primary">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
            新建工单
          </Button>
        </Stack>
      }
    >
      <AppCard
        title="维修状态追踪"
        actions={
          <ToggleButtonGroup
            value={filter}
            exclusive
            size="small"
            onChange={(_, v) => {
              if (!v) return
              setFilter(v)
            }}
          >
            <ToggleButton value="quote-pending">未询价</ToggleButton>
            <ToggleButton value="repair-pending">待维修</ToggleButton>
            <ToggleButton value="completed">已完成</ToggleButton>
            <ToggleButton value="all">全部</ToggleButton>
          </ToggleButtonGroup>
        }
      >
        {ticketsState.loading ? (
          <Box sx={{ mb: 1 }}>
            <LinearProgress />
          </Box>
        ) : null}

        {ticketsState.error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {ticketsState.error}
          </Alert>
        ) : null}

        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
              Open 占比
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {openProgress}%
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={openProgress} sx={{ mt: 0.75, height: 8, borderRadius: 999 }} />
        </Box>

        <Stack spacing={1}>
          {filteredTickets.length === 0 ? (
            <Typography color="text.secondary">暂无工单</Typography>
          ) : (
            filteredTickets.map((t) => {
              const asset = assetById.get(t.assetId)
              const days = calcDaysFrom(t.createdAt)
              return (
                <Box
                  key={t.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 1.25,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 320px' },
                    gap: 1.25,
                    alignItems: 'center',
                    backgroundColor: (theme) =>
                      alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.35 : 0.6),
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease, border-color 150ms ease',
                    '&:hover': {
                      backgroundColor: (theme) =>
                        alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.45 : 0.75),
                      borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
                    },
                  }}
                  onClick={() => openEdit(t)}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography sx={{ fontWeight: 850 }} noWrap>
                        {asset?.name || `设备 ${t.assetId.slice(0, 8)}`}
                      </Typography>
                      <Chip size="small" label={statusLabel[t.status]} color={statusColor[t.status]} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }} noWrap>
                      {t.problemDesc || '-'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
                    <Chip size="small" variant="outlined" label={`停机: ${formatDays(days)}`} />
                    {t.status !== 'quote-pending' ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<LocalOfferIcon fontSize="small" />}
                        label={t.quoteAmount !== undefined ? `${t.quoteAmount}` : '已询价'}
                      />
                    ) : null}
                    <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); openEdit(t) }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              )
            })
          )}
        </Stack>
      </AppCard>

      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>新建维修工单</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="repair-asset-label">设备</InputLabel>
                <Select
                  labelId="repair-asset-label"
                  label="设备"
                  value={createAssetId}
                  onChange={(e) => setCreateAssetId(e.target.value)}
                >
                  {sortedAssets.map((a) => (
                    <MenuItem key={a.id} value={a.id} disabled={a.status === 'in-use'}>
                      {a.name} {a.status === 'in-use' ? '(使用中)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="故障/需求描述"
                value={createProblemDesc}
                onChange={(e) => setCreateProblemDesc(e.target.value)}
                fullWidth
                size="small"
                multiline
                minRows={2}
              />
              <DateTimePicker
                label="预计回归时间（可选）"
                value={createExpectedReturnAt}
                onChange={(v) => setCreateExpectedReturnAt(v)}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
              {assetsState.fallbackSource === 'chambers' ? (
                <Alert severity="warning">
                  当前设备列表来自旧的 chambers 集合；建议先做数据迁移以启用维修闭环更新。
                </Alert>
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>取消</Button>
            <Button
              variant="contained"
              onClick={handleSubmitCreate}
              disabled={!createAssetId || !createProblemDesc.trim() || ticketsState.loading}
            >
              创建
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={editOpen}
          onClose={() => {
            setEditOpen(false)
            setEditing(null)
          }}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>工单详情</DialogTitle>
          <DialogContent dividers>
            {!editing ? null : (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Stack spacing={0.25}>
                  <Typography variant="body2" color="text.secondary">
                    设备
                  </Typography>
                  <Typography sx={{ fontWeight: 800 }}>
                    {assetById.get(editing.assetId)?.name || editing.assetId}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Chip size="small" label={statusLabel[editing.status]} color={statusColor[editing.status]} />
                  <Chip size="small" variant="outlined" label={`停机: ${formatDays(calcDaysFrom(editing.createdAt))}`} />
                </Stack>
                <TextField
                  label="故障/需求描述"
                  value={editProblemDesc}
                  onChange={(e) => setEditProblemDesc(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                />

                <Divider />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="供应商（可选）"
                    value={editVendorName}
                    onChange={(e) => setEditVendorName(e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="报价（可选）"
                    value={editQuoteAmount}
                    onChange={(e) => setEditQuoteAmount(e.target.value)}
                    fullWidth
                    size="small"
                    inputProps={{ inputMode: 'decimal' }}
                  />
                </Stack>

                <DateTimePicker
                  label="预计回归时间（可选）"
                  value={editExpectedReturnAt}
                  onChange={(v) => setEditExpectedReturnAt(v)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />

                {editing.timeline && editing.timeline.length > 0 ? (
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
                      流转记录
                    </Typography>
                    {editing.timeline
                      .slice()
                      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                      .slice(0, 6)
                      .map((e, idx) => (
                        <Typography key={`${e.at}-${idx}`} variant="caption" color="text.secondary" noWrap>
                          {new Date(e.at).toLocaleString()} · {e.from ? statusLabel[e.from] : '创建'} → {statusLabel[e.to]}
                          {e.note ? ` · ${e.note}` : ''}
                        </Typography>
                      ))}
                  </Stack>
                ) : null}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between' }}>
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={!editing || ticketsState.loading}
            >
              删除
            </Button>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button onClick={() => setEditOpen(false)}>关闭</Button>
              <Button variant="outlined" onClick={handleSubmitEdit} disabled={!editing || ticketsState.loading}>
                保存
              </Button>
              {editing?.status === 'quote-pending' ? (
                <Button
                  variant="contained"
                  startIcon={<LocalOfferIcon />}
                  onClick={handleMarkQuoted}
                  disabled={!editing || !editVendorName.trim() || !editQuoteAmount || ticketsState.loading}
                >
                  标记已询价
                </Button>
              ) : null}
              {editing?.status === 'repair-pending' ? (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleOutlineIcon />}
                  onClick={handleMarkCompleted}
                  disabled={!editing || ticketsState.loading}
                >
                  维修完成
                </Button>
              ) : null}
            </Stack>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="确认删除"
        description="确定要删除该维修工单吗？删除后将尝试把设备状态恢复为“可用”。"
        confirmText="删除"
        confirmColor="error"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </PageShell>
  )
}

export default RepairsPage
