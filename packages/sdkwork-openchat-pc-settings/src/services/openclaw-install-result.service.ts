import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import { OpenClawInstallService } from "./OpenClawInstallService";

export const OpenClawInstallResultService = createServiceResultProxy(OpenClawInstallService, {
  source: "local",
  fallbackMessage: "OpenClaw install catalog request failed.",
});
