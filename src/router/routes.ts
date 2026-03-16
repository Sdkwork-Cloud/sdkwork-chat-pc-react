import type { ReactNode } from "react";
import { ROUTES } from "./constants";
import type { RouteMeta } from "./constants";

export interface AppRouteObject {
  path: string;
  element?: ReactNode;
  meta?: RouteMeta;
  children?: AppRouteObject[];
}

export const routes: AppRouteObject[] = [
  {
    path: ROUTES.LOGIN,
    element: null,
    meta: { title: "Login", hiddenInMenu: true },
  },
  {
    path: ROUTES.REGISTER,
    element: null,
    meta: { title: "Register", hiddenInMenu: true },
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: null,
    meta: { title: "Forgot Password", hiddenInMenu: true },
  },
  {
    path: ROUTES.HOME,
    element: null,
    meta: { title: "Home", hiddenInMenu: true },
  },
  {
    path: ROUTES.CHAT,
    element: null,
    meta: { title: "Chat", icon: "chat", keepAlive: true },
  },
  {
    path: ROUTES.CONTACTS,
    element: null,
    meta: { title: "Contacts", icon: "contacts", keepAlive: true },
  },
  {
    path: ROUTES.AGENTS,
    element: null,
    meta: { title: "Agent Market", icon: "agents", keepAlive: true },
  },
  {
    path: ROUTES.SKILLS,
    element: null,
    meta: { title: "Skill Market", icon: "skills", keepAlive: true },
  },
  {
    path: ROUTES.APPSTORE,
    element: null,
    meta: { title: "App Store", icon: "appstore", keepAlive: true },
  },
  {
    path: ROUTES.APP,
    element: null,
    meta: { title: "App Center", icon: "app", keepAlive: true },
  },
  {
    path: ROUTES.DEVICES,
    element: null,
    meta: { title: "Devices", icon: "devices", keepAlive: true },
  },
  {
    path: ROUTES.VIP,
    element: null,
    meta: { title: "VIP", icon: "vip", keepAlive: true },
  },
  {
    path: ROUTES.TERMINAL,
    element: null,
    meta: { title: "Terminal", icon: "terminal", keepAlive: false },
  },
  {
    path: ROUTES.SETTINGS,
    element: null,
    meta: { title: "Settings", icon: "settings", keepAlive: true },
  },
  {
    path: ROUTES.ME,
    element: null,
    meta: { title: "Me", icon: "me", keepAlive: true },
  },
  {
    path: ROUTES.SHOPPING,
    element: null,
    meta: { title: "Shopping", icon: "shopping", keepAlive: true },
  },
  {
    path: ROUTES.ORDER_CENTER,
    element: null,
    meta: { title: "Order Center", icon: "order-center", keepAlive: true },
  },
  {
    path: ROUTES.APPOINTMENTS,
    element: null,
    meta: { title: "Appointments", icon: "appointments", keepAlive: true },
  },
  {
    path: ROUTES.COMMUNICATION,
    element: null,
    meta: { title: "Communication", icon: "communication", keepAlive: true },
  },
  {
    path: ROUTES.CONTENT,
    element: null,
    meta: { title: "Content", icon: "content", keepAlive: true },
  },
  {
    path: ROUTES.LOOK,
    element: null,
    meta: { title: "Look", icon: "look", keepAlive: true },
  },
  {
    path: ROUTES.MEDIA,
    element: null,
    meta: { title: "Media", icon: "media", keepAlive: true },
  },
  {
    path: ROUTES.NEARBY,
    element: null,
    meta: { title: "Nearby", icon: "nearby", keepAlive: true },
  },
  {
    path: ROUTES.NOT_FOUND,
    element: null,
    meta: { title: "Not Found", hiddenInMenu: true },
  },
];

export function getRouteMeta(path: string): RouteMeta | undefined {
  return routes.find((route) => route.path === path)?.meta;
}

export function getPageTitle(path: string): string {
  return getRouteMeta(path)?.title || "OpenChat";
}

export default routes;
