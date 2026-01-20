import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { createUserWithEmailAndPassword, getIdTokenResult, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../firebase-config'
import type { User, UserRole } from '../types'

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
};

const getRoleFromClaims = (claims: Record<string, any>): UserRole => {
  const role = claims?.role
  if (role === 'admin' || role === 'user') return role
  if (claims?.admin === true) return 'admin'
  return 'user'
}

export const signInUser = createAsyncThunk<
  User,
  { email: string; password: string },
  { rejectValue: string }
>('auth/signInUser', async ({ email, password }, { rejectWithValue }) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const tokenResult = await getIdTokenResult(credential.user, true)
    const role = getRoleFromClaims(tokenResult.claims as any)
    const username = credential.user.email ?? credential.user.displayName ?? credential.user.uid
    return { id: credential.user.uid, username, role }
  } catch (e: any) {
    const code = e?.code as string | undefined
    if (code === 'auth/invalid-credential') return rejectWithValue('账号或密码错误')
    if (code === 'auth/too-many-requests') return rejectWithValue('尝试次数过多，请稍后再试')
    return rejectWithValue(e?.message || '登录失败')
  }
})

export const signOutUser = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/signOutUser',
  async (_, { rejectWithValue }) => {
    try {
      await signOut(auth)
    } catch (e: any) {
      return rejectWithValue(e?.message || '登出失败')
    }
  }
)

export const signUpUser = createAsyncThunk<
  User,
  { email: string; password: string },
  { rejectValue: string }
>('auth/signUpUser', async ({ email, password }, { rejectWithValue }) => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const tokenResult = await getIdTokenResult(credential.user, true)
    const role = getRoleFromClaims(tokenResult.claims as any)
    const username = credential.user.email ?? credential.user.displayName ?? credential.user.uid
    return { id: credential.user.uid, username, role }
  } catch (e: any) {
    const code = e?.code as string | undefined
    if (code === 'auth/email-already-in-use') return rejectWithValue('邮箱已被注册')
    if (code === 'auth/invalid-email') return rejectWithValue('邮箱格式不正确')
    if (code === 'auth/weak-password') return rejectWithValue('密码强度太弱（至少 6 位）')
    return rejectWithValue(e?.message || '注册失败')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
    setAuthUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload
      state.isAuthenticated = Boolean(action.payload)
      state.loading = false
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signInUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(signInUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
        state.loading = false
        state.error = null
      })
      .addCase(signInUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? '登录失败'
      })
      .addCase(signUpUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(signUpUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
        state.loading = false
        state.error = null
      })
      .addCase(signUpUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? '注册失败'
      })
      .addCase(signOutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.loading = false
        state.error = null
      })
      .addCase(signOutUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? '登出失败'
      })
  },
});

export const { setAuthLoading, setAuthError, setAuthUser } = authSlice.actions

export default authSlice.reducer;
