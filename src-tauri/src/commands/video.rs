// Copyright (c) 2025 Abdul Khadhar. All rights reserved.
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

use crate::{
    utils::get_ffmpeg_path,
    video::{cutter, encoder, merger},
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{path::{Path, PathBuf}, process::Stdio};
use tauri::{command, Emitter, Window};
use tokio::process::Command;
use tokio::time::Instant;

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoSegment {
    start_time: f64, // in seconds
    end_time: f64,   // in seconds
    intro_path: Option<String>,
    output_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration: f64, // in seconds
    pub width: u32,
    pub height: u32,
    pub framerate: f64,
    pub codec: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)] // Enable serialization & deserialization
pub struct CompressionSettings {
    quality: u32,   // 0-51 for x264/x265 (lower is better)
    preset: String, // e.g., "medium", "slow", "veryslow"
    codec: String,  // e.g., "libx264", "libx265"
}

impl CompressionSettings {
    pub fn quality(&self) -> u32 {
        self.quality
    }

    pub fn preset(&self) -> &str {
        &self.preset
    }

    pub fn codec(&self) -> &str {
        &self.codec
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingResult {
    success: bool,
    output_path: Option<String>,
    error_message: Option<String>,
}

#[command]
pub async fn load_video(path: String) -> Result<VideoMetadata, String> {
    match cutter::get_metadata(&path) {
        Ok(metadata) => Ok(metadata),
        Err(e) => Err(format!("Failed to load video: {}", e)),
    }
}

#[command]
pub async fn get_video_metadata(path: String) -> Result<VideoMetadata, String> {
    match cutter::get_metadata(&path) {
        Ok(metadata) => Ok(metadata),
        Err(e) => Err(format!("Failed to get video metadata: {}", e)),
    }
}

#[command]
pub async fn cut_video(
    input_path: String,
    segments: Vec<VideoSegment>,
    output_dir: String,
) -> Vec<ProcessingResult> {
    let mut results = Vec::new();

    for segment in segments {
        let result = match cutter::cut_segment(
            &input_path,
            segment.start_time,
            segment.end_time,
            &output_dir,
            &segment.output_name,
        ) {
            Ok(output_path) => {
                let mut final_path = output_path;

                // Add intro if provided
                if let Some(intro_path) = segment.intro_path {
                    match merger::add_intro(&intro_path, &final_path, &output_dir) {
                        Ok(merged_path) => {
                            final_path = merged_path;
                        }
                        Err(e) => {
                            results.push(ProcessingResult {
                                success: false,
                                output_path: Some(final_path),
                                error_message: Some(format!("Failed to add intro: {}", e)),
                            });
                            continue;
                        }
                    }
                }

                ProcessingResult {
                    success: true,
                    output_path: Some(final_path),
                    error_message: None,
                }
            }
            Err(e) => ProcessingResult {
                success: false,
                output_path: None,
                error_message: Some(format!("Failed to cut segment: {}", e)),
            },
        };

        results.push(result);
    }

    results
}

#[command]
pub async fn cut_video_with_progress(
    input_path: String,
    segments: Vec<VideoSegment>,
    output_dir: String,
    window: Window,
) -> Vec<ProcessingResult> {
    let mut results = Vec::new();

    for (index, segment) in segments.iter().enumerate() {
        let segment_start_time = Instant::now();

        // Emit initial progress event
        let _ = window.emit(
            "segment_progress",
            json!({
                "index": index,
                "total": segments.len(),
                "status": "cutting",
                "progress": 0,
                "estimated_time": null
            }),
        );

        // Start cutting process
        let result = match cutter::cut_segment(
            &input_path,
            segment.start_time,
            segment.end_time,
            &output_dir,
            &segment.output_name,
        ) {
            Ok(output_path) => {
                let mut final_path = output_path;

                // Emit 50% progress after cutting
                let _ = window.emit(
                    "segment_progress",
                    json!({
                        "index": index,
                        "total": segments.len(),
                        "status": "cutting",
                        "progress": 50
                    }),
                );

                // Check if an intro needs to be added
                if let Some(intro_path) = &segment.intro_path {
                    // Emit event before intro processing
                    let _ = window.emit(
                        "segment_progress",
                        json!({
                            "index": index,
                            "total": segments.len(),
                            "status": "adding intro",
                            "progress": 0,
                            "estimated_time": null
                        }),
                    );

                    match merger::add_intro_with_progress(
                        intro_path.clone(),
                        final_path.clone(),
                        output_dir.clone(),
                        None, // Compression settings (if needed)
                        window.clone(),
                    )
                    .await
                    {
                        Ok(merged_path) => {
                            final_path = merged_path;
                        }
                        Err(e) => {
                            results.push(ProcessingResult {
                                success: false,
                                output_path: Some(final_path.clone()),
                                error_message: Some(format!("Failed to add intro: {}", e)),
                            });
                            continue;
                        }
                    }
                }

                let elapsed_time = segment_start_time.elapsed();
                let estimated_time =
                    elapsed_time.as_secs_f64() * ((segments.len() - (index + 1)) as f64);

                // Emit final success event
                let _ = window.emit(
                    "segment_progress",
                    json!({
                        "index": index,
                        "total": segments.len(),
                        "status": "completed",
                        "progress": 100,
                        "estimated_time": estimated_time
                    }),
                );

                ProcessingResult {
                    success: true,
                    output_path: Some(final_path),
                    error_message: None,
                }
            }
            Err(e) => {
                // Emit failure event
                let _ = window.emit(
                    "segment_progress",
                    json!({
                        "index": index,
                        "total": segments.len(),
                        "status": "failed",
                        "progress": 0,
                        "estimated_time": null
                    }),
                );

                ProcessingResult {
                    success: false,
                    output_path: None,
                    error_message: Some(format!("Failed to cut segment: {}", e)),
                }
            }
        };

        results.push(result);
    }

    results
}

fn emit_progress(
    window: &Window,
    index: usize,
    total: usize,
    status: &str,
    progress: u8,
    estimated_time: Option<f64>,
) {
    let _ = window.emit(
        "segment_progress",
        json!({
            "index": index,
            "total": total,
            "status": status,
            "progress": progress,
            "estimated_time": estimated_time
        }),
    );
}

#[command]
pub async fn process_video_with_progress(
    input_path: String,
    segments: Vec<VideoSegment>,
    output_dir: String,
    compression_settings: CompressionSettings,
    window: Window,
) -> Vec<ProcessingResult> {
    let mut results = Vec::new();

    for (index, segment) in segments.iter().enumerate() {
        let segment_start_time = Instant::now();

        // Emit progress: Cutting started
        let _ = window.emit(
            "segment_progress",
            json!({
                "index": index,
                "total": segments.len(),
                "status": "cutting",
                "progress": 0,
            }),
        );

        // Step 1: Cut Video Segment
        let segment_filename = format!("{}", segment.output_name);
        let cut_result = cutter::cut_segment(
            &input_path,
            segment.start_time,
            segment.end_time,
            &output_dir,
            &segment_filename,
        );

        let mut final_path = match cut_result {
            Ok(output_path) => output_path,
            Err(e) => {
                results.push(ProcessingResult {
                    success: false,
                    output_path: None,
                    error_message: Some(format!("Failed to cut segment: {}", e)),
                });
                continue;
            }
        };

        // Emit progress: Cutting done
        let _ = window.emit(
            "segment_progress",
            json!({
                "index": index,
                "total": segments.len(),
                "status": "cutting",
                "progress": 50,
            }),
        );

        // Step 2: Add Intro (if available)
        if let Some(intro_path) = &segment.intro_path {
            let intro_filename = format!("{}_with_intro.mp4", segment.output_name);

            let intro_result = merger::add_intro_with_progress(
                intro_path.to_string(),
                final_path.to_string(),
                output_dir.to_string(),
                None,
                window.clone(),
            )
            .await;

            match intro_result {
                Ok(merged_path) => {
                    // Remove the unmerged cut segment after merging
                    let _ = std::fs::remove_file(&final_path);
                    final_path = merged_path;
                }
                Err(e) => {
                    results.push(ProcessingResult {
                        success: false,
                        output_path: Some(final_path.clone()),
                        error_message: Some(format!("Failed to add intro: {}", e)),
                    });
                    continue;
                }
            }

            // Emit progress: Intro added
            let _ = window.emit(
                "segment_progress",
                json!({
                    "index": index,
                    "total": segments.len(),
                    "status": "adding intro",
                    "progress": 100,
                }),
            );
        }

        // Step 3: Compress the Final Segment
        let compressed_filename = format!("{}_final.mp4", segment.output_name);
        let compressed_path = Path::new(&output_dir).join(&compressed_filename);

        let compression_result =
            compress_video(final_path.clone(), compressed_path.to_str().unwrap().to_string(), compression_settings.clone()).await;

        match compression_result {
            Ok(_) => {
                // Remove previous intermediate file
                let _ = std::fs::remove_file(&final_path);
                final_path = compressed_path.to_str().unwrap().to_string();
            }
            Err(e) => {
                results.push(ProcessingResult {
                    success: false,
                    output_path: Some(final_path.clone()),
                    error_message: Some(format!("Failed to compress: {}", e)),
                });
                continue;
            }
        }

        // Emit final success progress
        let elapsed_time = segment_start_time.elapsed();
        let _ = window.emit("segment_progress", json!({
            "index": index,
            "total": segments.len(),
            "status": "completed",
            "progress": 100,
            "estimated_time": elapsed_time.as_secs_f64() * ((segments.len() - (index + 1)) as f64)
        }));

        results.push(ProcessingResult {
            success: true,
            output_path: Some(final_path),
            error_message: None,
        });
    }

    results
}



#[command]
pub async fn add_intro_with_progress(
    intro_path: String,
    video_path: String,
    output_dir: String,
    settings: Option<CompressionSettings>,
    window: tauri::Window,
) -> Result<String, String> {
    match merger::add_intro_with_progress(intro_path, video_path, output_dir, settings, window)
        .await
    {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(format!("Failed to add intro: {}", e)),
    }
}

#[command]
pub async fn add_intro(
    intro_path: String,
    video_path: String,
    output_dir: String,
) -> Result<String, String> {
    match merger::add_intro(&intro_path, &video_path, &output_dir) {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(format!("Failed to add intro: {}", e)),
    }
}


#[command]
pub async fn compress_video(
    input_path: String,
    output_dir: String,
    settings: CompressionSettings,
) -> Result<String, String> {
    let ffmpeg_path = get_ffmpeg_path();

    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg not found at {:?}", ffmpeg_path));
    }

    // Extract segment name from input_path
    let input_filename = Path::new(&input_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    
    let mut base_output_name = format!("{}_compressed", input_filename);
    let mut output_dir_path = Path::new(&output_dir);

    // Ensure output_dir is actually a folder, not a file
    if output_dir_path.extension().is_some() {
        output_dir_path = output_dir_path.parent().unwrap_or(Path::new("."));
    }

    // Ensure unique filename by appending a number if needed
    let mut final_output_path = output_dir_path.join(format!("{}.mp4", base_output_name));
    let mut count = 1;
    
    while final_output_path.exists() {
        final_output_path = output_dir_path.join(format!("{}_{}.mp4", base_output_name, count));
        count += 1;
    }

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut cmd = Command::new(&ffmpeg_path);
        cmd.creation_flags(0x08000000); // Prevents command window from popping up
        cmd
    };

    #[cfg(not(target_os = "windows"))]
    let mut command = Command::new(&ffmpeg_path);

    command.args(&[
        "-i",
        &input_path,
        "-c:v",
        &settings.codec(),
        "-preset",
        &settings.preset(),
    ]);

    // Set CRF or Bitrate based on codec
    if settings.codec() == "libx264" || settings.codec() == "libx265" {
        command.args(&["-crf", &settings.quality().to_string()]);
    } else {
        let bitrate = match settings.quality() {
            0..=10 => "8M",
            11..=20 => "5M",
            21..=30 => "2M",
            _ => "1M",
        };
        command.args(&["-b:v", bitrate]);
    }

    command
        .args(&[
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-y",
            final_output_path.to_str().unwrap(),
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped()) // Capture FFmpeg output
        .stderr(Stdio::piped());

    let output = command
        .output()
        .await
        .map_err(|e| format!("FFmpeg execution failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg compression failed: {}", stderr));
    }

    Ok(final_output_path.to_str().unwrap().to_string())
}



#[command]
pub async fn save_video(input_path: String, output_path: String) -> Result<(), String> {
    match std::fs::copy(input_path, output_path) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to save video: {}", e)),
    }
}
