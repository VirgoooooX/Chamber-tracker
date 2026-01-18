import { configureStore } from '@reduxjs/toolkit';
import chambersReducer from './chambersSlice';
import usageLogsReducer from './usageLogsSlice';
import projectsReducer from './projectsSlice';
import testProjectsReducer from './testProjectsSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    chambers: chambersReducer,
    usageLogs: usageLogsReducer,
    projects: projectsReducer,
    testProjects: testProjectsReducer, // <--- testProjects 在这里定义
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;