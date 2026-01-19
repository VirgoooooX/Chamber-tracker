// src/components/Layout.tsx
import React, { ReactNode, useState } from 'react'; // useState for potential FAB group open/close
import { useNavigate } from 'react-router-dom'; // useNavigate for programmatic navigation
import {
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  Box,
  SpeedDial, // MUI SpeedDial component for a nice menu effect
  SpeedDialIcon,
  SpeedDialAction,
  Button, // <<< Add Button here
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Icons for new navigation
import AcUnitIcon from '@mui/icons-material/AcUnit'; // 环境箱管理
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'; // 项目管理
import ScienceIcon from '@mui/icons-material/Science'; // 测试项目管理
import ListAltIcon from '@mui/icons-material/ListAlt'; // 使用记录管理
import TimelineIcon from '@mui/icons-material/ViewTimeline'; // 时间轴视图 (主视图)
import DashboardIcon from '@mui/icons-material/Dashboard'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import SettingsIcon from '@mui/icons-material/Settings'
// import MoreVertIcon from '@mui/icons-material/MoreVert'; // Alternative for FAB group trigger
// import MenuIcon from '@mui/icons-material/Menu'; // Alternative for SpeedDial trigger

import { logout } from '../store/authSlice'; // 新增
import ExitToAppIcon from '@mui/icons-material/ExitToApp'; // 新增 (登出图标)
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { alpha } from '@mui/material/styles'

const appBarHeight = '64px';
const APP_NAME = '设备资产管理平台'

interface LayoutProps {
  children: ReactNode;
}

// Styled Box for the FAB group container
const FabContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(4), // Adjust spacing from bottom
  right: theme.spacing(4),  // Adjust spacing from right
  zIndex: theme.zIndex.speedDial, // Ensure it's above other content
}));


// 原始的 actions 定义
const allActions = [
  { icon: <DashboardIcon />, name: 'KPI 面板', path: '/dashboard', roles: ['admin', 'user'] },
  { icon: <NotificationsActiveIcon />, name: '告警中心', path: '/alerts', roles: ['admin', 'user'] },
  { icon: <AcUnitIcon />, name: '环境箱管理', path: '/chambers', roles: ['admin'] },
  { icon: <BusinessCenterIcon />, name: '项目管理', path: '/projects', roles: ['admin'] },
  { icon: <ScienceIcon />, name: '测试项目管理', path: '/test-projects', roles: ['admin'] },
  { icon: <ListAltIcon />, name: '使用记录管理', path: '/usage-logs', roles: ['admin', 'user'] },
  { icon: <TimelineIcon />, name: '时间线视图', path: '/timeline', roles: ['admin', 'user'] },
  { icon: <SettingsIcon />, name: '设置', path: '/settings', roles: ['admin', 'user'] },
];


const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch()
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  const handleSpeedDialOpen = () => setSpeedDialOpen(true);
  const handleSpeedDialClose = () => setSpeedDialOpen(false);

  const handleActionClick = (path: string) => {
    navigate(path);
    setSpeedDialOpen(false);
  };

  const handleLogout = () => { // 新增
    dispatch(logout());
    navigate('/login');
    setSpeedDialOpen(false);
  };

  // 根据用户角色和认证状态过滤 SpeedDial actions
  const getFilteredActions = () => {
    if (!isAuthenticated || !user) {
      return []; // 未登录不显示任何操作，或只显示登录
    }
    return allActions.filter(action => action.roles.includes(user.role));
  };

  const filteredActions = getFilteredActions();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.96)} 0%, ${alpha(theme.palette.primary.dark, 0.94)} 100%)`,
          color: 'primary.contrastText',
          height: appBarHeight,
          boxShadow: (theme) => `0 10px 28px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.18)}`,
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontSize: '24px', // 可以适当调整字体大小
                fontWeight: 'bold',
                // textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)', // 可以调整阴影
              }}
            >
              {APP_NAME} {user ? (user.username === user.role ? `(${user.username})` : `(${user.username} - ${user.role})`) : ''}
            </Typography>
          </Box>
          {isAuthenticated && (
            <Button
              color="inherit"
              startIcon={<ExitToAppIcon />}
              onClick={handleLogout}
            >
              登出
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: 'background.default',
          paddingTop: appBarHeight, // Space for the fixed AppBar
          // height: '100vh', // 高度由外层 Box 控制
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden', // Main area itself should not scroll
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto', // Content within this Box scrolls if needed
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            // p: 3, // 可以给内容区域一些通用内边距
          }}
        >
          {children} {/* This will be ScrollingTimeline directly or via TimelinePage */}
        </Box>
      </Box>

      {/* Footer Section */}
      <Box
        component="footer"
        sx={{
          py: 1, // 垂直方向的内边距
          px: 2, // 水平方向的内边距
          mt: 'auto', // 将页脚推到底部
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
          textAlign: 'center',
          borderTop: '1px solid',
          borderTopColor: 'divider',
          flexShrink: 0, // 防止页脚在内容不足时缩小
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {'© '}
          {new Date().getFullYear()}
          {' Jabil 内部专用 · All Rights Reserved · By Vigoss'}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          版本 1.0.0
        </Typography>
      </Box>

      {/* Floating Action Button Group / Speed Dial */}
      {isAuthenticated && (
        <FabContainer>
          <SpeedDial
            ariaLabel="Navigation speed dial"
            icon={<SpeedDialIcon />}
            onClose={handleSpeedDialClose}
            onOpen={handleSpeedDialOpen}
            open={speedDialOpen}
            direction="up"
            sx={{
              '& .MuiFab-primary': {
                backgroundColor: 'primary.main',
                boxShadow: (theme) => `0 16px 34px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.22)}`,
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            }}
          >
            {filteredActions.map((action) => (
              <SpeedDialAction
                key={action.name}
                icon={action.icon}
                tooltipTitle={action.name}
                tooltipOpen
                onClick={() => handleActionClick(action.path)}
                FabProps={{
                  size: 'medium',
                  sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.10),
                      borderColor: (theme) => alpha(theme.palette.primary.main, 0.32),
                    },
                  }
                }}
              />
            ))}
          </SpeedDial>
        </FabContainer>
      )}
    </Box>
  );
};

export default Layout;
