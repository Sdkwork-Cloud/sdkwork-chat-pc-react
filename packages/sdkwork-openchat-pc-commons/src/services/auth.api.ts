/**
 * 璁よ瘉 API 鏈嶅姟
 * 澶勭悊鐧诲綍銆佹敞鍐屻€佸瘑鐮佺鐞嗙瓑璁よ瘉鐩稿叧鎺ュ彛
 */

import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-kernel";

// 鐢ㄦ埛绫诲瀷
export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy';
  createdAt?: string;
  updatedAt?: string;
}

// 璁よ瘉鍝嶅簲
export interface AuthResponse {
  user: User;
  authToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

// 鐧诲綍鍙傛暟
export interface LoginParams {
  username: string;
  password: string;
}

// 娉ㄥ唽鍙傛暟
export interface RegisterParams {
  username: string;
  password: string;
  nickname: string;
}

// 鏇存柊瀵嗙爜鍙傛暟
export interface UpdatePasswordParams {
  oldPassword: string;
  newPassword: string;
}

/**
 * 鐢ㄦ埛鐧诲綍
 */
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

/**
 * 鐢ㄦ埛娉ㄥ唽
 */
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

/**
 * 鑾峰彇褰撳墠鐢ㄦ埛淇℃伅
 */
export async function getCurrentUser(): Promise<User> {
  const response = await getAppSdkClientWithSession().user.getUserProfile();
  return ((response as { data?: User }).data ?? {}) as User;
}

/**
 * 鏇存柊鐢ㄦ埛瀵嗙爜
 */
export async function updatePassword(params: UpdatePasswordParams): Promise<{ success: boolean }> {
  await getAppSdkClientWithSession().user.changePassword({
    oldPassword: params.oldPassword,
    newPassword: params.newPassword,
  } as any);
  return { success: true };
}

/**
 * 鍒锋柊璁块棶浠ょ墝
 */
export async function refreshToken(refreshToken: string): Promise<{ authToken: string; expiresIn: number }> {
  const response = await getAppSdkClientWithSession().auth.refreshToken({ refreshToken } as any);
  const data = (response as { data?: any }).data ?? {};
  return {
    authToken: data.authToken ?? "",
    expiresIn: Number(data.expiresIn ?? 0),
  };
}

/**
 * 鐢ㄦ埛鐧诲嚭
 */
export async function logout(): Promise<void> {
  await getAppSdkClientWithSession().auth.logout();

  // 娓呯悊鏈湴瀛樺偍
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('uid');
}

// 榛樿瀵煎嚭
export default {
  login,
  register,
  getCurrentUser,
  updatePassword,
  refreshToken,
  logout,
};

