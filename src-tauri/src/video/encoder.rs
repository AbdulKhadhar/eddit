use std::path::{Path, PathBuf};
use std::process::Command;
use anyhow::{Result, anyhow};
use uuid::Uuid;
use super::super::commands::video::CompressionSettings;

pub fn compress_video(input_path: &str, output_dir: &str, settings: CompressionSettings) -> Result<String> {
    let output_filename = format!("compressed_{}.mp4", Uuid::new_v4());
    let output_path = Path::new(output_dir).join(&output_filename);
    
    // For HandBrake-like quality, we'll use FFmpeg with appropriate settings
    let mut command = Command::new("ffmpeg");
    command.args(&[
        "-i", input_path,
        "-c:v", &settings.codec(),
        "-preset", &settings.preset(),
    ]);
    
    // Add quality settings based on codec
    if settings.codec() == "libx264" || settings.codec() == "libx265" {
        // CRF mode (Constant Rate Factor) - lower means better quality
        command.args(&[
            "-crf", &settings.quality().to_string(),
        ]);
    } else {
        // Fallback to bitrate-based approach for other codecs
        let bitrate = match settings.quality() {
            0..=10 => "8M",    // Very high quality
            11..=20 => "5M",   // High quality
            21..=30 => "2M",   // Medium quality
            _ => "1M",         // Low quality
        };
        command.args(&["-b:v", bitrate]);
    }
    
    // Audio settings - AAC with decent quality
    command.args(&[
        "-c:a", "aac",
        "-b:a", "128k",
        "-y",  // Overwrite output without asking
        output_path.to_str().unwrap()
    ]);
    
    let status = command.status()?;
    
    if !status.success() {
        return Err(anyhow!("FFmpeg compression command failed"));
    }
    
    Ok(output_path.to_str().unwrap().to_string())
}