import React from 'react'
import DashboardIcon from '@mui/icons-material/Dashboard'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import ListAltIcon from '@mui/icons-material/ListAlt'
import TimelineIcon from '@mui/icons-material/ViewTimeline'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'
import ScienceIcon from '@mui/icons-material/Science'
import SettingsIcon from '@mui/icons-material/Settings'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import type { SvgIconProps } from '@mui/material'

export type NavRole = 'admin' | 'user'

export type NavSectionId = 'overview' | 'ops' | 'resources' | 'system'

export interface NavItem {
  id: string
  section: NavSectionId
  label: string
  description?: string
  path: string
  roles: NavRole[]
  icon: React.ReactElement
  order: number
  quick?: boolean
}

export interface NavSection {
  id: NavSectionId
  label: string
  icon: React.ReactElement
  order: number
}

export const navSections: NavSection[] = [
  { id: 'overview', label: '总览', icon: <DashboardIcon />, order: 10 },
  { id: 'ops', label: '运营', icon: <NotificationsActiveIcon />, order: 20 },
  { id: 'resources', label: '资源', icon: <AcUnitIcon />, order: 30 },
  { id: 'system', label: '系统', icon: <SettingsIcon />, order: 40 },
]

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    section: 'overview',
    label: '总览',
    description: '关键指标、使用率与校准提醒',
    path: '/dashboard',
    roles: ['admin', 'user'],
    icon: <DashboardIcon />,
    order: 10,
    quick: true,
  },
  {
    id: 'timeline',
    section: 'overview',
    label: '使用时间线',
    description: '按时间轴查看设备占用情况',
    path: '/timeline',
    roles: ['admin', 'user'],
    icon: <TimelineIcon />,
    order: 20,
  },
  {
    id: 'alerts',
    section: 'ops',
    label: '告警中心',
    description: '校准到期、逾期、长占用',
    path: '/alerts',
    roles: ['admin', 'user'],
    icon: <NotificationsActiveIcon />,
    order: 10,
    quick: true,
  },
  {
    id: 'usageLogs',
    section: 'ops',
    label: '使用记录',
    description: '登记、查询与导出使用记录',
    path: '/usage-logs',
    roles: ['admin', 'user'],
    icon: <ListAltIcon />,
    order: 20,
    quick: true,
  },
  {
    id: 'repairs',
    section: 'ops',
    label: '维修管理',
    description: '维修工单与状态追踪',
    path: '/repairs',
    roles: ['admin'],
    icon: <BuildCircleIcon />,
    order: 30,
    quick: true,
  },
  {
    id: 'assets',
    section: 'resources',
    label: '设备台账',
    description: '设备信息、状态与校准日期',
    path: '/chambers',
    roles: ['admin'],
    icon: <AcUnitIcon />,
    order: 10,
    quick: true,
  },
  {
    id: 'projects',
    section: 'resources',
    label: '项目',
    description: '客户项目与配置管理',
    path: '/projects',
    roles: ['admin'],
    icon: <BusinessCenterIcon />,
    order: 20,
  },
  {
    id: 'testProjects',
    section: 'resources',
    label: '测试项目',
    description: '测试项目/计划管理',
    path: '/test-projects',
    roles: ['admin'],
    icon: <ScienceIcon />,
    order: 30,
  },
  {
    id: 'settings',
    section: 'system',
    label: '设置',
    description: '外观、阈值、自动刷新与数据迁移',
    path: '/settings',
    roles: ['admin', 'user'],
    icon: <SettingsIcon />,
    order: 10,
  },
]
