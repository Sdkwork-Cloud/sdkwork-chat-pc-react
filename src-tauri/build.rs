use std::{fs, path::Path};

const FRONTEND_DIST_RELATIVE_PATH: &str = "../dist";

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed={FRONTEND_DIST_RELATIVE_PATH}");

    ensure_required_tauri_paths();
    tauri_build::build();
}

fn ensure_required_tauri_paths() {
    ensure_directory_exists(
        Path::new(FRONTEND_DIST_RELATIVE_PATH),
        "frontend dist directory",
    );
}

fn ensure_directory_exists(directory: &Path, label: &str) {
    if directory.exists() {
        return;
    }

    if let Err(error) = fs::create_dir_all(directory) {
        println!(
            "cargo:warning=failed to create missing {label} {}: {error}",
            directory.display()
        );
        return;
    }

    println!(
        "cargo:warning=created missing {label} {} so clean-clone cargo builds can resolve the Tauri config",
        directory.display()
    );
}
