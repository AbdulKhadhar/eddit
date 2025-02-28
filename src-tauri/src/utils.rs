use std::env::current_exe;
use std::path::PathBuf;

/// Get the correct installed FFmpeg path
pub fn get_ffmpeg_path() -> PathBuf {
    let app_dir = current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("C:\\Program Files\\eddit")); // Ensure fallback

    app_dir.join("bin").join("ffmpeg.exe") 
}

/// Get the correct installed FFprobe path
pub fn get_ffprobe_path() -> PathBuf {
    let app_dir = current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("C:\\Program Files\\eddit")); // Ensure fallback

    app_dir.join("bin").join("ffprobe.exe") 
}
