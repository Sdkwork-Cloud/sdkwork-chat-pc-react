

import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";

export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  authToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  password: string;
  nickname: string;
}

export interface UpdatePasswordParams {
  oldPassword: string;
  newPassword: string;
}


export async function login(params: LoginParams): Promise<AuthResponse> {
  const response = await getAppSdkClientWithSession().auth.login(params as any);
  const data = (response as { data?: any }).data ?? {};
  return {
    user: data.userInfo ?? {},
    authToken: data.authToken ?? "",
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  };
}


export async function register(params: RegisterParams): Promise<AuthResponse> {
  const response = await getAppSdkClientWithSession().auth.register(params as any);
  const data = (response as { data?: any }).data ?? {};
  return {
    user: data.userInfo ?? data,
    authToken: data.authToken ?? "",
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  };
}


export async function getCurrentUser(): Promise<User> {
  const response = await getAppSdkClientWithSession().user.getUserProfile();
  return ((response as { data?: User }).data ?? {}) as User;
}


export async function updatePassword(params: UpdatePasswordParams): Promise<{ success: boolean }> {
  await getAppSdkClientWithSession().user.changePassword({
    oldPassword: params.oldPassword,
    newPassword: params.newPassword,
  } as any);
  return { success: true };
}


export async function refreshToken(refreshToken: string): Promise<{ authToken: string; expiresIn: number }> {
  const response = await getAppSdkClientWithSession().auth.refreshToken({ refreshToken } as any);
  const data = (response as { data?: any }).data ?? {};
  return {
    authToken: data.authToken ?? "",
    expiresIn: Number(data.expiresIn ?? 0),
  };
}


export async function logout(): Promise<void> {
  await getAppSdkClientWithSession().auth.logout();

  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('uid');
}

export default {
  login,
  register,
  getCurrentUser,
  updatePassword,
  refreshToken,
  logout,
};

