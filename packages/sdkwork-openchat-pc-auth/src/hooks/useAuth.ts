import { useCallback, useEffect, useState } from "react";
import { IS_DEV } from "@sdkwork/openchat-pc-kernel";
import type {
  AuthState,
  IMConfig,
  PasswordStrength,
  RegisterRequest,
} from "../entities/auth.entity";
import {
  appAuthService,
  loadAuthData,
  saveAuthData,
  validateEmail,
  validateNickname,
  validatePasswordStrength,
  validatePhone,
  validateUsername,
} from "../services";

const DEV_TEST_ACCOUNT = {
  username: "testuser",
  password: "Test@123456",
};

const DEV_AUTO_LOGIN_KEY = "openchat_dev_auto_login_disabled";

export interface UseAuthReturn extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  loginWithThirdParty: (provider: string) => Promise<boolean>;
  register: (request: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  requestPasswordReset: (account: string, channel: "EMAIL" | "SMS") => Promise<boolean>;
  verifyPasswordResetCode: (
    account: string,
    code: string,
    channel: "EMAIL" | "SMS",
  ) => Promise<boolean>;
  resetPassword: (
    account: string,
    code: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<boolean>;
  forgotPassword: (email?: string, phone?: string) => Promise<boolean>;
  clearError: () => void;
  checkPasswordStrength: (password: string) => PasswordStrength;
  checkUsername: (username: string) => { isValid: boolean; error?: string };
  checkEmail: (email: string) => { isValid: boolean; error?: string };
  checkPhone: (phone: string) => { isValid: boolean; error?: string };
  checkNickname: (nickname: string) => { isValid: boolean; error?: string };
  updateIMConfig: (config: Partial<IMConfig>) => void;
  disableDevAutoLogin: () => void;
  enableDevAutoLogin: () => void;
  isDevAutoLoginDisabled: () => boolean;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    imConfig: null,
    isLoading: true,
    error: null,
  });

  const disableDevAutoLogin = useCallback(() => {
    localStorage.setItem(DEV_AUTO_LOGIN_KEY, "true");
  }, []);

  const enableDevAutoLogin = useCallback(() => {
    localStorage.removeItem(DEV_AUTO_LOGIN_KEY);
  }, []);

  const isDevAutoLoginDisabled = useCallback(() => {
    return localStorage.getItem(DEV_AUTO_LOGIN_KEY) === "true";
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const restoreResult = await appAuthService.restoreAuth();
        if (restoreResult) {
          setState({
            isAuthenticated: true,
            user: restoreResult.user,
            imConfig: restoreResult.imConfig,
            isLoading: false,
            error: null,
          });
          return;
        }

        if (IS_DEV && !isDevAutoLoginDisabled()) {
          try {
            await appAuthService.login({
              username: DEV_TEST_ACCOUNT.username,
              password: DEV_TEST_ACCOUNT.password,
            });
          } catch {
            // Keep dev init flow resilient when default account is unavailable.
          }
          const authData = loadAuthData();
          if (authData) {
            setState({
              isAuthenticated: true,
              user: authData.user,
              imConfig: authData.imConfig,
              isLoading: false,
              error: null,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth state:", error);
      }

      setState((prev) => ({ ...prev, isLoading: false }));
    };

    void initAuth();
  }, [isDevAutoLoginDisabled]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await appAuthService.login({ username, password });
      const authData = loadAuthData();
      if (!authData) {
        throw new Error("Login session not found");
      }

      setState({
        isAuthenticated: true,
        user: authData.user,
        imConfig: authData.imConfig,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed.",
      }));
      return false;
    }
  }, []);

  const register = useCallback(async (request: RegisterRequest): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await appAuthService.register({
        username: request.username,
        password: request.password,
        confirmPassword: request.confirmPassword,
        email: request.email,
        phone: request.phone,
        name: request.nickname,
      });

      const authData = loadAuthData();
      if (authData) {
        setState({
          isAuthenticated: true,
          user: authData.user,
          imConfig: authData.imConfig,
          isLoading: false,
          error: null,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
      }

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Register failed.",
      }));
      return false;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await appAuthService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setState({
        isAuthenticated: false,
        user: null,
        imConfig: null,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const loginWithThirdParty = useCallback(async (provider: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const normalizedProvider = provider.trim().toLowerCase();
      if (!["wechat", "github", "google", "apple"].includes(normalizedProvider)) {
        throw new Error("Unsupported social login provider.");
      }
      await appAuthService.loginWithSocial({
        provider: normalizedProvider as "wechat" | "github" | "google" | "apple",
      });

      const authData = loadAuthData();
      if (!authData) {
        throw new Error("Social login session not found.");
      }

      setState({
        isAuthenticated: true,
        user: authData.user,
        imConfig: authData.imConfig,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Third-party login failed.",
      }));
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const checkPasswordStrength = useCallback((password: string): PasswordStrength => {
    return validatePasswordStrength(password);
  }, []);

  const checkUsername = useCallback((username: string): { isValid: boolean; error?: string } => {
    return validateUsername(username);
  }, []);

  const checkEmail = useCallback((email: string): { isValid: boolean; error?: string } => {
    return validateEmail(email);
  }, []);

  const checkPhone = useCallback((phone: string): { isValid: boolean; error?: string } => {
    return validatePhone(phone);
  }, []);

  const checkNickname = useCallback((nickname: string): { isValid: boolean; error?: string } => {
    return validateNickname(nickname);
  }, []);

  const forgotPassword = useCallback(async (email?: string, phone?: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const account = (email || phone || "").trim();
      if (!account) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Email or phone is required.",
        }));
        return false;
      }
      await appAuthService.requestPasswordReset({
        account,
        channel: email ? "EMAIL" : "SMS",
      });

      setState((prev) => ({ ...prev, isLoading: false, error: null }));
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to send password reset request.",
      }));
      return false;
    }
  }, []);

  const requestPasswordReset = useCallback(
    async (account: string, channel: "EMAIL" | "SMS"): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const normalizedAccount = account.trim();
        if (!normalizedAccount) {
          throw new Error("Email or phone is required.");
        }
        await appAuthService.requestPasswordReset({
          account: normalizedAccount,
          channel,
        });
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to send password reset request.",
        }));
        return false;
      }
    },
    [],
  );

  const verifyPasswordResetCode = useCallback(
    async (account: string, code: string, channel: "EMAIL" | "SMS"): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const normalizedAccount = account.trim();
        const normalizedCode = code.trim();
        if (!normalizedAccount) {
          throw new Error("Email or phone is required.");
        }
        if (!normalizedCode) {
          throw new Error("Verification code is required.");
        }
        const verified = await appAuthService.verifyCode({
          target: normalizedAccount,
          code: normalizedCode,
          scene: "RESET_PASSWORD",
          verifyType: channel === "EMAIL" ? "EMAIL" : "PHONE",
        });
        if (!verified) {
          throw new Error("Invalid or expired verification code.");
        }
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to verify reset code.",
        }));
        return false;
      }
    },
    [],
  );

  const resetPassword = useCallback(
    async (
      account: string,
      code: string,
      newPassword: string,
      confirmPassword: string,
    ): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const normalizedAccount = account.trim();
        const normalizedCode = code.trim();
        if (!normalizedAccount) {
          throw new Error("Email or phone is required.");
        }
        if (!normalizedCode) {
          throw new Error("Verification code is required.");
        }
        if (!newPassword || newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        await appAuthService.resetPassword({
          account: normalizedAccount,
          code: normalizedCode,
          newPassword,
          confirmPassword,
        });

        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to reset password.",
        }));
        return false;
      }
    },
    [],
  );

  const updateIMConfig = useCallback((config: Partial<IMConfig>) => {
    setState((prev) => {
      if (!prev.imConfig) {
        return prev;
      }

      const nextConfig = { ...prev.imConfig, ...config };
      if (prev.user) {
        const currentAuth = loadAuthData();
        saveAuthData({
          user: prev.user,
          token: currentAuth?.token || "",
          authToken: currentAuth?.authToken,
          accessToken: currentAuth?.accessToken,
          imToken: nextConfig.token,
          refreshToken: currentAuth?.refreshToken,
          imConfig: nextConfig,
          timestamp: Date.now(),
        });
      }

      return { ...prev, imConfig: nextConfig };
    });
  }, []);

  return {
    ...state,
    login,
    loginWithThirdParty,
    register,
    logout,
    requestPasswordReset,
    verifyPasswordResetCode,
    resetPassword,
    forgotPassword,
    clearError,
    checkPasswordStrength,
    checkUsername,
    checkEmail,
    checkPhone,
    checkNickname,
    updateIMConfig,
    disableDevAutoLogin,
    enableDevAutoLogin,
    isDevAutoLoginDisabled,
  };
}
