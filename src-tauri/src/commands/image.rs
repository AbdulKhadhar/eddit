use crate::utils::get_ffmpeg_path;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Stdio;
use tauri::command;
use tokio::process::Command;
use uuid::Uuid;
use tokio::sync::Semaphore;
use std::sync::Arc;
use std::sync::OnceLock;

static IMAGE_CONCURRENCY_LIMIT: OnceLock<Arc<Semaphore>> = OnceLock::new();

fn get_semaphore() -> Arc<Semaphore> {
    IMAGE_CONCURRENCY_LIMIT.get_or_init(|| Arc::new(Semaphore::new(4))).clone()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageSettings {
    pub quality: u32,
    pub lossless: bool,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub crop_w: Option<u32>,
    pub crop_h: Option<u32>,
    pub crop_x: Option<u32>,
    pub crop_y: Option<u32>,
}

#[command]
pub async fn optimize_image(
    input_path: String,
    output_dir: String,
    settings: ImageSettings,
) -> Result<String, String> {
    let semaphore = get_semaphore();
    let _permit = semaphore.acquire().await.unwrap();

    let ffmpeg_path = get_ffmpeg_path();
    if !ffmpeg_path.exists() {
        return Err("FFmpeg not found".to_string());
    }

    let input_filename = Path::new(&input_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let output_name = format!("{}_eddit.webp", input_filename);
    let mut final_output_path = Path::new(&output_dir).join(&output_name);
    let mut count = 1;
    while final_output_path.exists() {
        final_output_path = Path::new(&output_dir).join(format!("{}_eddit_{}.webp", input_filename, count));
        count += 1;
    }

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut cmd = Command::new(&ffmpeg_path);
        cmd.creation_flags(0x08000000);
        cmd
    };

    #[cfg(not(target_os = "windows"))]
    let mut command = Command::new(&ffmpeg_path);

    command.args(&["-i", &input_path]);

    let mut vf_filters = Vec::new();

    if let (Some(w), Some(h), Some(x), Some(y)) = (settings.crop_w, settings.crop_h, settings.crop_x, settings.crop_y) {
        vf_filters.push(format!("crop={}:{}:{}:{}", w, h, x, y));
    }

    if let (Some(w), Some(h)) = (settings.width, settings.height) {
        vf_filters.push(format!("scale={}:{}", w, h));
    } else if let Some(w) = settings.width {
        vf_filters.push(format!("scale={}:-1", w));
    } else if let Some(h) = settings.height {
        vf_filters.push(format!("scale=-1:{}", h));
    }

    if !vf_filters.is_empty() {
        command.args(&["-vf", &vf_filters.join(",")]);
    }

    command.args(&["-c:v", "libwebp"]);

    if settings.lossless {
        command.args(&["-lossless", "1"]);
    } else {
        command.args(&["-q:v", &settings.quality.to_string()]);
    }

    command.args(&["-y", final_output_path.to_str().unwrap()]);
    command.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::piped());

    let output = command.output().await.map_err(|e| e.to_string())?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg failed: {}", err));
    }

    Ok(final_output_path.to_str().unwrap().to_string())
}
