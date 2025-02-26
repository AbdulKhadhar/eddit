use serde::{Deserialize, Serialize};
use tauri::command;
use crate::video::{cutter, encoder, merger};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoSegment {
    start_time: f64,  // in seconds
    end_time: f64,    // in seconds
    intro_path: Option<String>,
    output_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration: f64,    // in seconds
    pub width: u32,
    pub height: u32,
    pub framerate: f64,
    pub codec: String,
}


#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionSettings {
    quality: u32,     // 0-51 for x264/x265 (lower is better)
    preset: String,   // e.g., "medium", "slow", "veryslow"
    codec: String,    // e.g., "libx264", "libx265"
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
        Err(e) => Err(format!("Failed to load video: {}", e))
    }
}

#[command]
pub async fn get_video_metadata(path: String) -> Result<VideoMetadata, String> {
    match cutter::get_metadata(&path) {
        Ok(metadata) => Ok(metadata),
        Err(e) => Err(format!("Failed to get video metadata: {}", e))
    }
}

#[command]
pub async fn cut_video(input_path: String, segments: Vec<VideoSegment>, output_dir: String) -> Vec<ProcessingResult> {
    let mut results = Vec::new();
    
    for segment in segments {
        let result = match cutter::cut_segment(&input_path, segment.start_time, segment.end_time, &output_dir, &segment.output_name) {
            Ok(output_path) => {
                let mut final_path = output_path;
                
                // Add intro if provided
                if let Some(intro_path) = segment.intro_path {
                    match merger::add_intro(&intro_path, &final_path, &output_dir) {
                        Ok(merged_path) => {
                            final_path = merged_path;
                        },
                        Err(e) => {
                            results.push(ProcessingResult {
                                success: false,
                                output_path: Some(final_path),
                                error_message: Some(format!("Failed to add intro: {}", e))
                            });
                            continue;
                        }
                    }
                }
                
                ProcessingResult {
                    success: true,
                    output_path: Some(final_path),
                    error_message: None
                }
            },
            Err(e) => ProcessingResult {
                success: false,
                output_path: None,
                error_message: Some(format!("Failed to cut segment: {}", e))
            }
        };
        
        results.push(result);
    }
    
    results
}

#[command]
pub async fn add_intro(intro_path: String, video_path: String, output_dir: String) -> Result<String, String> {
    match merger::add_intro(&intro_path, &video_path, &output_dir) {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(format!("Failed to add intro: {}", e))
    }
}

#[command]
pub async fn compress_video(input_path: String, output_dir: String, settings: CompressionSettings) -> Result<String, String> {
    match encoder::compress_video(&input_path, &output_dir, settings) {
        Ok(output_path) => Ok(output_path),
        Err(e) => Err(format!("Failed to compress video: {}", e))
    }
}

#[command]
pub async fn save_video(input_path: String, output_path: String) -> Result<(), String> {
    match std::fs::copy(input_path, output_path) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to save video: {}", e))
    }
}