import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { apiClient } from '@/utils/apiClient';
import { useAuthStore } from '@/store/authStore';
import { API_ENDPOINTS } from '@/config/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await apiClient.post(API_ENDPOINTS.LOGIN, {
        username: formData.username,
        password: formData.password,
      });

      localStorage.setItem('token', response.data.access_token);
      const meResponse = await apiClient.get(API_ENDPOINTS.GET_ME);
      setAuth(meResponse.data, response.data.access_token);
      toast.success('Login successful!');
      navigate(meResponse.data.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      <div className="hidden md:block min-h-screen overflow-hidden">
        <img
          src="/login-hero.png"
          alt="Fitness inspiration"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="p-2 sm:p-6">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm"
            >
              <span className="text-3xl text-white font-bold">∞</span>
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">Continue your fitness journey</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username"
              placeholder="Enter your username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              error={errors.username}
              autoComplete="username"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              autoComplete="current-password"
            />

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex justify-center">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="!rounded-xl !bg-orange-500 !px-8 !py-3 !font-bold !text-white hover:!bg-orange-600"
                isLoading={isLoading}
              >
                Login
              </Button>
            </motion.div>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">New to FitChallenge?</span>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-600">
            <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">
              Create an account
            </Link>
          </p>
        </div>

      </motion.div>
      </div>
    </div>
  );
};
