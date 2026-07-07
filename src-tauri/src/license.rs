use crate::database::Database;
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(debug_assertions)]
pub const UPGRADE_URL: &str = "http://localhost:3000/#buy";
#[cfg(not(debug_assertions))]
pub const UPGRADE_URL: &str = "https://ctrlplus.pro/#buy";

#[cfg(debug_assertions)]
pub const LICENSE_API_URL: &str = "http://localhost:3000/api/activate";
#[cfg(not(debug_assertions))]
pub const LICENSE_API_URL: &str = "https://ctrlplus.pro/api/activate";

pub const LICENSE_KEY_SETTING: &str = "license_key";
pub const LICENSE_TIER_SETTING: &str = "license_tier";
pub const LICENSE_TOKEN_SETTING: &str = "license_token";
pub const LICENSE_ACTIVATED_AT_SETTING: &str = "license_activated_at";

pub const DEV_LICENSE_KEY: &str = "CTRL-DEV-UNLOCK";

const DEFAULT_LICENSE_JWT_SECRET: &str = "ctrl-plus-dev-jwt-secret-change-in-production";

fn license_jwt_secret() -> &'static str {
    option_env!("LICENSE_JWT_SECRET").unwrap_or(DEFAULT_LICENSE_JWT_SECRET)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LicenseTier {
    Free,
    Pro,
}

impl LicenseTier {
    pub fn from_str(value: &str) -> Self {
        match value {
            "pro" => Self::Pro,
            _ => Self::Free,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Free => "free",
            Self::Pro => "pro",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub tier: LicenseTier,
    pub key: Option<String>,
    pub activated_at: Option<i64>,
}

impl Default for LicenseStatus {
    fn default() -> Self {
        Self {
            tier: LicenseTier::Free,
            key: None,
            activated_at: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActivateRequest {
    key: String,
    machine_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActivateResponse {
    tier: String,
    token: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct LicenseClaims {
    sub: String,
    tier: String,
    machine_id: String,
    exp: Option<u64>,
}

pub fn machine_id() -> String {
    let mut hasher = Sha256::new();
    if let Ok(name) = std::env::var("COMPUTERNAME") {
        hasher.update(name.as_bytes());
    }
    if let Ok(user) = std::env::var("USERNAME") {
        hasher.update(user.as_bytes());
    }
    hasher.update(b"ctrl-plus-v1");
    hex::encode(hasher.finalize())
}

pub fn load_license(db: &Database) -> Result<LicenseStatus, String> {
    let tier = db
        .get_setting(LICENSE_TIER_SETTING)?
        .map(|value| LicenseTier::from_str(&value))
        .unwrap_or(LicenseTier::Free);

    let key = db.get_setting(LICENSE_KEY_SETTING)?;
    let token = db.get_setting(LICENSE_TOKEN_SETTING)?;
    let activated_at = db
        .get_setting(LICENSE_ACTIVATED_AT_SETTING)?
        .and_then(|value| value.parse::<i64>().ok());

    let mut status = LicenseStatus {
        tier,
        key: key.clone(),
        activated_at,
    };

    if status.tier == LicenseTier::Pro {
        if let Some(token) = token.filter(|value| !value.is_empty()) {
            if !verify_token(&token, key.as_deref()) {
                status.tier = LicenseTier::Free;
            }
        } else {
            status.tier = LicenseTier::Free;
        }
    }

    Ok(status)
}

pub fn save_license(db: &Database, status: &LicenseStatus, token: Option<&str>) -> Result<(), String> {
    db.set_setting(LICENSE_TIER_SETTING, status.tier.as_str())?;
    db.set_setting(
        LICENSE_KEY_SETTING,
        status.key.as_deref().unwrap_or(""),
    )?;
    db.set_setting(LICENSE_TOKEN_SETTING, token.unwrap_or(""))?;
    db.set_setting(
        LICENSE_ACTIVATED_AT_SETTING,
        &status.activated_at.unwrap_or(0).to_string(),
    )?;
    Ok(())
}

pub fn is_pro(db: &Database) -> bool {
    load_license(db)
        .map(|status| status.tier == LicenseTier::Pro)
        .unwrap_or(false)
}

pub fn dev_license_token(key: &str) -> String {
    format!("dev.{key}.{}.pro", machine_id())
}

pub fn activate_dev_license() -> Result<(LicenseStatus, String), String> {
    let key = DEV_LICENSE_KEY.to_string();
    let token = dev_license_token(&key);
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;

    let status = LicenseStatus {
        tier: LicenseTier::Pro,
        key: Some(key),
        activated_at: Some(now),
    };

    Ok((status, token))
}

pub fn is_dev_license_key(key: &str) -> bool {
    normalize_license_key(key) == DEV_LICENSE_KEY
}

fn verify_token(token: &str, expected_key: Option<&str>) -> bool {
    if token.is_empty() {
        return false;
    }

    if token.starts_with("dev.") {
        return verify_dev_token(token, expected_key);
    }

    let key = DecodingKey::from_secret(license_jwt_secret().as_bytes());
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = false;

    let Ok(token_data) = decode::<LicenseClaims>(token, &key, &validation) else {
        return false;
    };

    if token_data.claims.tier != "pro" {
        return false;
    }

    if token_data.claims.machine_id != machine_id() {
        return false;
    }

    if let Some(key) = expected_key {
        if token_data.claims.sub != key {
            return false;
        }
    }

    true
}

fn verify_dev_token(token: &str, expected_key: Option<&str>) -> bool {
    let payload = token.strip_prefix("dev.").unwrap_or("");
    let parts: Vec<&str> = payload.split('.').collect();
    if parts.len() != 3 {
        return false;
    }

    let (key_part, machine_part, tier_part) = (parts[0], parts[1], parts[2]);
    if tier_part != "pro" || machine_part != machine_id() {
        return false;
    }

    if let Some(key) = expected_key {
        return key_part == key;
    }

    true
}

pub async fn activate_license_online(key: &str) -> Result<(LicenseStatus, String), String> {
    let normalized = normalize_license_key(key);
    if normalized.is_empty() {
        return Err("License key is required".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let body = ActivateRequest {
        key: normalized.clone(),
        machine_id: machine_id(),
    };

    let response = client
        .post(LICENSE_API_URL)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Could not reach license server: {e}"))?;

    if !response.status().is_success() {
        let message = response
            .text()
            .await
            .unwrap_or_else(|_| "Activation failed".to_string());
        return Err(parse_error_message(&message));
    }

    let payload: ActivateResponse = response
        .json()
        .await
        .map_err(|e| format!("Invalid license server response: {e}"))?;

    if payload.tier != "pro" {
        return Err("Invalid license tier".to_string());
    }

    if !verify_token(&payload.token, Some(&normalized)) {
        return Err("License token verification failed".to_string());
    }

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;

    let status = LicenseStatus {
        tier: LicenseTier::Pro,
        key: Some(normalized),
        activated_at: Some(now),
    };

    Ok((status, payload.token))
}

fn normalize_license_key(key: &str) -> String {
    key.trim().to_ascii_uppercase()
}

fn parse_error_message(body: &str) -> String {
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(body) {
        if let Some(error) = value.get("error").and_then(|v| v.as_str()) {
            return match error {
                "invalid_key" => "Invalid license key".to_string(),
                "activation_limit_reached" => {
                    "Activation limit reached for this license key".to_string()
                }
                other => other.to_string(),
            };
        }
    }

    if body.is_empty() {
        "Activation failed".to_string()
    } else {
        body.to_string()
    }
}
