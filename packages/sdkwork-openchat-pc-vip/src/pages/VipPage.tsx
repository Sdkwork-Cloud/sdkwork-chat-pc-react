import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, Gem, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAppTranslation } from '@sdkwork/openchat-pc-i18n';
import { type VipPlan, type VipWorkspaceData, vipService } from '../services';

function BenefitList({ data }: { data: VipWorkspaceData | null }) {
  const { tr } = useAppTranslation();
  const items = (data?.benefits || []).slice(0, 6);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-secondary p-4 text-sm text-text-secondary">
        {tr('VIP benefit catalog will appear after API data is ready.')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={`${item.id || item.benefitKey || item.name}`}
          className="rounded-xl border border-border bg-bg-secondary p-3"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Star className="h-4 w-4 text-amber-300" />
            {tr((item.name || '').trim() || 'VIP Benefit')}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            {tr((item.description || '').trim() || 'Premium feature enabled for VIP subscribers.')}
          </p>
        </div>
      ))}
    </div>
  );
}

export function VipPage() {
  const { tr, formatCurrency, formatDate, formatNumber } = useAppTranslation();
  const [workspaceData, setWorkspaceData] = useState<VipWorkspaceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [purchasingPackId, setPurchasingPackId] = useState<number | null>(null);

  const formatVipCurrency = useCallback((value: number) => formatCurrency(value, 'CNY'), [formatCurrency]);

  const formatDuration = useCallback(
    (days: number) => {
      if (days <= 0) {
        return tr('Forever');
      }
      if (days % 365 === 0) {
        return tr('{{count}} Year', { count: days / 365 });
      }
      if (days % 30 === 0) {
        return tr('{{count}} Month', { count: days / 30 });
      }
      return tr('{{count}} Days', { count: days });
    },
    [formatNumber, tr],
  );

  const resolveTierLabel = useCallback(
    (data: VipWorkspaceData | null) => {
      const levelFromStatus = Number(data?.status?.vipLevel);
      if (Number.isFinite(levelFromStatus) && levelFromStatus > 0) {
        return tr('VIP {{level}}', { level: formatNumber(levelFromStatus) });
      }

      const levelName = (data?.vipInfo?.vipLevelName || '').trim();
      if (levelName) {
        return tr(levelName);
      }

      return tr('Free');
    },
    [formatNumber, tr],
  );

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await vipService.getWorkspaceData();
        setWorkspaceData(data);
      } catch (error) {
        const message = tr(error instanceof Error ? error.message : 'Failed to load VIP workspace.');
        toast.error(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [tr],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSubscribe = async (plan: VipPlan) => {
    setPurchasingPackId(plan.id);
    try {
      const purchase = await vipService.purchasePlan(plan.id);
      const successMessage = purchase.orderId
        ? tr('Purchase created. Order ID: {{orderId}}.', { orderId: purchase.orderId })
        : tr('Purchase created.');
      toast.success(successMessage);
      await loadData(true);
    } catch (error) {
      const message = tr(error instanceof Error ? error.message : 'Failed to subscribe VIP plan.');
      toast.error(message);
    } finally {
      setPurchasingPackId(null);
    }
  };

  const tierLabel = useMemo(() => resolveTierLabel(workspaceData), [resolveTierLabel, workspaceData]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">{tr('VIP Membership')}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {tr('Premium generation speed, dedicated benefits, and advanced asset privileges.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData(true)}
            className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
            disabled={isRefreshing}
          >
            {isRefreshing ? tr('Refreshing...') : tr('Refresh')}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div
          className="rounded-2xl border p-6"
          style={{
            borderColor: 'rgba(250, 204, 21, 0.28)',
            background:
              'radial-gradient(circle at 12% 20%, rgba(255,200,80,0.18) 0%, rgba(14,17,29,0.98) 38%), linear-gradient(140deg, rgba(13,17,32,0.98) 0%, rgba(43,19,55,0.94) 55%, rgba(10,27,63,0.96) 100%)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-amber-200/85">
                <Crown className="h-4 w-4" />
                {tr('Current Tier')}
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">{tierLabel}</div>
              <div className="mt-2 text-xs text-amber-100/80">
                {tr('Expire Time: {{time}}', {
                  time: formatDate(workspaceData?.status?.expireTime || workspaceData?.vipInfo?.expireTime || ""),
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/15 bg-black/20 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-amber-100/70">{tr('Points')}</div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {formatNumber(workspaceData?.status?.pointBalance || 0)}
                </div>
              </div>
              <div className="rounded-xl border border-white/15 bg-black/20 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-amber-100/70">{tr('Remaining Days')}</div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {formatNumber(workspaceData?.vipInfo?.remainingDays || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">{tr('Plans')}</h2>
          {isLoading ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`vip-loading-${index}`} className="h-56 animate-pulse rounded-xl border border-border bg-bg-secondary" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {(workspaceData?.plans || []).map((plan) => (
                <article
                  key={plan.id}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: plan.recommended ? 'rgba(244, 114, 182, 0.45)' : 'var(--color-border)',
                    background: plan.recommended
                      ? 'linear-gradient(140deg, rgba(91, 33, 72, 0.9), rgba(30, 41, 59, 0.92))'
                      : 'var(--color-bg-secondary)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-base font-semibold text-text-primary">
                      {plan.recommended ? (
                        <Sparkles className="h-4 w-4 text-pink-300" />
                      ) : (
                        <Gem className="h-4 w-4 text-cyan-300" />
                      )}
                      {tr(plan.name)}
                    </div>
                    {plan.recommended ? (
                      <span className="rounded-full border border-pink-300/50 px-2 py-0.5 text-[10px] font-semibold text-pink-200">
                        {tr('Recommended')}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-3xl font-semibold text-white">{formatVipCurrency(plan.price)}</div>
                      <div className="text-xs text-text-secondary">{formatDuration(plan.durationDays)}</div>
                    </div>
                    {plan.originalPrice ? (
                      <div className="text-xs text-text-muted line-through">{formatVipCurrency(plan.originalPrice)}</div>
                    ) : null}
                  </div>

                  <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-relaxed text-text-secondary">
                    {tr(plan.description || 'Unlock extra concurrency, queue priority and richer generation limits.')}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {plan.tags.slice(0, 2).map((tag) => (
                      <span key={`${plan.id}-${tag}`} className="rounded-full border border-border bg-bg-primary px-2 py-0.5 text-[11px] text-text-secondary">
                        {tr(tag)}
                      </span>
                    ))}
                    {plan.points > 0 ? (
                      <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                        {tr('+{{count}} points', { count: plan.points })}
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSubscribe(plan)}
                    disabled={purchasingPackId !== null}
                    className="mt-4 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {purchasingPackId === plan.id ? tr('Processing...') : tr('Subscribe')}
                  </button>
                </article>
              ))}

              {(workspaceData?.plans || []).length === 0 ? (
                <div className="rounded-xl border border-border bg-bg-secondary p-6 text-center text-sm text-text-secondary lg:col-span-3">
                  {tr('No VIP plan available.')}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">{tr('Benefits')}</h2>
          <BenefitList data={workspaceData} />
        </div>
      </div>
    </section>
  );
}

export default VipPage;
