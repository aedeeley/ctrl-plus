fn main() {
    let secret = std::env::var("LICENSE_JWT_SECRET").unwrap_or_else(|_| {
        "ctrl-plus-dev-jwt-secret-change-in-production".to_string()
    });

    #[cfg(not(debug_assertions))]
    if secret == "ctrl-plus-dev-jwt-secret-change-in-production" {
        println!(
            "cargo:warning=LICENSE_JWT_SECRET is unset for a release build; Pro license activation may fail if the server uses a different JWT secret"
        );
    }

    println!("cargo:rustc-env=LICENSE_JWT_SECRET={secret}");
    tauri_build::build()
}
