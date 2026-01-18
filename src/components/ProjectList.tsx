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
  Chip
} from '@mui/material';
import { fetchProjects, deleteProject } from '../store/projectsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks'

interface ProjectListProps {
  onEdit: (id: string) => void;
  onAddNew: () => void;
  onViewDetails: (id: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onEdit, onAddNew, onViewDetails }) => {
  const dispatch = useAppDispatch()
  const { projects, loading, error } = useAppSelector((state) => state.projects)

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个项目吗？')) {
      dispatch(deleteProject(id));
    }
  };

  if (loading) return <Typography>加载中...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" component="h2">项目列表</Typography>
        <Button variant="contained" color="primary" onClick={onAddNew}>
          添加项目
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>描述</TableCell>
              <TableCell>配置数量</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">暂无数据</TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>{project.description || '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${project.configs?.length ?? 0}个配置`} 
                      color="primary" 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{new Date(project.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      onClick={() => onViewDetails(project.id)}
                      sx={{ mr: 1 }}
                    >
                      详情
                    </Button>
                    <Button 
                      size="small" 
                      onClick={() => onEdit(project.id)}
                      sx={{ mr: 1 }}
                    >
                      编辑
                    </Button>
                    <Button 
                      size="small" 
                      color="error" 
                      onClick={() => handleDelete(project.id)}
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ProjectList;
