use std::path::{Path, PathBuf};
use std::process::Command;
use std::io::Write;
use std::fs::File;
use anyhow::{Result, anyhow};
use uuid::Uuid;
use crate::utils::get_ffmpeg_path; 

pub fn add_intro(intro_path: &str, video_path: &str, output_dir: &str) -> Result<String> {
    let ffmpeg_path = get_ffmpeg_path();  
    
    if !ffmpeg_path.exists() {
        return Err(anyhow!("FFmpeg not found at {:?}", ffmpeg_path));
    }

    // Create a temporary file list for concatenation
    let temp_file_path = Path::new(output_dir).join(format!("concat_{}.txt", Uuid::new_v4()));
    let output_path = Path::new(output_dir).join(format!("merged_{}.mp4", Uuid::new_v4()));

    // Write the file paths to the temporary concat file
    let mut file = File::create(&temp_file_path)?;
    writeln!(file, "file '{}'", intro_path)?;
    writeln!(file, "file '{}'", video_path)?;

    // Use FFmpeg to concatenate the files
    let status = Command::new(&ffmpeg_path)
        .args(&[
            "-f", "concat",
            "-safe", "0",
            "-i", temp_file_path.to_str().unwrap(),
            "-c", "copy",  // Copy codecs to avoid re-encoding
            "-y",  // Overwrite output files without asking
            output_path.to_str().unwrap()
        ])
        .status()?;

    // Clean up the temporary file
    std::fs::remove_file(&temp_file_path)?;

    if !status.success() {
        return Err(anyhow!("FFmpeg failed to concatenate the videos"));
    }

    Ok(output_path.to_str().unwrap().to_string())
}
