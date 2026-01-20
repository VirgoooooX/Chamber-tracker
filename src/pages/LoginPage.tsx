import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TextField, Button, Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { loginUser } from '../store/authSlice'; // 确保路径正确
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { useI18n } from '../i18n'

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // 新增：密码状态
  const dispatch = useAppDispatch()
  const { tr } = useI18n()
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, error } = useAppSelector((state) => state.auth)

  const from = location.state?.from?.pathname || '/timeline';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const success = await dispatch(loginUser({ username, password })); // 修改：传递密码
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          {tr('登录', 'Sign in')}
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            required
            fullWidth
            id="username"
            label={tr('用户名 (admin 或 user)', 'Username (admin or user)')}
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField // 新增：密码输入框
            required
            fullWidth
            name="password"
            label={tr('密码', 'Password')}
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{error}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !username || !password} // 修改：确保用户名密码不为空
          >
            {loading ? <CircularProgress size={24} /> : tr('登录', 'Sign in')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
