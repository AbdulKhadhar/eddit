use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use anyhow::{Result, anyhow};
use uuid::Uuid;
use super::super::commands::video::CompressionSettings;
use crate::utils::get_ffmpeg_path; 

pub fn compress_video(input_path: &str, output_dir: &str, settings: CompressionSettings) -> Result<String> {
    let ffmpeg_path = get_ffmpeg_path();  
    
    if !ffmpeg_path.exists() {
        return Err(anyhow!("FFmpeg not found at {:?}", ffmpeg_path));
    }

    let output_filename = format!("compressed_{}.mp4", Uuid::new_v4());
    let output_path = Path::new(output_dir).join(&output_filename);

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut cmd = Command::new(&ffmpeg_path);
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW flag (prevents CMD window)
        cmd
    };

    #[cfg(not(target_os = "windows"))]
    let mut command = Command::new(&ffmpeg_path);

    command.args(&[
        "-i", input_path,
        "-c:v", &settings.codec(),
        "-preset", &settings.preset(),
    ]);
    
    // CRF mode for x264/x265, bitrate for others
    if settings.codec() == "libx264" || settings.codec() == "libx265" {
        command.args(&[
            "-crf", &settings.quality().to_string(),
        ]);
    } else {
        let bitrate = match settings.quality() {
            0..=10 => "8M",
            11..=20 => "5M",
            21..=30 => "2M",
            _ => "1M",
        };
        command.args(&["-b:v", bitrate]);
    }

    command.args(&[
        "-c:a", "aac",
        "-b:a", "128k",
        "-y",
        output_path.to_str().unwrap()
    ])
    .stdin(Stdio::null())
    .stdout(Stdio::null())  // Hide standard output
    .stderr(Stdio::null()); // Hide error output

    let status = command.status()?;

    if !status.success() {
        return Err(anyhow!("FFmpeg compression failed for {}", input_path));
    }

    Ok(output_path.to_str().unwrap().to_string())
}
