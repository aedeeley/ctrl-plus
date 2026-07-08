fn main() {
    // Re-run this build script (and re-bake the secret) whenever the env var
    // changes, otherwise Cargo caches the previously compiled-in secret.
    println!("cargo:rerun-if-env-changed=LICENSE_JWT_SECRET");

    let secret = std::env::var("LICENSE_JWT_SECRET")
        .unwrap_or_else(|_| "ctrl-plus-dev-jwt-secret-change-in-production".to_string());

    if secret == "ctrl-plus-dev-jwt-secret-change-in-production" {
        println!(
            "cargo:warning=LICENSE_JWT_SECRET is unset; using the dev default. Pro license tokens signed by ctrlplus.pro will FAIL verification. Set LICENSE_JWT_SECRET to the production secret and rebuild."
        );
    }

    println!("cargo:rustc-env=LICENSE_JWT_SECRET={secret}");
    tauri_build::build()
}
