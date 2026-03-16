import type {
  PlusApiResultListVipBenefitVO,
  PlusApiResultListVipPackVO,
  PlusApiResultVipInfoVO,
  PlusApiResultVipPurchaseVO,
  PlusApiResultVipStatusVO,
  VipBenefitVO,
  VipInfoVO,
  VipPackVO,
  VipPurchaseVO,
  VipStatusVO,
} from '@sdkwork/app-sdk';
import { getAppSdkClientWithSession } from '@sdkwork/openchat-pc-auth';

const SUCCESS_CODE = '2000';

const EMPTY_VIP_BENEFITS_RESULT: PlusApiResultListVipBenefitVO = {
  data: [],
  code: SUCCESS_CODE,
  msg: '',
  requestId: '',
  errorName: '',
};

type ApiResult<T> = {
  code?: string;
  msg?: string;
  data?: T;
};

export interface VipPlan {
  id: number;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  durationDays: number;
  points: number;
  recommended: boolean;
  tags: string[];
}

export interface VipWorkspaceData {
  status: VipStatusVO | null;
  vipInfo: VipInfoVO | null;
  plans: VipPlan[];
  benefits: VipBenefitVO[];
}

function unwrapResult<T>(result: ApiResult<T>, fallback: string): T {
  const code = (result?.code || '').trim();
  if (code && code !== SUCCESS_CODE) {
    throw new Error((result?.msg || '').trim() || fallback);
  }
  return (result?.data as T) || ({} as T);
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mapPlan(pack: VipPackVO): VipPlan | null {
  const id = toNumber(pack.id, NaN);
  if (!Number.isFinite(id)) {
    return null;
  }

  const price = toNumber(pack.price, 0);
  const originalPrice = toNumber(pack.originalPrice, 0);
  return {
    id,
    name: normalizeText(pack.name) || normalizeText(pack.levelName) || `VIP ${id}`,
    description: normalizeText(pack.description) || undefined,
    price,
    originalPrice: originalPrice > price ? originalPrice : undefined,
    durationDays: Math.max(0, toNumber(pack.vipDurationDays, 0)),
    points: Math.max(0, toNumber(pack.pointAmount, 0)),
    recommended: Boolean(pack.recommended),
    tags: Array.isArray(pack.tags)
      ? pack.tags.map((item) => normalizeText(item)).filter(Boolean)
      : [],
  };
}

function sortPlans(plans: VipPlan[]): VipPlan[] {
  return [...plans].sort((left, right) => {
    if (left.recommended !== right.recommended) {
      return left.recommended ? -1 : 1;
    }
    if (left.price !== right.price) {
      return left.price - right.price;
    }
    return left.durationDays - right.durationDays;
  });
}

function normalizeBenefits(value: unknown): VipBenefitVO[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => item as VipBenefitVO)
    .filter((item) => normalizeText(item.name).length > 0 || normalizeText(item.description).length > 0);
}

class VipService {
  async getWorkspaceData(): Promise<VipWorkspaceData> {
    const client = getAppSdkClientWithSession();
    const [statusResponse, infoResponse, packsResponse, benefitsResponse] = await Promise.all([
      client.vip.getVipStatus(),
      client.vip.getVipInfo(),
      client.vip.listAllPacks(),
      client.vip.listVipBenefits().catch(() => EMPTY_VIP_BENEFITS_RESULT),
    ]);

    const status = unwrapResult<VipStatusVO>(
      statusResponse as PlusApiResultVipStatusVO,
      'Failed to load VIP status',
    );
    const vipInfo = unwrapResult<VipInfoVO>(
      infoResponse as PlusApiResultVipInfoVO,
      'Failed to load VIP info',
    );
    const packs = unwrapResult<VipPackVO[]>(
      packsResponse as PlusApiResultListVipPackVO,
      'Failed to load VIP plans',
    );
    const benefitList = unwrapResult<VipBenefitVO[]>(
      benefitsResponse as PlusApiResultListVipBenefitVO,
      'Failed to load VIP benefits',
    );

    const plans = sortPlans(
      (Array.isArray(packs) ? packs : [])
        .map((pack) => mapPlan(pack))
        .filter((plan): plan is VipPlan => !!plan),
    );

    const infoBenefits = normalizeBenefits(vipInfo?.benefits);

    return {
      status: Object.keys(status || {}).length > 0 ? status : null,
      vipInfo: Object.keys(vipInfo || {}).length > 0 ? vipInfo : null,
      plans,
      benefits: infoBenefits.length > 0 ? infoBenefits : normalizeBenefits(benefitList),
    };
  }

  async purchasePlan(packId: number): Promise<VipPurchaseVO> {
    const client = getAppSdkClientWithSession();
    const response = await client.vip.purchase({ packId });
    return unwrapResult<VipPurchaseVO>(
      response as PlusApiResultVipPurchaseVO,
      'Failed to create VIP purchase',
    );
  }
}

export const vipService = new VipService();
