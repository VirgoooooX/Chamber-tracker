// src/pages/TimelinePage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Container, Box, Typography, CircularProgress, Button, Alert } from '@mui/material'; // Alert 导入
import AddIcon from '@mui/icons-material/Add';
import ScrollingTimeline from '../components/ScrollingTimeline';
import UsageLogDetails from '../components/UsageLogDetails';
import UsageLogForm from '../components/UsageLogForm';
import { UsageLog } from '../types';
import { fetchUsageLogs, removeConfigFromUsageLog } from '../store/usageLogsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { getEffectiveUsageLogStatus } from '../utils/statusHelpers'

const TimelinePage: React.FC = () => {
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const dispatch = useAppDispatch()
    const { usageLogs, loading, error } = useAppSelector((state) => state.usageLogs)

    const initialFetchDoneRef = useRef(false);

    const [isUsageLogFormOpen, setIsUsageLogFormOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<UsageLog | null>(null);

    const overdueCount = useMemo(() => {
        return usageLogs.reduce((count, log) => {
            return getEffectiveUsageLogStatus(log) === 'overdue' ? count + 1 : count
        }, 0)
    }, [usageLogs])

    const handleViewUsageLog = useCallback((logId: string) => {
        setSelectedLogId(logId);
        setDetailsOpen(true);
    }, []);

    const handleCloseDetails = useCallback(() => {
        setDetailsOpen(false);
        setSelectedLogId(null);
    }, []);

    const handleDeleteLog = useCallback(async (logId: string, configId: string) => {
        if (window.confirm('确定要删除此配置的使用记录吗？')) {
            try {
                await dispatch(removeConfigFromUsageLog({ logId, configId })).unwrap();
                // Optionally, show a success notification
            } catch (error) { 
                // Optionally, show an error notification
                console.error('Failed to remove config from log:', error);
            }
        }
    }, [dispatch]);

    useEffect(() => {
        // 只有在非加载状态且首次获取未完成时才 dispatch
        if (!loading && !initialFetchDoneRef.current) {
            dispatch(fetchUsageLogs());
            initialFetchDoneRef.current = true;
        }
    }, [dispatch, loading]); // 依赖 dispatch 和 loading 状态

    const handleOpenNewUsageLogForm = useCallback(() => {
        setEditingLog(null); // 确保是新建模式
        setIsUsageLogFormOpen(true);
    }, []);

    const handleCloseUsageLogForm = useCallback((success?: boolean) => {
        setIsUsageLogFormOpen(false);
        setEditingLog(null); // 清除编辑状态
        if (success) {
            // 登记/编辑成功后的操作，例如显示提示或刷新列表
            // 如果 Redux slice 能正确更新列表，通常不需要手动再次 fetchUsageLogs
            // dispatch(fetchUsageLogs()); 
        }
    }, []);

    return (
        <Container
            maxWidth={false} // 允许内容占据全部可用宽度
            disableGutters    // 移除容器的默认左右内边距
            sx={{
                height: '100%', // 确保容器占据其父元素的全部高度
                display: 'flex',
                flexDirection: 'column',
                p: 0, // 移除容器自身的内边距，让子元素控制
            }}
        >
            <Box // 主内容容器，垂直排列
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1, // 占据所有可用垂直空间
                overflow: 'hidden', // 防止自身出现滚动条，由内部的 ScrollingTimeline 控制滚动
              }}
            >
                {/* 顶部区域：标题和“登记新使用记录”按钮 */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between', // 使标题和按钮分布在两端
                        alignItems: 'center', // 垂直居中对齐
                        p: 2, // 内边距
                        pb: 1, // 底部内边距略小，使标题行更紧凑
                        backgroundColor: '#fff', // 背景色
                        borderBottom: '1px solid #eee', // 底部边框
                        flexShrink: 0, // 防止此 Box 在 flex 布局中被压缩
                    }}
                >
                    <Typography
                        variant="h5"
                        component="h1"
                        sx={{
                            color: '#1976d2', // Material UI 主题蓝色
                            // textShadow: '1px 1px 2px rgba(0, 0, 0, 0.1)', // 可选：较柔和的文本阴影
                            fontWeight: 'medium', // 字体加粗程度
                        }}
                    >
                        时间轴视图
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        size="small" // 按钮尺寸
                        startIcon={<AddIcon />}
                        onClick={handleOpenNewUsageLogForm} // 点击事件处理器
                        sx={{ whiteSpace: 'nowrap' }} // 防止按钮内文字换行
                    >
                        登记新使用记录
                    </Button>
                </Box>

                {overdueCount > 0 && (
                    <Box sx={{ px: 2, pb: 1, backgroundColor: '#fff', borderBottom: '1px solid #eee', flexShrink: 0 }}>
                        <Alert severity="error" variant="filled">
                            当前有 {overdueCount} 条超时未完成使用记录，请及时处理
                        </Alert>
                    </Box>
                )}

                {/* 时间轴主体内容区域 */}
                <Box
                  sx={{
                    flexGrow: 1, // 占据剩余的垂直空间
                    overflow: 'hidden', // 时间轴组件内部自己处理滚动
                    position: 'relative', // 为内部绝对定位的元素（如加载指示器）提供定位上下文
                  }}
                >
                    {loading && usageLogs.length === 0 ? ( // 初始加载且无数据时显示加载动画
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                            <Typography sx={{ ml: 2 }}>加载中...</Typography>
                        </Box>
                    ) : error ? ( // 加载出错时显示错误信息和重试按钮
                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', p:2 }}>
                            <Alert severity="error" sx={{width: '100%', maxWidth: '600px', mb: 2}}>
                                加载时间轴数据失败: {error}
                            </Alert>
                            <Button variant="outlined" onClick={() => { initialFetchDoneRef.current = false; dispatch(fetchUsageLogs()); }}>
                                重试
                            </Button>
                        </Box>
                    ) : ( // 数据加载成功后渲染时间轴
                        <ScrollingTimeline
                            usageLogs={usageLogs}
                            onViewUsageLog={handleViewUsageLog}
                            onDeleteUsageLog={handleDeleteLog}
                            // onAddNewUsageLog prop 已移除，因为按钮在此组件中直接处理
                        />
                    )}
                </Box>

                {/* 使用记录详情对话框 */}
                {detailsOpen && selectedLogId && (
                    <UsageLogDetails
                        open={detailsOpen}
                        onClose={handleCloseDetails}
                        logId={selectedLogId}
                    />
                )}

                {/* 登记/编辑使用记录表单对话框 */}
                {isUsageLogFormOpen && (
                    <UsageLogForm
                        open={isUsageLogFormOpen}
                        onClose={handleCloseUsageLogForm}
                        log={editingLog || undefined} // 传递正在编辑的记录或undefined (新建)
                    />
                )}
            </Box>
        </Container>
    );
};

export default TimelinePage;
