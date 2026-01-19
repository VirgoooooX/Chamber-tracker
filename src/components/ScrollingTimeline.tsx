// src/components/ScrollingTimeline.tsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { UsageLog, Project, TestProject } from '../types';
import { fetchChambers } from '../store/chambersSlice';
import { fetchProjects } from '../store/projectsSlice';
import { fetchTestProjects } from '../store/testProjectsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks'
import styles from './ScrollingTimeline.module.css';
import {
  format, addDays, eachDayOfInterval, startOfDay as dateFnsStartOfDay,
  differenceInMinutes, max, min, getDay, parseISO, isEqual, getYear,
  setHours, setMinutes, setSeconds, setMilliseconds, addHours, // 确保 addHours 已导入
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getEffectiveUsageLogStatus } from '../utils/statusHelpers';
import { Box, Typography, Tooltip, CircularProgress, Alert } from '@mui/material';

export const CUSTOM_DAY_START_HOUR = 7;

interface HolidayDetail {
  holiday: boolean;
  name: string;
  wage: number;
  date: string;
  rest?: number;
  after?: boolean;
  target?: string;
}

interface ApiHolidayResponse {
  code: number;
  holiday?: {
    [monthDayOrFullDate: string]: HolidayDetail;
  };
}

interface ScrollingTimelineProps {
  usageLogs: UsageLog[];
  onViewUsageLog: (logId: string) => void;
  onDeleteUsageLog?: (logId: string, configId: string) => void;
  regionCode?: 'cn' | 'tw';
}

export const DAY_WIDTH_PX = 200;
export const MIN_ROW_HEIGHT_PX = 50;
export const HEADER_HEIGHT_PX = 70;
export const CHAMBER_NAME_WIDTH_PX = 150;

const ITEM_BAR_HEIGHT = 24;
const ITEM_BAR_VERTICAL_MARGIN = 5;
const ITEM_BAR_TOTAL_HEIGHT = ITEM_BAR_HEIGHT + ITEM_BAR_VERTICAL_MARGIN;

export interface TimelineUsageLogDisplayData extends Omit<UsageLog, 'id' | 'selectedConfigIds'> {
  displayId: string;
  originalLogId: string;
  configId?: string;
  projectName?: string;
  testProjectName?: string;
  configName?: string;
  effectiveStatus: UsageLog['status'];
}

interface StatusStyling {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export const getBarStylingByEffectiveStatus = (status: UsageLog['status']): StatusStyling => {
  switch (status) {
    case 'completed':   return { backgroundColor: '#C8E6C9', borderColor: '#A5D6A7', textColor: '#388E3C' };
    case 'in-progress': return { backgroundColor: '#FFF3E0', borderColor: '#FFCC80', textColor: '#795548' };
    case 'not-started': return { backgroundColor: '#E3F2FD', borderColor: '#90CAF9', textColor: '#1E88E5' };
    case 'overdue':     return { backgroundColor: '#FFCDD2', borderColor: '#EF9A9A', textColor: '#C62828' };
    default:            return { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0', textColor: '#757575' };
  }
};

export const generateDateHeaders = (currentDate: Date, daysBefore: number, daysAfter: number) => {
  let baseDateForCurrentView = setMilliseconds(setSeconds(setMinutes(setHours(dateFnsStartOfDay(currentDate), CUSTOM_DAY_START_HOUR), 0), 0), 0);

  if (currentDate.getHours() < CUSTOM_DAY_START_HOUR) {
    baseDateForCurrentView = addDays(baseDateForCurrentView, -1);
  }
  
  const viewStartDate = addDays(baseDateForCurrentView, -daysBefore);
  const viewEndDate = addDays(baseDateForCurrentView, daysAfter);
  
  const intervalCalendarDays = eachDayOfInterval({ 
    start: dateFnsStartOfDay(viewStartDate),
    end: dateFnsStartOfDay(viewEndDate)
  });
  
  return intervalCalendarDays.map(calendarDay => {
    return setMilliseconds(setSeconds(setMinutes(setHours(calendarDay, CUSTOM_DAY_START_HOUR), 0), 0), 0);
  });
};

// --- calculateBarPositionAndWidth (修改为计算单个连续条) ---
export const calculateBarPositionAndWidth = (
  log: UsageLog,
  timelineViewActualStart: Date, // 整个可见时间轴的起始点 (例如 dateHeaders[0])
  timelineViewActualEnd: Date,   // 整个可见时间轴的结束点 (例如 addDays(dateHeaders[last], 1))
  effectiveStatus: UsageLog['status']
) => {
  const logStartTime = parseISO(log.startTime);
  let logEndTimeDate;

  if (log.endTime) {
    logEndTimeDate = parseISO(log.endTime);
  } else {
    if (effectiveStatus === 'in-progress' || effectiveStatus === 'overdue') {
      logEndTimeDate = new Date();
    } else {
      logEndTimeDate = addHours(logStartTime, 1); // 默认1小时，以便显示
    }
  }
  if (!logEndTimeDate || isNaN(logEndTimeDate.valueOf())) {
    logEndTimeDate = addHours(logStartTime, 1);
  }

  // 检查日志是否在整个可见时间轴范围之外
  if (logEndTimeDate <= timelineViewActualStart || logStartTime >= timelineViewActualEnd) {
    return { left: 0, width: 0, display: false };
  }

  // 确定条在屏幕上的实际显示开始和结束时间
  const displayStartTime = max([logStartTime, timelineViewActualStart]);
  const displayEndTime = min([logEndTimeDate, timelineViewActualEnd]);

  if (displayStartTime >= displayEndTime) {
    return { left: 0, width: 0, display: false };
  }

  // left: 是 displayStartTime 相对于 timelineViewActualStart (7点) 的偏移
  const leftOffsetMinutes = differenceInMinutes(displayStartTime, timelineViewActualStart);
  // width: 是 displayEndTime 和 displayStartTime 之间的时长
  const displayDurationMinutes = differenceInMinutes(displayEndTime, displayStartTime);

  const minutesInDay = 24 * 60; // DAY_WIDTH_PX 代表的是24小时

  const finalLeft = (leftOffsetMinutes / minutesInDay) * DAY_WIDTH_PX;
  const finalWidth = (displayDurationMinutes / minutesInDay) * DAY_WIDTH_PX;
  
  return { left: finalLeft, width: Math.max(finalWidth, 2), display: true };
};


export const formatDateHeader = (date: Date): string => {
  const dayOfWeekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${format(date, 'M/d', { locale: zhCN })} ${dayOfWeekNames[getDay(date)]}`;
};

const isWeekend = (date: Date): boolean => {
  const dayOfWeek = getDay(date);
  return dayOfWeek === 0 || dayOfWeek === 6;
};

export const getTimelineDisplayData = ( /* ... (保持不变) ... */
    passedUsageLogs: UsageLog[] = [],
    projectsFromStore: Project[] = [],
    testProjectsFromStore: TestProject[] = [],
): TimelineUsageLogDisplayData[] => {
    const displayDataList: TimelineUsageLogDisplayData[] = [];
    const now = new Date();
    if (!passedUsageLogs) return [];

    const projectById = new Map<string, Project>();
    projectsFromStore.forEach((p) => projectById.set(p.id, p));
    const testProjectById = new Map<string, TestProject>();
    testProjectsFromStore.forEach((tp) => testProjectById.set(tp.id, tp));
    const projectConfigByIdCache = new Map<string, Map<string, { name: string }>>();

    passedUsageLogs.forEach(log => {
        const project = log.projectId ? projectById.get(log.projectId) : undefined;
        const testProject = log.testProjectId ? testProjectById.get(log.testProjectId) : undefined;
        const effectiveStatus = getEffectiveUsageLogStatus(log, now);
        
        const { id: originalLogIdFromLog, selectedConfigIds: logSelectedConfigIds, ...restOfLogBase } = log;
        const restOfLog = restOfLogBase as Omit<UsageLog, 'id' | 'selectedConfigIds'>;

        if (logSelectedConfigIds && logSelectedConfigIds.length > 0) {
            let configById: Map<string, { name: string }> | undefined;
            if (project) {
                configById = projectConfigByIdCache.get(project.id);
                if (!configById) {
                    configById = new Map<string, { name: string }>();
                    project.configs?.forEach((c) => configById!.set(c.id, { name: c.name }));
                    projectConfigByIdCache.set(project.id, configById);
                }
            }

            logSelectedConfigIds.forEach(configId => {
                const config = configById?.get(configId);
                displayDataList.push({
                    ...restOfLog,
                    chamberId: log.chamberId,
                    user: log.user,
                    startTime: log.startTime,
                    endTime: log.endTime,
                    status: log.status,
                    notes: log.notes,
                    projectId: log.projectId,
                    testProjectId: log.testProjectId,
                    createdAt: log.createdAt,
                    selectedWaterfall: log.selectedWaterfall,
                    displayId: `${originalLogIdFromLog}-${configId}`,
                    originalLogId: originalLogIdFromLog,
                    configId: configId,
                    projectName: project?.name,
                    testProjectName: testProject?.name,
                    configName: config?.name || '未知配置',
                    effectiveStatus: effectiveStatus,
                });
            });
        } else {
            displayDataList.push({
                ...restOfLog,
                chamberId: log.chamberId,
                user: log.user,
                startTime: log.startTime,
                endTime: log.endTime,
                status: log.status,
                notes: log.notes,
                projectId: log.projectId,
                testProjectId: log.testProjectId,
                createdAt: log.createdAt,
                selectedWaterfall: log.selectedWaterfall,
                displayId: originalLogIdFromLog,
                originalLogId: originalLogIdFromLog,
                projectName: project?.name,
                testProjectName: testProject?.name,
                configName: '无特定配置',
                effectiveStatus: effectiveStatus,
            });
        }
    });
    return displayDataList;
};
const assignTracksToLogs = (logs: TimelineUsageLogDisplayData[]): (TimelineUsageLogDisplayData & { trackIndex: number })[] => { /* ... (保持不变) ... */
    if (!logs || logs.length === 0) return [];

    const sortedLogs = [...logs].sort((a, b) => {
        const aStartTime = parseISO(a.startTime);
        const bStartTime = parseISO(b.startTime);
        const startTimeDiff = aStartTime.getTime() - bStartTime.getTime();
        if (startTimeDiff !== 0) return startTimeDiff;

        const aEndTimeVal = a.endTime ? parseISO(a.endTime).getTime() : addDays(aStartTime, 1).getTime();
        const bEndTimeVal = b.endTime ? parseISO(b.endTime).getTime() : addDays(bStartTime, 1).getTime();
        
        const aDuration = aEndTimeVal - aStartTime.getTime();
        const bDuration = bEndTimeVal - bStartTime.getTime();
        return aDuration - bDuration;
    });

    const layout: (TimelineUsageLogDisplayData & { trackIndex: number })[] = [];
    const tracks: { logs: TimelineUsageLogDisplayData[] }[] = [];

    for (const log of sortedLogs) {
        let assignedTrackIndex = -1;
        const logStartTimeDt = parseISO(log.startTime);
        let logEndTimeDt: Date;
        if (log.endTime) {
            logEndTimeDt = parseISO(log.endTime);
        } else {
            if (log.effectiveStatus === 'in-progress' || log.effectiveStatus === 'overdue') {
                logEndTimeDt = new Date();
            } else {
                logEndTimeDt = addDays(logStartTimeDt, 1);
            }
        }
        if (isNaN(logEndTimeDt.valueOf())) logEndTimeDt = addDays(logStartTimeDt, 1);

        for (let i = 0; i < tracks.length; i++) {
            const overlaps = tracks[i].logs.some(existingLog => {
                const existingLogStartTimeDt = parseISO(existingLog.startTime);
                let existingLogEndTimeDt: Date;
                if (existingLog.endTime) {
                    existingLogEndTimeDt = parseISO(existingLog.endTime);
                } else {
                    if (existingLog.effectiveStatus === 'in-progress' || existingLog.effectiveStatus === 'overdue') {
                        existingLogEndTimeDt = new Date();
                    } else {
                        existingLogEndTimeDt = addDays(existingLogStartTimeDt, 1);
                    }
                }
                if (isNaN(existingLogEndTimeDt.valueOf())) existingLogEndTimeDt = addDays(existingLogStartTimeDt, 1);

                return logStartTimeDt < existingLogEndTimeDt && existingLogStartTimeDt < logEndTimeDt;
            });

            if (!overlaps) {
                assignedTrackIndex = i;
                break;
            }
        }

        if (assignedTrackIndex === -1) {
            assignedTrackIndex = tracks.length;
            tracks.push({ logs: [] });
        }

        tracks[assignedTrackIndex].logs.push(log);
        layout.push({ ...log, trackIndex: assignedTrackIndex });
    }
    return layout;
};

const DeleteIconSvg: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( /* ... (保持不变) ... */
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ScrollingTimeline: React.FC<ScrollingTimelineProps> = ({
  usageLogs: propsUsageLogs = [],
  onViewUsageLog,
  onDeleteUsageLog,
  regionCode = 'cn',
}) => {
  const dispatch = useAppDispatch()
  const { chambers, loading: chambersLoading, error: chambersError } = useAppSelector((state) => state.chambers)
  const { projects, loading: projectsLoading, error: projectsError } = useAppSelector((state) => state.projects)
  const { testProjects, loading: testProjectsLoading, error: testProjectsError } = useAppSelector((state) => state.testProjects)
  const { loading: usageLogsDataLoading } = useAppSelector((state) => state.usageLogs)

  const [currentDateForTimeline, _setCurrentDateForTimeline] = useState(new Date());
  const daysBefore = 7;
  const daysAfter = 14;

  const [processedHolidays, setProcessedHolidays] = useState<Map<string, HolidayDetail>>(new Map());
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [holidaysError, setHolidaysError] = useState<string | null>(null);

  const dateHeaders = useMemo(() => generateDateHeaders(currentDateForTimeline, daysBefore, daysAfter), [currentDateForTimeline, daysBefore, daysAfter]);
  const totalTimelineWidth = useMemo(() => dateHeaders.length * DAY_WIDTH_PX, [dateHeaders.length]);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollPerformedForCurrentViewRef = useRef(false);

  const fetchAndProcessHolidaysForYearInternal = useCallback(async (year: number, region: string): Promise<Map<string, HolidayDetail>> => { /* ... (保持不变) ... */
    const yearHolidaysMap = new Map<string, HolidayDetail>();
    if (year === 2025 && region === 'cn') {
      const apiResponse: ApiHolidayResponse = {"code":0,"holiday":{"01-01":{"holiday":true,"name":"元旦","wage":3,"date":"2025-01-01","rest":17},"01-26":{"holiday":false,"name":"春节前补班","wage":1,"after":false,"target":"春节","date":"2025-01-26","rest":7},"01-28":{"holiday":true,"name":"除夕","wage":2,"date":"2025-01-28","rest":9},"01-29":{"holiday":true,"name":"初一","wage":3,"date":"2025-01-29","rest":1},"01-30":{"holiday":true,"name":"初二","wage":3,"date":"2025-01-30","rest":1},"01-31":{"holiday":true,"name":"初三","wage":3,"date":"2025-01-31","rest":1},"02-01":{"holiday":true,"name":"初四","wage":2,"date":"2025-02-01","rest":1},"02-02":{"holiday":true,"name":"初五","wage":2,"date":"2025-02-02","rest":1},"02-03":{"holiday":true,"name":"初六","wage":2,"date":"2025-02-03","rest":1},"02-04":{"holiday":true,"name":"初七","wage":2,"date":"2025-02-04","rest":1},"02-08":{"holiday":false,"name":"春节后补班","wage":1,"target":"春节","after":true,"date":"2025-02-08","rest":4},"04-04":{"holiday":true,"name":"清明节","wage":3,"date":"2025-04-04","rest":19},"04-05":{"holiday":true,"name":"清明节","wage":2,"date":"2025-04-05","rest":1},"04-06":{"holiday":true,"name":"清明节","wage":2,"date":"2025-04-06","rest":1},"04-27":{"holiday":false,"name":"劳动节前补班","wage":1,"target":"劳动节","after":false,"date":"2025-04-27","rest":17},"05-01":{"holiday":true,"name":"劳动节","wage":3,"date":"2025-05-01","rest":4},"05-02":{"holiday":true,"name":"劳动节","wage":2,"date":"2025-05-02","rest":1},"05-03":{"holiday":true,"name":"劳动节","wage":3,"date":"2025-05-03","rest":1},"05-04":{"holiday":true,"name":"劳动节","wage":3,"date":"2025-05-04","rest":1},"05-05":{"holiday":true,"name":"劳动节","wage":3,"date":"2025-05-05","rest":1},"05-31":{"holiday":true,"name":"端午节","wage":3,"date":"2025-05-31","rest":23},"06-01":{"holiday":true,"name":"端午节","wage":2,"date":"2025-06-01","rest":1},"06-02":{"holiday":true,"name":"端午节","wage":2,"date":"2025-06-02","rest":1},"09-28":{"holiday":false,"name":"国庆节前补班","after":false,"wage":1,"target":"国庆节","date":"2025-09-28","rest":89},"10-01":{"holiday":true,"name":"国庆节","wage":3,"date":"2025-10-01","rest":92},"10-02":{"holiday":true,"name":"国庆节","wage":3,"date":"2025-10-02","rest":1},"10-03":{"holiday":true,"name":"国庆节","wage":3,"date":"2025-10-03","rest":1},"10-04":{"holiday":true,"name":"国庆节","wage":2,"date":"2025-10-04","rest":1},"10-05":{"holiday":true,"name":"国庆节","wage":2,"date":"2025-10-05","rest":1},"10-06":{"holiday":true,"name":"中秋节","wage":2,"date":"2025-10-06","rest":1},"10-07":{"holiday":true,"name":"国庆节","wage":2,"date":"2025-10-07","rest":1},"10-08":{"holiday":true,"name":"国庆节","wage":2,"date":"2025-10-08","rest":1},"10-11":{"holiday":false,"after":true,"wage":1,"name":"国庆节后补班","target":"国庆节","date":"2025-10-11"}}};
      const holidayData = apiResponse.holiday;
      if (apiResponse.code === 0 && holidayData !== undefined) {
        Object.values(holidayData!).forEach(detail => {
          yearHolidaysMap.set(detail.date, detail);
        });
      } else {
         console.warn(`Hardcoded holiday data for ${year} (${region}) issue or no holiday object.`);
      }
      return yearHolidaysMap;
    }
    try {
      const response = await fetch(`/holidays/${region.toLowerCase()}/${year}.json`);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Holiday data file not found for year ${year}, region ${region}.`);
          return yearHolidaysMap;
        }
        throw new Error(`Failed to fetch holiday data for ${year} (${region}): ${response.statusText}`);
      }
      const fetchedData: ApiHolidayResponse = await response.json();
      const holidayData = fetchedData.holiday;
      if (fetchedData.code === 0 && holidayData !== undefined) {
        Object.values(holidayData).forEach(detail => {
          yearHolidaysMap.set(detail.date, detail);
        });
      } else {
        console.warn(`Invalid data format or error code in holiday data for ${year} (${region}).`);
      }
    } catch (err: any) {
      console.error(`Error fetching or processing holiday data for ${year} (${region}):`, err);
      throw err;
    }
    return yearHolidaysMap;
  }, []);
  useEffect(() => { /* ... (holiday loading useEffect - 保持不变) ... */
    const loadHolidaysForVisibleRange = async () => {
      if (dateHeaders.length === 0) {
        setHolidaysLoading(false);
        return;
      }
      setHolidaysLoading(true);
      setHolidaysError(null);
      const newHolidaysMap = new Map<string, HolidayDetail>();
      const yearsInView = new Set<number>();

      const startYear = getYear(dateHeaders[0]);
      const endYear = getYear(dateHeaders[dateHeaders.length - 1]);
      for (let y = startYear; y <= endYear; y++) {
        yearsInView.add(y);
      }
      if (yearsInView.size === 0 && dateHeaders.length > 0) {
          yearsInView.add(getYear(dateHeaders[0]));
      } else if (yearsInView.size === 0) {
          yearsInView.add(getYear(new Date()));
      }

      let overallErrorOccurred = false;
      for (const year of Array.from(yearsInView)) {
        try {
          const yearDataMap = await fetchAndProcessHolidaysForYearInternal(year, regionCode);
          yearDataMap.forEach((value, key) => newHolidaysMap.set(key, value));
        } catch (err: any) {
          overallErrorOccurred = true;
          console.error(`Error processing holidays for year ${year} in loadHolidaysForVisibleRange:`, err);
          if (!holidaysError) {
             setHolidaysError(err.message || `Failed to load holiday data for ${year}.`);
          }
        }
      }
      setProcessedHolidays(newHolidaysMap);
      if (overallErrorOccurred && newHolidaysMap.size > 0 && holidaysError) {
         console.warn("Some holiday data failed to load, but partial data is available.");
      }
      setHolidaysLoading(false);
    };

    loadHolidaysForVisibleRange();
  }, [dateHeaders, regionCode, fetchAndProcessHolidaysForYearInternal]);

  const getDayClassification = useCallback((date: Date): { /* ... (保持不变) ... */
    type: 'weekday' | 'weekendRest' | 'publicHolidayLowWage' | 'publicHolidayHighWage' | 'workdayOverride',
    name?: string
  } => {
    if (holidaysLoading && processedHolidays.size === 0 && dateHeaders.length > 0) {
        return { type: 'weekday' };
    }
    const dateStr = format(date, 'yyyy-MM-dd'); 
    const holidayInfo = processedHolidays.get(dateStr);

    if (holidayInfo) {
      if (holidayInfo.holiday) {
        if (holidayInfo.wage === 3) {
          return { type: 'publicHolidayHighWage', name: holidayInfo.name };
        }
        return { type: 'publicHolidayLowWage', name: holidayInfo.name };
      } else {
        return { type: 'workdayOverride', name: holidayInfo.name };
      }
    }
    if (isWeekend(date)) {
      return { type: 'weekendRest', name: '周末' };
    }
    return { type: 'weekday', name: '工作日' };
  }, [processedHolidays, holidaysLoading, dateHeaders.length]);

  useEffect(() => { /* ... (data fetching useEffect - 保持不变) ... */
    if (!chambersLoading && (!chambers || chambers.length === 0)) {
        dispatch(fetchChambers());
    }
    if (!projectsLoading && (!projects || projects.length === 0)) {
        dispatch(fetchProjects());
    }
    if (!testProjectsLoading && (!testProjects || testProjects.length === 0)) {
        dispatch(fetchTestProjects());
    }
  }, [
    dispatch,
    chambers, projects, testProjects,
    chambersLoading, projectsLoading, testProjectsLoading,
  ]);

  // 定义整个可见时间轴的开始和结束 (都是7AM的标记)
  const timelineViewActualStart = useMemo(() => {
    return dateHeaders.length > 0 ? dateHeaders[0] : setMilliseconds(setSeconds(setMinutes(setHours(dateFnsStartOfDay(new Date()), CUSTOM_DAY_START_HOUR),0),0),0);
  }, [dateHeaders]);

  const timelineViewActualEnd = useMemo(() => {
    return dateHeaders.length > 0 ? addDays(dateHeaders[dateHeaders.length - 1], 1) : addDays(setMilliseconds(setSeconds(setMinutes(setHours(dateFnsStartOfDay(new Date()), CUSTOM_DAY_START_HOUR),0),0),0), 1);
  }, [dateHeaders]);

  const usageLogById = useMemo(() => {
    const map = new Map<string, UsageLog>();
    (propsUsageLogs || []).forEach((l) => map.set(l.id, l));
    return map;
  }, [propsUsageLogs]);

  const timelineDisplayItems = useMemo(() => { /* ... (保持不变) ... */
      if (propsUsageLogs && projects && testProjects) {
          return getTimelineDisplayData(propsUsageLogs, projects, testProjects);
      }
      return [];
  }, [propsUsageLogs, projects, testProjects]);

  const timelineItemsByChamberId = useMemo(() => {
    const map = new Map<string, TimelineUsageLogDisplayData[]>();
    timelineDisplayItems.forEach((item) => {
      const existing = map.get(item.chamberId);
      if (existing) {
        existing.push(item);
      } else {
        map.set(item.chamberId, [item]);
      }
    });
    return map;
  }, [timelineDisplayItems]);

  const chamberLayouts = useMemo(() => { /* ... (保持不变) ... */
    const layouts = new Map<string, { logsWithTracks: (TimelineUsageLogDisplayData & { trackIndex: number })[], maxTracks: number }>();
    if (chambers && chambers.length > 0 && timelineDisplayItems) {
        chambers.forEach(chamber => {
            const chamberLogs = timelineItemsByChamberId.get(chamber.id) || [];
            const logsWithTracksData = assignTracksToLogs(chamberLogs);
            const maxTracks = logsWithTracksData.reduce((maxVal, log) => Math.max(maxVal, log.trackIndex + 1), 0);
            layouts.set(chamber.id, { logsWithTracks: logsWithTracksData, maxTracks });
        });
    }
    return layouts;
  }, [chambers, timelineDisplayItems, timelineItemsByChamberId]);
  const getChamberRowHeight = useCallback((chamberId: string): number => { /* ... (保持不变) ... */
      const layout = chamberLayouts.get(chamberId);
      if (layout && layout.maxTracks > 0) {
          return Math.max(MIN_ROW_HEIGHT_PX, layout.maxTracks * ITEM_BAR_TOTAL_HEIGHT + ITEM_BAR_VERTICAL_MARGIN * 2);
      }
      return MIN_ROW_HEIGHT_PX;
  }, [chamberLayouts]);
  const totalTimelineGridHeight = useMemo(() => { /* ... (保持不变) ... */
    if (!chambers || chambers.length === 0) return MIN_ROW_HEIGHT_PX * 3;
    return chambers.reduce((sum, chamber) => sum + getChamberRowHeight(chamber.id), 0);
  }, [chambers, getChamberRowHeight]);

  const chamberRowTopById = useMemo(() => {
    const map = new Map<string, number>();
    if (!chambers || chambers.length === 0) return map;
    let topOffset = 0;
    chambers.forEach((chamber) => {
      map.set(chamber.id, topOffset);
      topOffset += getChamberRowHeight(chamber.id);
    });
    return map;
  }, [chambers, getChamberRowHeight]);

  // *** SCROLL LOGIC (保持上一版修复后的逻辑) ***
  useEffect(() => {
    initialScrollPerformedForCurrentViewRef.current = false;
  }, [dateHeaders]);

  useEffect(() => {
    const container = timelineContainerRef.current;
    const allDataLoaded = !chambersLoading && !projectsLoading && !testProjectsLoading && !usageLogsDataLoading && !holidaysLoading;

    if (!container || !allDataLoaded || !(dateHeaders.length > 0) || !(totalTimelineWidth > 0) || !(container.offsetWidth > 0)) {
      return;
    }

    let targetScrollPosition = 0;
    const todayForScroll = new Date();
    let todayCellDate = setMilliseconds(setSeconds(setMinutes(setHours(dateFnsStartOfDay(todayForScroll), CUSTOM_DAY_START_HOUR),0),0),0);
    if (todayForScroll.getHours() < CUSTOM_DAY_START_HOUR) {
        todayCellDate = addDays(todayCellDate, -1);
    }
    const todayIndex = dateHeaders.findIndex(dh => isEqual(dh, todayCellDate));

    if (todayIndex !== -1) {
      const containerWidth = container.offsetWidth;
      const visibleGridWidth = Math.max(0, containerWidth - CHAMBER_NAME_WIDTH_PX);
      const cellsThatFit = Math.floor(visibleGridWidth / DAY_WIDTH_PX);
      const desiredTodayCellOffset = cellsThatFit > 2 ? 1 : (cellsThatFit > 1 ? 0 : 0); 
      targetScrollPosition = CHAMBER_NAME_WIDTH_PX + (todayIndex - desiredTodayCellOffset) * DAY_WIDTH_PX;
      targetScrollPosition = Math.max(0, targetScrollPosition);
      const maxScroll = (CHAMBER_NAME_WIDTH_PX + totalTimelineWidth) - containerWidth;
      targetScrollPosition = Math.min(targetScrollPosition, maxScroll > 0 ? maxScroll : 0);
    } else {
      targetScrollPosition = (CHAMBER_NAME_WIDTH_PX + (totalTimelineWidth / 2)) - (container.offsetWidth / 2);
      targetScrollPosition = Math.max(0, targetScrollPosition);
      const maxScroll = (CHAMBER_NAME_WIDTH_PX + totalTimelineWidth) - container.offsetWidth;
      targetScrollPosition = Math.min(targetScrollPosition, maxScroll > 0 ? maxScroll : 0);
    }

    if (!initialScrollPerformedForCurrentViewRef.current) {
      if (container.scrollLeft !== targetScrollPosition) {
        container.scrollLeft = targetScrollPosition;
      }
      initialScrollPerformedForCurrentViewRef.current = true;
    } else {
      if (container.scrollLeft === 0 && targetScrollPosition > 0) {
        container.scrollLeft = targetScrollPosition;
      }
    }
  }, [
    dateHeaders, 
    totalTimelineWidth, 
    chambersLoading, projectsLoading, testProjectsLoading, usageLogsDataLoading, holidaysLoading,
  ]);
  // *** SCROLL LOGIC END ***

  const shouldBlockOnPrimaryLoading =
    (chambersLoading && chambers.length === 0) ||
    (projectsLoading && projects.length === 0) ||
    (testProjectsLoading && testProjects.length === 0) ||
    (usageLogsDataLoading && propsUsageLogs.length === 0);

  if (shouldBlockOnPrimaryLoading || (holidaysLoading && processedHolidays.size === 0 && dateHeaders.length > 0) ) {
    return (
        <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)', p: 3}}>
            <CircularProgress />
            <Typography sx={{ml: 2}}>加载数据中，请稍候...</Typography>
        </Box>
    );
  }
  const anyCoreDataError = chambersError || projectsError || testProjectsError;
  if (anyCoreDataError) {
    return (
        <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)', p: 3}}>
            <Alert severity="error" sx={{width: '100%', maxWidth: '600px'}}>
                加载核心依赖数据失败: {anyCoreDataError}
            </Alert>
        </Box>
    );
  }
  if (holidaysError && processedHolidays.size === 0 && dateHeaders.length > 0) {
      return (
        <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)', p: 3}}>
            <Alert severity="warning" sx={{width: '100%', maxWidth: '600px'}}>
                加载节假日数据失败: {holidaysError} (时间轴背景可能不准确)
            </Alert>
        </Box>
      );
  }

  return (
    <div className={styles.timelinePageContainer}>
      <div
        ref={timelineContainerRef}
        className={styles.timelineScrollContainer}
      >
        <div
          className={styles.timelineHeaderRow}
          style={{ width: `${CHAMBER_NAME_WIDTH_PX + totalTimelineWidth}px`, height: `${HEADER_HEIGHT_PX}px` }}
        >
          <div
            className={styles.timelineHeaderChamberCell}
            style={{ width: `${CHAMBER_NAME_WIDTH_PX}px`, height: `${HEADER_HEIGHT_PX}px` }}
          >
            环境箱
          </div>
          <div className={styles.timelineHeaderDates} style={{ width: `${totalTimelineWidth}px` }}>
            {dateHeaders.map((dateHeaderItem, index) => {
              const classification = getDayClassification(dateHeaderItem);
              let headerClassName = styles.timelineDateHeader;
              if (classification.type === 'publicHolidayHighWage') { headerClassName += ` ${styles.publicHolidayStrongRedHeader}`; }
              else if (classification.type === 'publicHolidayLowWage') { headerClassName += ` ${styles.publicHolidaySoftRedHeader}`; }
              else if (classification.type === 'weekendRest') { headerClassName += ` ${styles.weekendHeader}`; }
              else if (classification.type === 'workdayOverride') { headerClassName += ` ${styles.workdayOnWeekendHeader}`; }
              if (isEqual(dateFnsStartOfDay(dateHeaderItem), dateFnsStartOfDay(new Date()))) {
                headerClassName += ` ${styles.todayHeader}`;
              }
              return (
                <div
                  key={index}
                  className={headerClassName}
                  style={{ minWidth: `${DAY_WIDTH_PX}px`, width: `${DAY_WIDTH_PX}px` }}
                  title={classification.name || ''}
                >
                  <div className={styles.dateDisplay}>{formatDateHeader(dateHeaderItem)}</div>
                  <div className={styles.shiftContainer}>
                    <div className={styles.dayShift}>白班</div>
                    <div className={styles.nightShift}>夜班</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.timelineBodyRow} style={{ width: `${CHAMBER_NAME_WIDTH_PX + totalTimelineWidth}px` }}>
          <div className={styles.timelineChamberColumn} style={{ width: `${CHAMBER_NAME_WIDTH_PX}px` }}>
            {chambers && chambers.map((chamber) => (
              <div key={chamber.id} className={styles.chamberRowName} style={{ height: `${getChamberRowHeight(chamber.id)}px` }}>
                {chamber.name}
              </div>
            ))}
            {(!chambers || chambers.length === 0) && !chambersLoading && (
              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">暂无环境箱</Typography>
              </Box>
            )}
          </div>

          <div className={styles.timelineGridContent} style={{ width: `${totalTimelineWidth}px`, minHeight: `${totalTimelineGridHeight}px` }}>
            {dateHeaders.map((dayCellStartTime, dayIndex) => {
              const classification = getDayClassification(dayCellStartTime);
              let dayBgClass = styles.timelineDayBackground;
              if (classification.type === 'publicHolidayHighWage') {
                dayBgClass += ` ${styles.publicHolidayStrongRedBackground}`;
              } else if (classification.type === 'publicHolidayLowWage' || classification.type === 'weekendRest') {
                dayBgClass += ` ${styles.weekendSoftRedBackground}`;
              } else if (classification.type === 'workdayOverride') {
                dayBgClass += ` ${styles.workdayOnWeekendBackground}`;
              }
              return (
                <div
                  key={`day-bg-${dayIndex}`}
                  className={dayBgClass}
                  style={{
                    left: `${dayIndex * DAY_WIDTH_PX}px`,
                    width: `${DAY_WIDTH_PX}px`,
                    height: `${totalTimelineGridHeight}px`,
                  }}
                  title={classification.name || ''}
                />
              );
            })}

            {chambers && chambers.map((chamber) => {
              const topOffset = chamberRowTopById.get(chamber.id) || 0;
              return (
                <div
                  key={`row-bg-${chamber.id}`}
                  className={styles.timelineRowBackground}
                  style={{ top: `${topOffset}px`, height: `${getChamberRowHeight(chamber.id)}px`, width: `${totalTimelineWidth}px` }}
                />
              );
            })}

            {chambers && chambers.map((chamber) => {
              const layoutInfo = chamberLayouts.get(chamber.id);
              const logsToRender = layoutInfo ? layoutInfo.logsWithTracks : [];
              const rowTopOffset = chamberRowTopById.get(chamber.id) || 0;

              return (
                <div key={chamber.id} className={styles.timelineRow} style={{ position: 'absolute', top: `${rowTopOffset}px`, height: `${getChamberRowHeight(chamber.id)}px`, width: `${totalTimelineWidth}px` }}>
                  {logsToRender.map((logDisplayItem) => {
                    const originalLog = usageLogById.get(logDisplayItem.originalLogId);
                    if (!originalLog) return null;

                    const { left, width, display } = calculateBarPositionAndWidth(
                      originalLog,
                      timelineViewActualStart,
                      timelineViewActualEnd,
                      logDisplayItem.effectiveStatus
                    );

                    if (!display || width <= 0) return null;

                    const styling = getBarStylingByEffectiveStatus(logDisplayItem.effectiveStatus);
                    const barTextParts: string[] = [];
                    if (logDisplayItem.projectName) barTextParts.push(logDisplayItem.projectName);
                    if (logDisplayItem.configName && logDisplayItem.configName !== '无特定配置' && logDisplayItem.configName !== '未知配置') {
                      barTextParts.push(logDisplayItem.configName);
                    }
                    if (originalLog.selectedWaterfall) {
                      barTextParts.push(`WF:${originalLog.selectedWaterfall}`);
                    }
                    if (logDisplayItem.testProjectName) {
                      barTextParts.push(logDisplayItem.testProjectName);
                    }
                    const barText = barTextParts.length > 0 ? barTextParts.join(' - ') : (originalLog.user || '使用记录');
                    const barTopPosition = logDisplayItem.trackIndex * ITEM_BAR_TOTAL_HEIGHT + ITEM_BAR_VERTICAL_MARGIN;

                    return (
                      <Tooltip
                        key={logDisplayItem.displayId}
                        title={
                          <React.Fragment>
                            <Typography variant="subtitle2" gutterBottom>{barText}</Typography>
                            <Typography variant="caption">
                              用户: {originalLog.user}<br />
                              开始: {format(parseISO(originalLog.startTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}<br />
                              结束: {originalLog.endTime ? format(parseISO(originalLog.endTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : (logDisplayItem.effectiveStatus === 'in-progress' || logDisplayItem.effectiveStatus === 'overdue' ? '进行中/已超时' : '未设定')}<br />
                              状态: {logDisplayItem.effectiveStatus}
                              {originalLog.notes && <><br />备注: {originalLog.notes.substring(0, 100)}{originalLog.notes.length > 100 && '...'}</>}
                            </Typography>
                          </React.Fragment>
                        }
                        placement="top"
                        arrow
                      >
                        <div
                          className={styles.timelineBar}
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                            backgroundColor: styling.backgroundColor,
                            borderColor: styling.borderColor,
                            color: styling.textColor,
                            height: `${ITEM_BAR_HEIGHT}px`,
                            top: `${barTopPosition}px`,
                          }}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest(`.${styles.timelineBarDeleteButton}`)) return;
                            onViewUsageLog(logDisplayItem.originalLogId);
                          }}
                        >
                          <span className={styles.timelineBarText}>{barText}</span>
                          {onDeleteUsageLog && (
                            <button
                              className={styles.timelineBarDeleteButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteUsageLog && logDisplayItem.configId) {
                                  onDeleteUsageLog(logDisplayItem.originalLogId, logDisplayItem.configId);
                                }
                              }}
                              title="删除此记录"
                            >
                              <DeleteIconSvg />
                            </button>
                          )}
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}

            {(!propsUsageLogs || propsUsageLogs.length === 0) && chambers && chambers.length > 0 && !shouldBlockOnPrimaryLoading && !holidaysLoading && (
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">当前时间范围无使用记录。</Typography>
              </Box>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollingTimeline;
