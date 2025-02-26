use std::path::{Path, PathBuf};
use std::process::Command;
use super::super::commands::video::VideoMetadata;
use anyhow::{Result, anyhow};
use serde_json::Value;

pub fn get_metadata(video_path: &str) -> Result<VideoMetadata> {
    let output = Command::new("ffprobe")
        .args(&[
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            video_path
        ])
        .output()?;
    
    if !output.status.success() {
        return Err(anyhow!("ffprobe command failed"));
    }
    
    let json_output: Value = serde_json::from_slice(&output.stdout)?;
    
    // Extract video stream information
    let streams = json_output["streams"].as_array()
        .ok_or_else(|| anyhow!("No streams found"))?;
    
    let video_stream = streams.iter()
        .find(|s| s["codec_type"].as_str().unwrap_or("") == "video")
        .ok_or_else(|| anyhow!("No video stream found"))?;
    
    // Extract duration from format section (more reliable)
    let duration_str = json_output["format"]["duration"].as_str()
        .ok_or_else(|| anyhow!("No duration found"))?;
    let duration = duration_str.parse::<f64>()?;
    
    // Extract other metadata
    let width = video_stream["width"].as_u64()
        .ok_or_else(|| anyhow!("No width found"))? as u32;
    let height = video_stream["height"].as_u64()
        .ok_or_else(|| anyhow!("No height found"))? as u32;
    
    // Extract framerate as a fraction and calculate
    let frame_rate_str = video_stream["r_frame_rate"].as_str()
        .ok_or_else(|| anyhow!("No frame rate found"))?;
    let parts: Vec<&str> = frame_rate_str.split('/').collect();
    if parts.len() != 2 {
        return Err(anyhow!("Invalid frame rate format"));
    }
    
    let numerator = parts[0].parse::<f64>()?;
    let denominator = parts[1].parse::<f64>()?;
    let framerate = numerator / denominator;
    
    // Get codec name
    let codec = video_stream["codec_name"].as_str()
        .unwrap_or("unknown").to_string();
    
    Ok(VideoMetadata {
        duration,
        width,
        height,
        framerate,
        codec,
    })
}

pub fn cut_segment(
    input_path: &str,
    start_time: f64,
    end_time: f64,
    output_dir: &str,
    output_name: &str
) -> Result<String> {
    let output_path = Path::new(output_dir)
        .join(format!("{}.mp4", output_name));
    
    let duration = end_time - start_time;
    
    // Use FFmpeg to cut the segment
    let status = Command::new("ffmpeg")
        .args(&[
            "-i", input_path,
            "-ss", &start_time.to_string(),
            "-t", &duration.to_string(),
            "-c:v", "copy",  // Copy video codec to avoid re-encoding
            "-c:a", "copy",  // Copy audio codec
            "-avoid_negative_ts", "make_zero",
            "-y",  // Overwrite output files without asking
            output_path.to_str().unwrap()
        ])
        .status()?;
    
    if !status.success() {
        return Err(anyhow!("FFmpeg command failed"));
    }
    
    Ok(output_path.to_str().unwrap().to_string())
}