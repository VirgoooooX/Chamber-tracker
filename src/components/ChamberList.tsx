import React, { useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Chip,
  Alert,
  CircularProgress // 添加导入
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add'; // 添加导入
import { fetchChambers, deleteChamber } from '../store/chambersSlice';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppDispatch, useAppSelector } from '../store/hooks'

interface ChamberListProps {
  onEdit: (id: string) => void;
  onAddNew: () => void;
}

const ChamberList: React.FC<ChamberListProps> = ({ onEdit, onAddNew }) => {
  const dispatch = useAppDispatch()
  const { chambers, loading, error } = useAppSelector((state) => state.chambers)

  useEffect(() => {
    dispatch(fetchChambers());
  }, [dispatch]);

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个环境箱吗？')) {
      dispatch(deleteChamber(id));
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">加载环境箱列表失败: {error}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">环境箱列表</Typography>
        <Button variant="contained" color="primary" onClick={onAddNew} startIcon={<AddIcon />}>
          添加环境箱
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>描述</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>厂商</TableCell>
              <TableCell>型号</TableCell>
              <TableCell>校验日期</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chambers.map((chamber) => (
              <TableRow key={chamber.id}>
                <TableCell>{chamber.name}</TableCell>
                <TableCell>{chamber.description || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={chamber.status === 'available' ? '可用' : chamber.status === 'in-use' ? '使用中' : '维护中'} 
                    color={chamber.status === 'available' ? 'success' : chamber.status === 'in-use' ? 'warning' : 'error'} 
                  />
                </TableCell>
                <TableCell>{chamber.manufacturer}</TableCell>
                <TableCell>{chamber.model}</TableCell>
                <TableCell>
                  {chamber.calibrationDate ? new Date(chamber.calibrationDate).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>{new Date(chamber.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton onClick={() => onEdit(chamber.id)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(chamber.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ChamberList;
