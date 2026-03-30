import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { AuthOAuthCallbackPage, AuthPage } from "@sdkwork/openchat-pc-auth";
import { translate } from "@sdkwork/openchat-pc-i18n";
import { Button } from "@sdkwork/openchat-pc-ui";
import { MainLayout } from "../layouts/MainLayout";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "./constants";
import { authGuard, executeGuards, type RouteGuard } from "./guards";
import { routes } from "./routes";

type RoutePageModule = Record<string, unknown>;
export type RoutePageKey =
  | "chat"
  | "contacts"
  | "terminal"
  | "settings"
  | "agentMarket"
  | "agentDetail"
  | "deviceList"
  | "deviceDetail"
  | "notifications"
  | "mall"
  | "shoppingCart"
  | "shopping"
  | "orderCenter"
  | "moments"
  | "discover"
  | "appCenter"
  | "me"
  | "appointments"
  | "communication"
  | "content"
  | "look"
  | "media"
  | "nearby"
  | "wallet"
  | "vip"
  | "creation"
  | "drive"
  | "shortVideo"
  | "tools"
  | "skillMarket"
  | "mySkills"
  | "skillDetail"
  | "toolMarket"
  | "myTools"
  | "toolConfig"
  | "appStore"
  | "appStoreDetail";

export const routePageLoaders: Record<RoutePageKey, () => Promise<RoutePageModule>> = {
  chat: async () => import("@sdkwork/openchat-pc-chat"),
  contacts: async () => import("@sdkwork/openchat-pc-contacts"),
  terminal: async () => import("@sdkwork/openchat-pc-terminal"),
  settings: async () => import("@sdkwork/openchat-pc-settings"),
  agentMarket: async () => import("@sdkwork/openchat-pc-agents"),
  agentDetail: async () => import("@sdkwork/openchat-pc-agents"),
  deviceList: async () => import("@sdkwork/openchat-pc-device"),
  deviceDetail: async () => import("@sdkwork/openchat-pc-device"),
  notifications: async () => import("@sdkwork/openchat-pc-notification"),
  mall: async () => import("@sdkwork/openchat-pc-commerce"),
  shoppingCart: async () => import("@sdkwork/openchat-pc-commerce"),
  shopping: async () => import("@sdkwork/openchat-pc-shopping"),
  orderCenter: async () => import("@sdkwork/openchat-pc-order-center"),
  moments: async () => import("@sdkwork/openchat-pc-moments"),
  discover: async () => import("@sdkwork/openchat-pc-discover"),
  appCenter: async () => import("@sdkwork/openchat-pc-app"),
  me: async () => import("@sdkwork/openchat-pc-user"),
  appointments: async () => import("@sdkwork/openchat-pc-appointments"),
  communication: async () => import("@sdkwork/openchat-pc-communication"),
  content: async () => import("@sdkwork/openchat-pc-content"),
  look: async () => import("@sdkwork/openchat-pc-look"),
  media: async () => import("@sdkwork/openchat-pc-media"),
  nearby: async () => import("@sdkwork/openchat-pc-nearby"),
  wallet: async () => import("@sdkwork/openchat-pc-wallet"),
  vip: async () => import("@sdkwork/openchat-pc-vip"),
  creation: async () => import("@sdkwork/openchat-pc-creation"),
  drive: async () => import("@sdkwork/openchat-pc-drive"),
  shortVideo: async () => import("@sdkwork/openchat-pc-video"),
  tools: async () => import("@sdkwork/openchat-pc-tools"),
  skillMarket: async () => import("@sdkwork/openchat-pc-skills"),
  mySkills: async () => import("@sdkwork/openchat-pc-skills"),
  skillDetail: async () => import("@sdkwork/openchat-pc-skills"),
  toolMarket: async () => import("@sdkwork/openchat-pc-tool"),
  myTools: async () => import("@sdkwork/openchat-pc-tool"),
  toolConfig: async () => import("@sdkwork/openchat-pc-tool"),
  appStore: async () => import("@sdkwork/openchat-pc-appstore"),
  appStoreDetail: async () => import("@sdkwork/openchat-pc-appstore"),
};

export const routePageExportNames: Record<RoutePageKey, string> = {
  chat: "ChatPage",
  contacts: "ContactsPage",
  terminal: "TerminalPage",
  settings: "SettingsPage",
  agentMarket: "AgentsPage",
  agentDetail: "AgentDetailPage",
  deviceList: "DeviceListPage",
  deviceDetail: "DeviceDetailPage",
  notifications: "NotificationsPage",
  mall: "MallPage",
  shoppingCart: "ShoppingCartPage",
  shopping: "ShoppingPage",
  orderCenter: "OrderCenterPage",
  moments: "MomentsPage",
  discover: "DiscoverPage",
  appCenter: "AppCenterPage",
  me: "MePage",
  appointments: "AppointmentsPage",
  communication: "CallsPage",
  content: "ArticlesPage",
  look: "LookPage",
  media: "MediaCenterPage",
  nearby: "NearbyPage",
  wallet: "WalletPage",
  vip: "VipPage",
  creation: "CreationPage",
  drive: "CloudDrivePage",
  shortVideo: "ShortVideoPage",
  tools: "ToolsPage",
  skillMarket: "SkillsCenterPage",
  mySkills: "MySkillsPage",
  skillDetail: "SkillDetailPage",
  toolMarket: "ToolMarketPage",
  myTools: "MyToolsPage",
  toolConfig: "ToolConfigPage",
  appStore: "AppStorePage",
  appStoreDetail: "AppStoreDetailPage",
};

const AUTH_ROUTE_GUARDS: RouteGuard[] = [authGuard];

function lazyRoutePage(pageKey: RoutePageKey) {
  return lazy(async () => {
    const module = await routePageLoaders[pageKey]();
    const exportName = routePageExportNames[pageKey];
    const pageComponent = module[exportName];

    if (!pageComponent) {
      throw new Error(`[router] Missing page export "${exportName}" for route key "${pageKey}".`);
    }

    return { default: pageComponent as ComponentType };
  });
}

const ChatPage = lazyRoutePage("chat");
const ContactsPage = lazyRoutePage("contacts");
const TerminalPage = lazyRoutePage("terminal");
const SettingsPage = lazyRoutePage("settings");
const AgentMarketPage = lazyRoutePage("agentMarket");
const AgentDetailPage = lazyRoutePage("agentDetail");
const DeviceListPage = lazyRoutePage("deviceList");
const DeviceDetailPage = lazyRoutePage("deviceDetail");
const NotificationsPage = lazyRoutePage("notifications");
const MallPage = lazyRoutePage("mall");
const ShoppingCartPage = lazyRoutePage("shoppingCart");
const ShoppingPage = lazyRoutePage("shopping");
const OrderCenterPage = lazyRoutePage("orderCenter");
const MomentsPage = lazyRoutePage("moments");
const DiscoverPage = lazyRoutePage("discover");
const AppCenterPage = lazyRoutePage("appCenter");
const MePage = lazyRoutePage("me");
const AppointmentsPage = lazyRoutePage("appointments");
const CommunicationPage = lazyRoutePage("communication");
const ContentPage = lazyRoutePage("content");
const LookPage = lazyRoutePage("look");
const MediaCenterPage = lazyRoutePage("media");
const NearbyPage = lazyRoutePage("nearby");
const WalletPage = lazyRoutePage("wallet");
const VipPage = lazyRoutePage("vip");
const CreationPage = lazyRoutePage("creation");
const CloudDrivePage = lazyRoutePage("drive");
const ShortVideoPage = lazyRoutePage("shortVideo");
const ToolsPage = lazyRoutePage("tools");
const SkillMarketPage = lazyRoutePage("skillMarket");
const MySkillsPage = lazyRoutePage("mySkills");
const SkillDetailPage = lazyRoutePage("skillDetail");
const ToolMarketPage = lazyRoutePage("toolMarket");
const MyToolsPage = lazyRoutePage("myTools");
const ToolConfigPage = lazyRoutePage("toolConfig");
const AppStorePage = lazyRoutePage("appStore");
const AppStoreDetailPage = lazyRoutePage("appStoreDetail");

function RouteLoading() {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-[28px] border border-[color:var(--border-color)] bg-[var(--bg-secondary)] px-5 py-3 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-xl)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        {translate("Loading page...")}
      </div>
    </div>
  );
}

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || translate("An unexpected route error occurred."),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[router] route render failed:", error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      errorMessage: "",
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-[32px] border border-[color:var(--border-color)] bg-[var(--bg-elevated)] px-8 py-7 shadow-[var(--shadow-xl)]">
            <div className="text-base font-medium text-[var(--text-primary)]">{translate("Page failed to render")}</div>
            <div className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
            {this.state.errorMessage || translate("An unexpected route error occurred.")}
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="h-9 rounded-xl px-4 text-xs font-semibold"
              >
                {translate("Retry")}
              </Button>
              <Button
                onClick={() => window.location.assign(ROUTES.CHAT)}
                className="h-9 rounded-xl px-4 text-xs font-semibold"
              >
                {translate("Back to Chat")}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function withSuspense(node: ReactNode): ReactNode {
  return (
    <div data-testid="route-shell" className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <RouteErrorBoundary>
        <Suspense fallback={<RouteLoading />}>{node}</Suspense>
      </RouteErrorBoundary>
    </div>
  );
}

function GuardedRoute({ guards, children }: { guards: RouteGuard[]; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [guardResult, setGuardResult] = useState<true | string | null>(null);

  useEffect(() => {
    let active = true;
    setGuardResult(null);

    void executeGuards(guards, { location, navigate }).then((result) => {
      if (active) {
        setGuardResult(result);
      }
    });

    return () => {
      active = false;
    };
  }, [guards, location, navigate]);

  if (guardResult === null) {
    return <RouteLoading />;
  }

  if (guardResult !== true) {
    return <Navigate to={guardResult} replace />;
  }

  return <>{children}</>;
}

function renderProtectedRoute(node: ReactNode): ReactNode {
  return (
    <GuardedRoute guards={AUTH_ROUTE_GUARDS}>
      <MainLayout>{withSuspense(node)}</MainLayout>
    </GuardedRoute>
  );
}

function renderGuestRoute(): ReactNode {
  return (
    <GuardedRoute guards={AUTH_ROUTE_GUARDS}>
      <div className="relative flex h-screen flex-col overflow-hidden bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] transition-colors duration-300">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-x-0 top-0 h-40"
            style={{
              background: "radial-gradient(circle at top, var(--ai-primary-glow), transparent 68%)",
            }}
          />
        </div>
        <main className="relative z-10 min-h-0 flex-1 overflow-auto scrollbar-hide">
          <AuthPage />
        </main>
      </div>
    </GuardedRoute>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.CHAT} replace />} />

      <Route path={ROUTES.LOGIN} element={renderGuestRoute()} />
      <Route path={ROUTES.REGISTER} element={renderGuestRoute()} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={renderGuestRoute()} />
      <Route
        path={ROUTES.LOGIN_OAUTH_CALLBACK}
        element={(
          <GuardedRoute guards={AUTH_ROUTE_GUARDS}>
            <AuthOAuthCallbackPage />
          </GuardedRoute>
        )}
      />

      <Route path={`${ROUTES.CHAT}/*`} element={renderProtectedRoute(<ChatPage />)} />
      <Route path={`${ROUTES.CONTACTS}/*`} element={renderProtectedRoute(<ContactsPage />)} />
      <Route path={`${ROUTES.TERMINAL}/*`} element={renderProtectedRoute(<TerminalPage />)} />
      <Route path={`${ROUTES.SETTINGS}/*`} element={renderProtectedRoute(<SettingsPage />)} />

      <Route path={ROUTES.AGENTS} element={renderProtectedRoute(<AgentMarketPage />)} />
      <Route path={ROUTES.AGENT_DETAIL} element={renderProtectedRoute(<AgentDetailPage />)} />

      <Route path={ROUTES.SKILLS} element={renderProtectedRoute(<SkillMarketPage />)} />
      <Route path={ROUTES.MY_SKILLS} element={renderProtectedRoute(<MySkillsPage />)} />
      <Route path={ROUTES.SKILL_DETAIL} element={renderProtectedRoute(<SkillDetailPage />)} />

      <Route path={ROUTES.TOOL_MARKET} element={renderProtectedRoute(<ToolMarketPage />)} />
      <Route path={ROUTES.MY_TOOLS} element={renderProtectedRoute(<MyToolsPage />)} />
      <Route path={ROUTES.TOOL_CONFIG} element={renderProtectedRoute(<ToolConfigPage />)} />

      <Route path={ROUTES.DEVICES} element={renderProtectedRoute(<DeviceListPage />)} />
      <Route path={ROUTES.DEVICE_DETAIL} element={renderProtectedRoute(<DeviceDetailPage />)} />

      <Route path={ROUTES.NOTIFICATIONS} element={renderProtectedRoute(<NotificationsPage />)} />

      <Route path={ROUTES.COMMERCE_MALL} element={renderProtectedRoute(<MallPage />)} />
      <Route path={ROUTES.COMMERCE_CART} element={renderProtectedRoute(<ShoppingCartPage />)} />
      <Route path={ROUTES.SHOPPING} element={renderProtectedRoute(<ShoppingPage />)} />
      <Route path={ROUTES.ORDER_CENTER} element={renderProtectedRoute(<OrderCenterPage />)} />

      <Route path={ROUTES.MOMENTS} element={renderProtectedRoute(<MomentsPage />)} />
      <Route path={ROUTES.DISCOVER} element={renderProtectedRoute(<DiscoverPage />)} />
      <Route path={ROUTES.APP} element={renderProtectedRoute(<AppCenterPage />)} />
      <Route path={ROUTES.ME} element={renderProtectedRoute(<MePage />)} />
      <Route path={ROUTES.APPOINTMENTS} element={renderProtectedRoute(<AppointmentsPage />)} />
      <Route path={ROUTES.COMMUNICATION} element={renderProtectedRoute(<CommunicationPage />)} />
      <Route path={ROUTES.CONTENT} element={renderProtectedRoute(<ContentPage />)} />
      <Route path={ROUTES.LOOK} element={renderProtectedRoute(<LookPage />)} />
      <Route path={ROUTES.MEDIA} element={renderProtectedRoute(<MediaCenterPage />)} />
      <Route path={ROUTES.NEARBY} element={renderProtectedRoute(<NearbyPage />)} />
      <Route path={ROUTES.WALLET} element={renderProtectedRoute(<WalletPage />)} />
      <Route path={ROUTES.VIP} element={renderProtectedRoute(<VipPage />)} />
      <Route path={ROUTES.CREATION} element={renderProtectedRoute(<CreationPage />)} />
      <Route path={ROUTES.DRIVE} element={renderProtectedRoute(<CloudDrivePage />)} />
      <Route path={ROUTES.SHORT_VIDEO} element={renderProtectedRoute(<ShortVideoPage />)} />
      <Route path={ROUTES.TOOLS} element={renderProtectedRoute(<ToolsPage />)} />
      <Route path={ROUTES.APPSTORE} element={renderProtectedRoute(<AppStorePage />)} />
      <Route path={ROUTES.APPSTORE_DETAIL} element={renderProtectedRoute(<AppStoreDetailPage />)} />

      <Route path="*" element={<Navigate to={ROUTES.CHAT} replace />} />
    </Routes>
  );
}

export { routes };
export { ROUTES, ROUTE_NAMES, type RouteMeta } from "./constants";
export { authGuard, permissionGuard, executeGuards } from "./guards";

export default AppRouter;
