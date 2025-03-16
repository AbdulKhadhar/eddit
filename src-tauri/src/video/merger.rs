use tauri::{Emitter, Manager};
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};
use std::path::Path;
use std::fs::File;
use std::io::{BufReader, BufRead};
use uuid::Uuid;
use anyhow::{Result, anyhow};
use std::sync::{Arc, Mutex};
use std::thread;
use crate::commands::video::CompressionSettings;
use crate::utils::get_ffmpeg_path;

pub async fn add_intro_with_progress(
    intro_path: String, 
    video_path: String, 
    output_dir: String,
    settings: Option<CompressionSettings>,
    window: tauri::Window
) -> Result<String, String> {
    let temp_dir = std::env::temp_dir();
    let progress_file = temp_dir.join(format!("ffmpeg_progress_{}.txt", Uuid::new_v4()));
    let progress_path = progress_file.to_str().unwrap().to_string();
    
    let intro_duration = match crate::video::cutter::get_metadata(&intro_path) {
        Ok(meta) => meta.duration,
        Err(e) => return Err(format!("Failed to get intro metadata: {}", e))
    };
    
    let video_duration = match crate::video::cutter::get_metadata(&video_path) {
        Ok(meta) => meta.duration,
        Err(e) => return Err(format!("Failed to get video metadata: {}", e))
    };
    
    let total_duration = intro_duration + video_duration;
    
    let progress_path_clone = progress_path.clone();
    let window_clone = window.clone();
    
    let _monitor_handle = thread::spawn(move || {
        let path = progress_path_clone;
        
        while !Path::new(&path).exists() {
            thread::sleep(std::time::Duration::from_millis(100));
        }
        
        loop {
            if !Path::new(&path).exists() {
                break;
            }
            
            if let Ok(file) = File::open(&path) {
                let reader = BufReader::new(file);
                let mut current_time = 0.0;
                
                for line in reader.lines().flatten() {
                    if line.starts_with("out_time_ms=") {
                        if let Ok(time_ms) = line.trim_start_matches("out_time_ms=").parse::<f64>() {
                            current_time = time_ms / 1_000_000.0;
                        }
                    }
                }
                
                let progress = ((current_time / total_duration) * 100.0).min(100.0).max(0.0);
                
                let _ = window_clone.emit("intro_progress", progress);
            }
            
            thread::sleep(std::time::Duration::from_millis(200));
        }
        
        let _ = window_clone.emit("intro_progress", 100.0);
    });

    let result = add_intro_internal(&intro_path, &video_path, &output_dir, settings, &progress_path).await;
    let _ = std::fs::remove_file(progress_file);

    result.map_err(|e| format!("Failed to add intro: {}", e))
}



async fn add_intro_internal(
    intro_path: &str, 
    video_path: &str, 
    output_dir: &str,
    settings: Option<CompressionSettings>,
    progress_file: &str
) -> Result<String> {
    let ffmpeg_path = get_ffmpeg_path();
    
    if !ffmpeg_path.exists() {
        return Err(anyhow!("FFmpeg not found at {:?}", ffmpeg_path));
    }
    
    // Extract filenames without extensions for better naming
    let intro_filename = Path::new(intro_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();
    
    let video_filename = Path::new(video_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();
    
    // Standardized output file naming
    let mut base_output_name = format!("{}_{}", intro_filename, video_filename);
    let mut output_path = Path::new(output_dir).join(format!("{}.mp4", base_output_name));
    
    // Ensure unique naming if the file already exists
    let mut count = 1;
    while output_path.exists() {
        base_output_name = format!("{}_{}_{}", intro_filename, video_filename, count);
        output_path = Path::new(output_dir).join(format!("{}.mp4", base_output_name));
        count += 1;
    }
    
    // Create command with hidden window
    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut command = Command::new(&ffmpeg_path);
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
        command
    };
    
    #[cfg(not(target_os = "windows"))]
    let mut cmd = Command::new(&ffmpeg_path);
    
    // First try with copy codec (faster processing)
    cmd.args(&[
        "-i", intro_path,
        "-i", video_path,
        "-filter_complex", "[0:v:0][0:a:0][1:v:0][1:a:0] concat=n=2:v=1:a=1 [v][a]",
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-progress", progress_file,
        "-y",
        output_path.to_str().unwrap()
    ])
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::null());
    
    let status = cmd.status()?;
    
    // If copy codec fails, use re-encoding
    if !status.success() {
        let preset = settings.as_ref().map_or("fast", |s| s.preset());
        let crf = settings.as_ref().map_or(28, |s| s.quality()).to_string();
        let codec = settings.as_ref().map_or("libx264", |s| s.codec());
        
        #[cfg(target_os = "windows")]
        let mut cmd = {
            let mut command = Command::new(&ffmpeg_path);
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
            command
        };
        
        #[cfg(not(target_os = "windows"))]
        let mut cmd = Command::new(&ffmpeg_path);
        
        cmd.args(&[
            "-i", intro_path,
            "-i", video_path,
            "-filter_complex", "[0:v:0][0:a:0][1:v:0][1:a:0] concat=n=2:v=1:a=1 [v][a]",
            "-map", "[v]",
            "-map", "[a]",
            "-c:v", codec,
            "-preset", preset,
            "-crf", &crf,
            "-progress", progress_file,
            "-y",
            output_path.to_str().unwrap()
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
        
        let status = cmd.status()?;
        
        if !status.success() {
            return Err(anyhow!("FFmpeg failed to concatenate the videos"));
        }
    }
    
    Ok(output_path.to_str().unwrap().to_string())
}


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
