export interface User {
  id: string;
  uid?: string;
  username: string;
  email: string;
  phone: string;
  nickname: string;
  avatar?: string;
  status?: string;
}

export interface IMConfig {
  wsUrl: string;
  serverUrl?: string;
  uid: string;
  deviceId?: string;
  deviceFlag?: string;
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  authToken?: string;
  accessToken?: string;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  imConfig: IMConfig;
}

export interface RegisterRequest {
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

export interface RegisterResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface ForgotPasswordRequest {
  email?: string;
  phone?: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface UpdatePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdatePasswordResponse {
  success: boolean;
  error?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  imConfig: IMConfig | null;
  isLoading: boolean;
  error: string | null;
}

export interface StoredAuthData {
  user: User;
  token: string;
  authToken?: string;
  accessToken?: string;
  imToken?: string;
  refreshToken?: string;
  imConfig: IMConfig;
  timestamp: number;
}

export interface PasswordStrength {
  isValid: boolean;
  score: number;
  errors: string[];
  suggestions: string[];
}
