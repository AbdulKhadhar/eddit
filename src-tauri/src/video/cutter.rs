use std::{os::windows::process::CommandExt, path::Path};
use std::process::{Command, Stdio};
use anyhow::{Result, anyhow};
use serde_json::Value;
use super::super::commands::video::VideoMetadata;
use crate::utils::{get_ffmpeg_path, get_ffprobe_path}; 

pub fn get_metadata(video_path: &str) -> Result<VideoMetadata> {
    let ffprobe_path = get_ffprobe_path();

    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut command = Command::new(ffprobe_path);
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
        command
    };

    #[cfg(not(target_os = "windows"))]
    let mut cmd = Command::new(ffprobe_path);

    let output = cmd
        .args(&[
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            video_path
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())  // Capture output for parsing
        .stderr(Stdio::null())   // Hide errors from appearing in the console
        .output()?;

    if !output.status.success() {
        return Err(anyhow!("ffprobe command failed"));
    }

    let json_output: Value = serde_json::from_slice(&output.stdout)?;
    let streams = json_output["streams"]
        .as_array()
        .ok_or_else(|| anyhow!("No streams found"))?;

    let video_stream = streams
        .iter()
        .find(|s| s["codec_type"].as_str().unwrap_or("") == "video")
        .ok_or_else(|| anyhow!("No video stream found"))?;

    let duration_str = json_output["format"]["duration"]
        .as_str()
        .ok_or_else(|| anyhow!("No duration found"))?;
    let duration = duration_str.parse::<f64>()?;

    let width = video_stream["width"]
        .as_u64()
        .ok_or_else(|| anyhow!("No width found"))? as u32;
    let height = video_stream["height"]
        .as_u64()
        .ok_or_else(|| anyhow!("No height found"))? as u32;

    let frame_rate_str = video_stream["r_frame_rate"]
        .as_str()
        .ok_or_else(|| anyhow!("No frame rate found"))?;
    let parts: Vec<&str> = frame_rate_str.split('/').collect();
    if parts.len() != 2 {
        return Err(anyhow!("Invalid frame rate format"));
    }

    let numerator = parts[0].parse::<f64>()?;
    let denominator = parts[1].parse::<f64>()?;
    let framerate = numerator / denominator;

    let codec = video_stream["codec_name"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

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
    let ffmpeg_path = get_ffmpeg_path();

    let output_path = Path::new(output_dir)
        .join(format!("{}.mp4", output_name));

    let duration = end_time - start_time;

    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut command = Command::new(ffmpeg_path);
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
        command
    };

    #[cfg(not(target_os = "windows"))]
    let mut cmd = Command::new(ffmpeg_path);

    let status = cmd
        .args(&[
            "-i", input_path,
            "-ss", &start_time.to_string(),
            "-t", &duration.to_string(),
            "-c:v", "copy",
            "-c:a", "copy",
            "-avoid_negative_ts", "make_zero",
            "-y",
            output_path.to_str().unwrap()
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())  // Hides console output
        .stderr(Stdio::null())  // Hides error messages
        .status()?;

    if !status.success() {
        return Err(anyhow!("FFmpeg command failed"));
    }

    Ok(output_path.to_str().unwrap().to_string())
}
