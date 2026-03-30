import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

function readSource(relativePath: string) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("desktop command surface alignment", () => {
  it("keeps the Rust command catalog focused on commands the desktop shell actually uses", () => {
    const commandsSource = readSource("src-tauri/src/commands.rs");
    const catalogSource = readSource("src/app/desktop/catalog.ts");

    expect(commandsSource).toContain("pub fn set_app_language");
    expect(commandsSource).not.toContain("pub fn greet");
    expect(commandsSource).not.toContain("pub fn minimize_window");
    expect(commandsSource).not.toContain("pub fn maximize_window");
    expect(commandsSource).not.toContain("pub fn close_window");
    expect(commandsSource).not.toContain("window.close()");

    expect(catalogSource).toContain('setAppLanguage: "set_app_language"');
    expect(catalogSource).not.toContain("close_window");
    expect(catalogSource).not.toContain("maximize_window");
    expect(catalogSource).not.toContain("minimize_window");
  });
});
