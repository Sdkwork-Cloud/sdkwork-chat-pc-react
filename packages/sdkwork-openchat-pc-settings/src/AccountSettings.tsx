import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, useAuthStore } from "@sdkwork/openchat-pc-auth";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { Button, Input, Label, Textarea } from "@sdkwork/openchat-pc-ui";
import { PanelHeading, Section, SignedOutState } from "./Shared";
import { userCenterService, type UserCenterProfile } from "./services";

const LOGIN_PATH = "/login?redirect=%2Fsettings%3Ftab%3Daccount";

interface AccountDraft {
  nickname: string;
  email: string;
  phone: string;
  region: string;
  bio: string;
  avatar?: string;
}

function splitName(displayName: string) {
  const normalized = displayName.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { firstName: "Open", lastName: "Chat" };
  }

  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

function buildAccountDraft(
  user: ReturnType<typeof useAuth>["user"],
  profile?: UserCenterProfile | null,
): AccountDraft {
  return {
    nickname: profile?.nickname || user?.nickname || "",
    email: profile?.email || user?.email || "",
    phone: profile?.phone || user?.phone || "",
    region: profile?.region || "",
    bio: profile?.bio || "",
    avatar: profile?.avatar || user?.avatar,
  };
}

export function AccountSettings() {
  const navigate = useNavigate();
  const { tr } = useAppTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const syncUserProfile = useAuthStore((state) => state.syncUserProfile);
  const [draft, setDraft] = useState<AccountDraft>(() => buildAccountDraft(user));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setDraft(buildAccountDraft(user));
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const profile = await userCenterService.getUserProfile();
        if (!cancelled) {
          setDraft(buildAccountDraft(user, profile));
        }
      } catch {
        if (!cancelled) {
          setDraft(buildAccountDraft(user));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  const initials = useMemo(() => {
    const source = draft.nickname || user?.nickname || user?.username || draft.email || "OpenChat";
    return source
      .split(/\s+/)
      .map((item) => item.charAt(0))
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [draft.email, draft.nickname, user?.nickname, user?.username]);

  const handleSave = async () => {
    setIsSaving(true);
    setNotice("");

    try {
      const updatedProfile = await userCenterService.updateUserProfile({
        nickname: draft.nickname.trim(),
        email: draft.email.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        region: draft.region.trim() || undefined,
        bio: draft.bio.trim() || undefined,
      });

      const nextDraft = buildAccountDraft(user, updatedProfile);
      const nameParts = splitName(nextDraft.nickname || nextDraft.email || "OpenChat User");

      syncUserProfile({
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        email: nextDraft.email,
        avatarUrl: nextDraft.avatar,
      });

      setDraft(nextDraft);
      setNotice(tr("settings.messages.profileUpdated"));
    } catch {
      setNotice(tr("settings.messages.profileUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-8">
        <PanelHeading title={tr("settings.tabs.account")} description={tr("settings.description")} />
        <SignedOutState title={tr("settings.tabs.account")} actionLabel={tr("Login")} onAction={() => navigate(LOGIN_PATH)} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PanelHeading title={tr("settings.tabs.account")} description={tr("settings.description")} />

      <Section title={tr("settings.account.profile.title")}>
        <div className="space-y-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/70 bg-zinc-900 text-xl font-semibold text-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-100 dark:text-zinc-900">
              {draft.avatar ? (
                <img src={draft.avatar} alt={draft.nickname || draft.email} className="h-full w-full object-cover" />
              ) : (
                initials || "OC"
              )}
            </div>
            <div>
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {draft.nickname || draft.email || "OpenChat User"}
              </div>
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {draft.email || user?.email || "-"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2 block">{tr("settings.account.editProfile.nickname")}</Label>
              <Input
                value={draft.nickname}
                onValueChange={(value) => setDraft((current) => ({ ...current, nickname: value }))}
                placeholder={tr("settings.account.editProfile.nicknamePlaceholder")}
              />
            </div>

            <div>
              <Label className="mb-2 block">{tr("settings.account.binding.email")}</Label>
              <Input
                type="email"
                value={draft.email}
                onValueChange={(value) => setDraft((current) => ({ ...current, email: value }))}
                placeholder={tr("settings.account.binding.emailPlaceholder")}
              />
            </div>

            <div>
              <Label className="mb-2 block">{tr("settings.account.binding.phone")}</Label>
              <Input
                value={draft.phone}
                onValueChange={(value) => setDraft((current) => ({ ...current, phone: value }))}
                placeholder={tr("settings.account.binding.phonePlaceholder")}
              />
            </div>

            <div>
              <Label className="mb-2 block">{tr("settings.account.editProfile.region")}</Label>
              <Input
                value={draft.region}
                onValueChange={(value) => setDraft((current) => ({ ...current, region: value }))}
                placeholder={tr("settings.account.editProfile.regionPlaceholder")}
              />
            </div>

            <div className="md:col-span-2">
              <Label className="mb-2 block">{tr("settings.account.editProfile.bio")}</Label>
              <Textarea
                value={draft.bio}
                onValueChange={(value) => setDraft((current) => ({ ...current, bio: value }))}
                placeholder={tr("settings.account.editProfile.bioPlaceholder")}
                rows={5}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {notice ? (
              <p className="mr-auto text-sm text-zinc-500 dark:text-zinc-400">{notice}</p>
            ) : null}
            <Button onClick={() => void handleSave()} disabled={isSaving || isLoading}>
              {isSaving ? tr("settings.account.editProfile.saving") : tr("settings.account.editProfile.save")}
            </Button>
          </div>
        </div>
      </Section>

      <Section title={tr("settings.account.actions.logout")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{tr("settings.description")}</div>
          <Button variant="destructive" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" />
            {tr("settings.account.actions.logout")}
          </Button>
        </div>
      </Section>
    </div>
  );
}
