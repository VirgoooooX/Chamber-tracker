import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types'; // 确保路径正确

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

// 模拟的用户数据，实际应用中应从后端获取
const mockUsers: User[] = [
  { id: '1', username: 'admin', role: 'admin', password: 'admin' }, // 添加密码
  { id: '2', username: 'user', role: 'user', password: '123' },   // 修改 user1 为 user 并添加密码
];

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<User>) {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.loading = false;
      state.error = null;
      // 实际应用中，可以将 token 或用户信息存入 localStorage
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('user');
    },
    // 用于应用启动时检查 localStorage 中是否有用户信息
    loadUserFromStorage(state) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user: User = JSON.parse(storedUser);
            state.isAuthenticated = true;
            state.user = user;
        }
    }
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, loadUserFromStorage } = authSlice.actions;

// 模拟登录的 Thunk Action
export const loginUser = (credentials: { username: string; password?: string }): any => // 修改凭据类型以包含密码
  async (dispatch: any) => {
    dispatch(loginStart());
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = mockUsers.find(u => u.username === credentials.username);

    if (user && user.password === credentials.password) { // 修改：校验密码
      // 登录成功后，不应将密码存储在 Redux state 的 user 对象中或 localStorage
      const { password: _password, ...userWithoutPassword } = user;
      dispatch(loginSuccess(userWithoutPassword as User)); // 传递不含密码的用户信息
      localStorage.setItem('user', JSON.stringify(userWithoutPassword)); // 存储不含密码的用户信息
      return true;
    } else {
      dispatch(loginFailure('用户名或密码错误'));
      return false;
    }
  };

export default authSlice.reducer;
