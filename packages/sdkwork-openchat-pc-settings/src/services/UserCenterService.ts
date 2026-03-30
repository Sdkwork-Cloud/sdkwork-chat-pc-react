import type {
  PlusApiResultListUserAddressVO,
  PlusApiResultPageMapStringObject,
  PlusApiResultUserAddressVO,
  PlusApiResultUserProfileVO,
  PlusApiResultUserSettingsVO,
  PlusApiResultVoid,
  PageMapStringObject,
  QueryParams,
  ThirdPartyBindForm,
  UserAddressCreateForm,
  UserAddressUpdateForm,
  UserAddressVO,
  UserProfileUpdateForm,
  UserProfileVO,
  UserSettingsUpdateForm,
  UserSettingsVO,
} from "@sdkwork/app-sdk";
import { getAppSdkClientWithSession } from "@sdkwork/openchat-pc-auth";

export interface UserCenterProfile {
  userId: string;
  nickname: string;
  avatar?: string;
  email?: string;
  phone?: string;
  region?: string;
  bio?: string;
  gender?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserCenterUpdateProfileInput extends UserProfileUpdateForm {}

export interface UserCenterChangePasswordInput {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserCenterSettings extends UserSettingsVO {}

export interface UserCenterUpdateSettingsInput extends UserSettingsUpdateForm {}

export interface UserCenterAddress extends UserAddressVO {}

export interface UserCenterCreateAddressInput extends UserAddressCreateForm {}

export interface UserCenterUpdateAddressInput extends UserAddressUpdateForm {}

export type UserCenterHistoryQuery = QueryParams;

export interface UserCenterHistoryPage extends PageMapStringObject {}

export type UserCenterBindPlatform = "wechat" | "qq";

export interface UserCenterThirdPartyBindInput extends ThirdPartyBindForm {}

function normalizeResultCode(code?: string | number): string {
  return String(code ?? "").trim();
}

function unwrapResult<T>(
  result: { code?: string | number; msg?: string; data?: T },
  fallback: string,
): T {
  const code = normalizeResultCode(result?.code);
  if (code && code !== "2000") {
    throw new Error((result?.msg || "").trim() || fallback);
  }
  return (result?.data as T) || ({} as T);
}

function ensureSuccess(result: { code?: string | number; msg?: string }, fallback: string): void {
  const code = normalizeResultCode(result?.code);
  if (code && code !== "2000") {
    throw new Error((result?.msg || "").trim() || fallback);
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const normalized = (value || "").trim();
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function mapProfile(data: UserProfileVO): UserCenterProfile {
  const userId = firstNonEmpty(data?.email, data?.phone, data?.nickname, "current-user");
  const nickname = firstNonEmpty(data?.nickname, data?.email, data?.phone, "User");
  return {
    userId,
    nickname,
    avatar: (data.avatar || "").trim() || undefined,
    email: (data.email || "").trim() || undefined,
    phone: (data.phone || "").trim() || undefined,
    region: (data.region || "").trim() || undefined,
    bio: (data.bio || "").trim() || undefined,
    gender: (data.gender || "").trim() || undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function isPlainObjectEmpty(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.keys(value as Record<string, unknown>).length === 0;
}

export interface IUserCenterService {
  getUserProfile(): Promise<UserCenterProfile | null>;
  updateUserProfile(input: UserCenterUpdateProfileInput): Promise<UserCenterProfile>;
  changePassword(input: UserCenterChangePasswordInput): Promise<void>;
  bindEmail(email: string, verifyCode?: string): Promise<UserCenterProfile>;
  unbindEmail(): Promise<UserCenterProfile>;
  bindPhone(phone: string, verifyCode?: string): Promise<UserCenterProfile>;
  unbindPhone(): Promise<UserCenterProfile>;
  bindThirdParty(platform: UserCenterBindPlatform, input?: UserCenterThirdPartyBindInput): Promise<void>;
  unbindThirdParty(platform: UserCenterBindPlatform): Promise<void>;
  getUserSettings(): Promise<UserCenterSettings | null>;
  updateUserSettings(input: UserCenterUpdateSettingsInput): Promise<UserCenterSettings>;
  listUserAddresses(): Promise<UserCenterAddress[]>;
  getDefaultAddress(): Promise<UserCenterAddress | null>;
  createAddress(input: UserCenterCreateAddressInput): Promise<UserCenterAddress>;
  updateAddress(addressId: string | number, input: UserCenterUpdateAddressInput): Promise<UserCenterAddress>;
  deleteAddress(addressId: string | number): Promise<void>;
  setDefaultAddress(addressId: string | number): Promise<UserCenterAddress>;
  getLoginHistory(params?: UserCenterHistoryQuery): Promise<UserCenterHistoryPage>;
  getGenerationHistory(params?: UserCenterHistoryQuery): Promise<UserCenterHistoryPage>;
}

class UserCenterServiceImpl implements IUserCenterService {
  async getUserProfile(): Promise<UserCenterProfile | null> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.getUserProfile();
    const data = unwrapResult<UserProfileVO>(response as PlusApiResultUserProfileVO, "Failed to load user profile");
    return mapProfile(data);
  }

  async updateUserProfile(input: UserCenterUpdateProfileInput): Promise<UserCenterProfile> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.updateUserProfile(input);
    const data = unwrapResult<UserProfileVO>(response as PlusApiResultUserProfileVO, "Failed to update user profile");
    return mapProfile(data);
  }

  async changePassword(input: UserCenterChangePasswordInput): Promise<void> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.changePassword({
      oldPassword: input.oldPassword,
      newPassword: input.newPassword,
      confirmPassword: input.confirmPassword,
    });
    ensureSuccess(response as PlusApiResultVoid, "Failed to change password");
  }

  async bindEmail(email: string, verifyCode?: string): Promise<UserCenterProfile> {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      throw new Error("Email is required");
    }
    const client = getAppSdkClientWithSession();
    const response = await client.user.updateUserProfile({
      email: normalizedEmail,
      verifyCode: (verifyCode || "").trim() || undefined,
    });
    const data = unwrapResult<UserProfileVO>(response as PlusApiResultUserProfileVO, "Failed to bind email");
    return mapProfile(data);
  }

  async unbindEmail(): Promise<UserCenterProfile> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.updateUserProfile({ email: "" });
    const data = unwrapResult<UserProfileVO>(response as PlusApiResultUserProfileVO, "Failed to unbind email");
    return mapProfile(data);
  }

  async bindPhone(phone: string, verifyCode?: string): Promise<UserCenterProfile> {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      throw new Error("Phone is required");
    }
    const client = getAppSdkClientWithSession();
    const response = await client.user.updateUserProfile({
      phone: normalizedPhone,
      verifyCode: (verifyCode || "").trim() || undefined,
    });
    const data = unwrapResult<UserProfileVO>(response as PlusApiResultUserProfileVO, "Failed to bind phone");
    return mapProfile(data);
  }

  async unbindPhone(): Promise<UserCenterProfile> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.updateUserProfile({ phone: "" });
    const data = unwrapResult<UserProfileVO>(response as PlusApiResultUserProfileVO, "Failed to unbind phone");
    return mapProfile(data);
  }

  async bindThirdParty(platform: UserCenterBindPlatform, input?: UserCenterThirdPartyBindInput): Promise<void> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.bindThirdPartyAccount(platform, {
      ...(input || {}),
      platform,
    });
    ensureSuccess(response as PlusApiResultVoid, `Failed to bind ${platform} account`);
  }

  async unbindThirdParty(platform: UserCenterBindPlatform): Promise<void> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.unbindThirdPartyAccount(platform);
    ensureSuccess(response as PlusApiResultVoid, `Failed to unbind ${platform} account`);
  }

  async getUserSettings(): Promise<UserCenterSettings | null> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.getUserSettings();
    const data = unwrapResult<UserSettingsVO>(
      response as PlusApiResultUserSettingsVO,
      "Failed to load user settings"
    );
    return isPlainObjectEmpty(data) ? null : data;
  }

  async updateUserSettings(input: UserCenterUpdateSettingsInput): Promise<UserCenterSettings> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.updateUserSettings(input);
    return unwrapResult<UserSettingsVO>(
      response as PlusApiResultUserSettingsVO,
      "Failed to update user settings"
    );
  }

  async listUserAddresses(): Promise<UserCenterAddress[]> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.listAddresses();
    const data = unwrapResult<UserAddressVO[]>(
      response as PlusApiResultListUserAddressVO,
      "Failed to load user addresses"
    );
    return Array.isArray(data) ? data : [];
  }

  async getDefaultAddress(): Promise<UserCenterAddress | null> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.getDefaultAddress();
    const data = unwrapResult<UserAddressVO>(
      response as PlusApiResultUserAddressVO,
      "Failed to load default address"
    );
    return isPlainObjectEmpty(data) ? null : data;
  }

  async createAddress(input: UserCenterCreateAddressInput): Promise<UserCenterAddress> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.createAddress(input);
    return unwrapResult<UserAddressVO>(
      response as PlusApiResultUserAddressVO,
      "Failed to create address"
    );
  }

  async updateAddress(addressId: string | number, input: UserCenterUpdateAddressInput): Promise<UserCenterAddress> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.updateAddress(addressId, input);
    return unwrapResult<UserAddressVO>(
      response as PlusApiResultUserAddressVO,
      "Failed to update address"
    );
  }

  async deleteAddress(addressId: string | number): Promise<void> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.deleteAddress(addressId);
    ensureSuccess(response as PlusApiResultVoid, "Failed to delete address");
  }

  async setDefaultAddress(addressId: string | number): Promise<UserCenterAddress> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.setDefaultAddress(addressId);
    return unwrapResult<UserAddressVO>(
      response as PlusApiResultUserAddressVO,
      "Failed to set default address"
    );
  }

  async getLoginHistory(params?: UserCenterHistoryQuery): Promise<UserCenterHistoryPage> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.getLoginHistory(params);
    return unwrapResult<PageMapStringObject>(
      response as PlusApiResultPageMapStringObject,
      "Failed to load login history"
    );
  }

  async getGenerationHistory(params?: UserCenterHistoryQuery): Promise<UserCenterHistoryPage> {
    const client = getAppSdkClientWithSession();
    const response = await client.user.getGenerationHistory(params);
    return unwrapResult<PageMapStringObject>(
      response as PlusApiResultPageMapStringObject,
      "Failed to load generation history"
    );
  }
}

export const userCenterService: IUserCenterService = new UserCenterServiceImpl();
