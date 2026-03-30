import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const runTauriCliModuleUrl = pathToFileURL(
  path.resolve(__dirname, "..", "..", "scripts", "run-tauri-cli.mjs"),
).href;

describe("desktop tauri cli rust toolchain bootstrap", () => {
  it("uses target platform path semantics when resolving rustup bin candidates", async () => {
    const originalArgv1 = process.argv[1];
    process.argv[1] = path.resolve(__dirname, "desktop.tauri-cli.toolchain.test.ts");
    const { resolvePathApiForPlatform, resolveRustToolchainBinCandidates } = await import(
      runTauriCliModuleUrl
    );
    process.argv[1] = originalArgv1;

    expect(resolvePathApiForPlatform("win32")).toBe(path.win32);
    expect(resolvePathApiForPlatform("linux")).toBe(path.posix);
    expect(
      resolveRustToolchainBinCandidates({
        env: {
          USERPROFILE: "C:\\Users\\admin",
        },
        platform: "win32",
      }),
    ).toContain(path.win32.join("C:\\Users\\admin", ".cargo", "bin"));
  });

  it("adds the local rustup cargo bin to PATH for windows desktop builds", async () => {
    const originalArgv1 = process.argv[1];
    process.argv[1] = path.resolve(__dirname, "desktop.tauri-cli.toolchain.test.ts");
    const { createTauriCliPlan } = await import(runTauriCliModuleUrl);
    process.argv[1] = originalArgv1;

    const rustupBinDir = path.win32.join("C:\\Users\\admin", ".cargo", "bin");

    const plan = createTauriCliPlan({
      argv: ["build", "--vite-mode", "production"],
      env: {
        PATH: "C:\\Windows\\System32",
        USERPROFILE: "C:\\Users\\admin",
      },
      platform: "win32",
      pathExists: (candidatePath: string) => candidatePath === rustupBinDir,
      inspectCommand: (command: string) => ({
        available: true,
        command,
      }),
    });

    expect(plan.command).toBe("tauri.cmd");
    expect(plan.env.SDKWORK_VITE_MODE).toBe("production");
    expect(plan.env.PATH?.split(";")).toContain(rustupBinDir);
  });

  it("surfaces a clear windows rust toolchain hint when cargo is still unavailable", async () => {
    const originalArgv1 = process.argv[1];
    process.argv[1] = path.resolve(__dirname, "desktop.tauri-cli.toolchain.test.ts");
    const { ensureTauriRustToolchainEnv } = await import(runTauriCliModuleUrl);
    process.argv[1] = originalArgv1;

    expect(() =>
      ensureTauriRustToolchainEnv(
        {
          PATH: "C:\\Windows\\System32",
          USERPROFILE: "C:\\Users\\admin",
        },
        {
          platform: "win32",
          pathExists: () => false,
          inspectCommand: (command: string) => ({
            available: false,
            command,
            reason: "not-found",
            error: "spawn ENOENT",
          }),
        },
      ),
    ).toThrowError(/%USERPROFILE%\\\.cargo\\bin/);
  });
});
