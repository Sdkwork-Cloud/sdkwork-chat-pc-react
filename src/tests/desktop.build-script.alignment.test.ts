import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

describe("desktop build script alignment", () => {
  it("keeps a claw-style tauri build scaffold for clean-clone desktop builds", () => {
    const buildScript = readFileSync(path.join(REPO_ROOT, "src-tauri/build.rs"), "utf8");

    expect(buildScript).toContain('const FRONTEND_DIST_RELATIVE_PATH: &str = "../dist";');
    expect(buildScript).toContain('println!("cargo:rerun-if-changed=build.rs")');
    expect(buildScript).toContain('println!("cargo:rerun-if-changed={FRONTEND_DIST_RELATIVE_PATH}")');
    expect(buildScript).toContain("ensure_required_tauri_paths();");
    expect(buildScript).toContain('ensure_directory_exists(');
    expect(buildScript).toContain('"frontend dist directory"');
    expect(buildScript).toContain("fs::create_dir_all(directory)");
  });
});
