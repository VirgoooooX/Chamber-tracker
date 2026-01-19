// src/components/TestProjectList.tsx
import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Button, // <--- 新增导入 Button 组件
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AppCard from './AppCard';
import { format, parseISO, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TestProject } from '../types';
import { fetchTestProjects } from '../store/testProjectsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks'

// 定义 Props 接口
interface TestProjectListProps {
  onEdit: (testProject: TestProject) => void;
  onDelete: (id: string) => void;
}

const TestProjectList: React.FC<TestProjectListProps> = ({ onEdit, onDelete }) => {
  const dispatch = useAppDispatch()
  const { 
    testProjects, 
    loading, 
    error 
  } = useAppSelector((state) => state.testProjects)

  const dataFetchedRef = useRef(false);

  useEffect(() => {
    if (!loading && !dataFetchedRef.current) {
      dispatch(fetchTestProjects()).finally(() => {
        dataFetchedRef.current = true;
      });
    }
  }, [dispatch, loading]); 

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = parseISO(dateString);
    if (!isValid(date)) return '无效日期';
    return format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  };

  if (loading && !dataFetchedRef.current) { 
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>正在加载测试项目列表...</Typography>
      </Box>
    );
  }

  if (error && !loading) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        加载测试项目列表失败: {error}
        <Button // 现在 Button 组件应该能被正确识别了
            size="small" 
            onClick={() => {
                dataFetchedRef.current = false; 
                dispatch(fetchTestProjects());
            }} 
            sx={{ ml: 2 }}
        >
            重试
        </Button>
      </Alert>
    );
  }

  return (
    <AppCard title="测试项目列表" contentSx={{ mx: -2.5, mb: -2.5 }}>
      <TableContainer component={Box} sx={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
        <Table sx={{ minWidth: 650 }} aria-label="测试项目列表" size="small">
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">温度 (°C)</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">湿度 (%)</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">时长 (小时)</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>关联项目 ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>创建时间</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {testProjects.length === 0 && !loading && dataFetchedRef.current ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  没有找到测试项目数据。
                </TableCell>
              </TableRow>
            ) : (
              testProjects.map((tp) => (
                <TableRow key={tp.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {tp.name}
                  </TableCell>
                  <TableCell align="right">{tp.temperature}</TableCell>
                  <TableCell align="right">{tp.humidity}</TableCell>
                  <TableCell align="right">{tp.duration}</TableCell>
                  <TableCell>{tp.projectId || '无'}</TableCell>
                  <TableCell>{formatDate(tp.createdAt)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="编辑">
                      <IconButton onClick={() => onEdit(tp)} size="small" color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton onClick={() => onDelete(tp.id)} size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </AppCard>
  );
};

export default TestProjectList;
