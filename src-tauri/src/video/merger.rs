use std::process::Command;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use uuid::Uuid;
use anyhow::{Result, anyhow};

use crate::utils::get_ffmpeg_path;

pub fn add_intro(intro_path: &str, video_path: &str, output_dir: &str) -> Result<String> {
    let ffmpeg_path = get_ffmpeg_path();  
    
    if !ffmpeg_path.exists() {
        return Err(anyhow!("FFmpeg not found at {:?}", ffmpeg_path));
    }

    // Extract filenames (without extensions) for better naming
    let intro_filename = Path::new(intro_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();
    
    let video_filename = Path::new(video_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();

    // Generate a unique output filename with UUID
    let unique_id = Uuid::new_v4();
    let output_filename = format!("merged_{}_{}_{}.mp4", intro_filename, video_filename, unique_id);
    let output_path = Path::new(output_dir).join(output_filename);

    // Step 1: Try `-c:v copy` to avoid re-encoding
    let status = Command::new(&ffmpeg_path)
        .args(&[
            "-i", intro_path,
            "-i", video_path,
            "-filter_complex", "[0:v:0][0:a:0][1:v:0][1:a:0] concat=n=2:v=1:a=1 [v][a]",
            "-map", "[v]",
            "-map", "[a]",
            "-c:v", "copy", // Try to copy video without encoding
            "-c:a", "aac",  // Encode audio for compatibility
            "-b:a", "192k", 
            "-strict", "experimental",
            "-report", // Debugging: Logs errors to `ffmpeg-*.log`
            "-y",  
            output_path.to_str().unwrap()
        ])
        .status()?;

    // Step 2: If `-c:v copy` fails, fallback to encoding with controlled bitrate
    if !status.success() {
        println!("⚠️ Warning: -c:v copy failed! Falling back to encoding...");

        let status = Command::new(&ffmpeg_path)
            .args(&[
                "-i", intro_path,
                "-i", video_path,
                "-filter_complex", "[0:v:0][0:a:0][1:v:0][1:a:0] concat=n=2:v=1:a=1 [v][a]",
                "-map", "[v]",
                "-map", "[a]",
                "-preset", "fast", // Faster encoding with smaller size
                "-b:v", "2M",  // Set max bitrate (2 Mbps)
                "-crf", "28",  // Reduce file size (higher = smaller)
                "-y",  
                output_path.to_str().unwrap()
            ])
            .status()?;

        if !status.success() {
            return Err(anyhow!("FFmpeg failed to concatenate the videos"));
        }
    }

    Ok(output_path.to_str().unwrap().to_string())
}
