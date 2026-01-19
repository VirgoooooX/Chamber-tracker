import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add'; // 添加导入
import { fetchAssetsByType, deleteAsset } from '../store/assetsSlice'
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import ConfirmDialog from './ConfirmDialog';
import AppCard from './AppCard';
import TitleWithIcon from './TitleWithIcon'
import AcUnitIcon from '@mui/icons-material/AcUnit'

interface ChamberListProps {
  onEdit: (id: string) => void;
  onAddNew: () => void;
}

const ChamberList: React.FC<ChamberListProps> = ({ onEdit, onAddNew }) => {
  const dispatch = useAppDispatch()
  const { assets: chambers, loading, error } = useAppSelector((state) => state.assets)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const details = chambers.find((c) => c.id === detailsId) || null

  useEffect(() => {
    dispatch(fetchAssetsByType('chamber'));
  }, [dispatch]);

  const handleDeleteClick = (id: string) => setPendingDeleteId(id);

  const handleCloseDelete = () => setPendingDeleteId(null);

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    dispatch(deleteAsset(pendingDeleteId));
    setPendingDeleteId(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>正在加载设备列表...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">加载设备列表失败: {error}</Alert>;
  }

  return (
    <Box>
      <AppCard
        title={<TitleWithIcon icon={<AcUnitIcon />}>设备列表</TitleWithIcon>}
        actions={
          <Button variant="contained" color="primary" onClick={onAddNew} startIcon={<AddIcon />}>
            新增设备
          </Button>
        }
        contentSx={{ mx: -2.5, mb: -2.5 }}
      >
        <TableContainer component={Box} sx={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
          <Table size="small">
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>资产号</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>位置</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>厂商</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>型号</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>校验日期</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>创建时间</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chambers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              chambers.map((chamber) => (
                <TableRow key={chamber.id} hover>
                  <TableCell sx={{ fontWeight: 650 }}>{chamber.assetCode || '-'}</TableCell>
                  <TableCell>{chamber.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={chamber.status === 'available' ? '可用' : chamber.status === 'in-use' ? '使用中' : '维护中'} 
                      color={chamber.status === 'available' ? 'success' : chamber.status === 'in-use' ? 'warning' : 'error'} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{chamber.location || '-'}</TableCell>
                  <TableCell>{chamber.manufacturer || '-'}</TableCell>
                  <TableCell>{chamber.model || '-'}</TableCell>
                  <TableCell>
                    {chamber.calibrationDate ? new Date(chamber.calibrationDate).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>{new Date(chamber.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => setDetailsId(chamber.id)} size="small" color="info">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => onEdit(chamber.id)} size="small" color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteClick(chamber.id)} size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </TableContainer>
      </AppCard>
      <Dialog open={Boolean(details)} onClose={() => setDetailsId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>设备详情</DialogTitle>
        <DialogContent dividers>
          {details ? (
            <Stack spacing={1.25}>
              <Typography variant="body2" color="text.secondary">
                资产号
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{details.assetCode || '-'}</Typography>

              <Typography variant="body2" color="text.secondary">
                名称
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{details.name}</Typography>

              <Typography variant="body2" color="text.secondary">
                位置
              </Typography>
              <Typography>{details.location || '-'}</Typography>

              <Typography variant="body2" color="text.secondary">
                状态
              </Typography>
              <Typography>{details.status}</Typography>

              <Typography variant="body2" color="text.secondary">
                厂商 / 型号
              </Typography>
              <Typography>{`${details.manufacturer || '-'} / ${details.model || '-'}`}</Typography>

              <Typography variant="body2" color="text.secondary">
                描述
              </Typography>
              <Typography>{details.description || '-'}</Typography>

              <Typography variant="body2" color="text.secondary">
                校验日期
              </Typography>
              <Typography>{details.calibrationDate ? new Date(details.calibrationDate).toLocaleString() : '-'}</Typography>

              <Typography variant="body2" color="text.secondary">
                更新时间
              </Typography>
              <Typography>{details.updatedAt ? new Date(details.updatedAt).toLocaleString() : '-'}</Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsId(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="确认删除"
        description="您确定要删除这个设备吗？此操作无法撤销。"
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
};

export default ChamberList;
