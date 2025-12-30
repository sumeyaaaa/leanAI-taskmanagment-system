import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const HERO_IMAGE = '/image/photo_2025-09-25_16-18-26.jpg';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Load saved email if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    const result = await login({ email, password });

    if (result.success) {
      // Save email if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      const userRole = localStorage.getItem('userData') 
        ? JSON.parse(localStorage.getItem('userData')!).role 
        : 'employee';
      
      // Redirect based on role
      navigate(userRole === 'superadmin' || userRole === 'admin' ? '/admin/dashboard' : '/employee/profile');
    } else {
      setError(result.error || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-leanchem-navy via-leanchem-navy to-blue-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-leanchem-blue rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDYwIDAgTCAwIDAgMCA2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNGExZWZmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <div className="hidden lg:flex flex-col items-start justify-center space-y-8 text-white animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center shadow-2xl">
                  <img 
                    src={HERO_IMAGE} 
                    alt="LeanChem Logo" 
                    className="w-16 h-16 object-contain rounded-lg"
                  />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                    LeanAI
                  </h1>
                  <p className="text-blue-200 text-sm">Task Management System</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-3xl font-bold leading-tight">
                Streamline Your Workflow
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                A unified platform for task management, team collaboration, and business operations.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-sm font-semibold">Fast & Efficient</div>
                <div className="text-xs text-blue-200 mt-1">Lightning-fast performance</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="text-2xl mb-2">🔒</div>
                <div className="text-sm font-semibold">Secure</div>
                <div className="text-xs text-blue-200 mt-1">Enterprise-grade security</div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full animate-slide-in">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 sm:p-10">
              {/* Mobile Logo */}
              <div className="lg:hidden flex items-center justify-center mb-8">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-leanchem-navy to-leanchem-blue flex items-center justify-center shadow-lg">
                  <img 
                    src={HERO_IMAGE} 
                    alt="LeanChem Logo" 
                    className="w-12 h-12 object-contain rounded-lg"
                  />
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-leanchem-navy mb-2">
                  Welcome Back
                </h2>
                <p className="text-gray-600">
                  Sign in to access your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label 
                    htmlFor="email" 
                    className={`block text-sm font-semibold text-gray-700 transition-all duration-200 ${
                      focusedField === 'email' ? 'text-leanchem-blue' : ''
                    }`}
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="your.email@company.com"
                      disabled={isLoading}
                      required
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                        focusedField === 'email'
                          ? 'border-leanchem-blue focus:ring-leanchem-blue/20 bg-blue-50'
                          : 'border-gray-200 focus:border-leanchem-blue focus:ring-leanchem-blue/20'
                      } ${error ? 'border-red-300' : ''}`}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label 
                    htmlFor="password" 
                    className={`block text-sm font-semibold text-gray-700 transition-all duration-200 ${
                      focusedField === 'password' ? 'text-leanchem-blue' : ''
                    }`}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      required
                      className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                        focusedField === 'password'
                          ? 'border-leanchem-blue focus:ring-leanchem-blue/20 bg-blue-50'
                          : 'border-gray-200 focus:border-leanchem-blue focus:ring-leanchem-blue/20'
                      } ${error ? 'border-red-300' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-leanchem-blue transition-colors"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-leanchem-blue border-gray-300 rounded focus:ring-leanchem-blue focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-leanchem-blue hover:text-leanchem-navy font-semibold transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-shake">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 px-4 rounded-xl font-semibold text-white transition-all duration-200 transform ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-leanchem-navy to-leanchem-blue hover:from-leanchem-blue hover:to-leanchem-navy shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span>Sign In</span>
                      <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 text-center">
                <Link 
                  to="/" 
                  className="text-sm text-gray-600 hover:text-leanchem-blue transition-colors inline-flex items-center"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Home
                </Link>
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-leanchem-navy mb-2">Login Credentials:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className="flex items-start">
                    <span className="text-leanchem-blue mr-2">•</span>
                    <span><strong>Admins:</strong> Use your admin credentials</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-leanchem-blue mr-2">•</span>
                    <span><strong>Employees:</strong> Use your company email and password</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
};

export default Login;
