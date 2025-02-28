#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod video;
mod utils;
use std::collections::HashMap;
use tauri::command;
use commands::video::{
    load_video, cut_video, add_intro, compress_video, save_video, get_video_metadata,
};
use commands::file::{select_file, select_directory};
use utils::{get_ffmpeg_path, get_ffprobe_path};

use axum::{
    extract::Path,
    http::{header, StatusCode},
    response::Response,
    routing::get,
    Router,
};
use std::{net::SocketAddr, path::PathBuf};
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use tokio::net::TcpListener;

// In main.rs
use std::sync::atomic::{AtomicBool, Ordering};

// Global flag to track if server is running
static SERVER_RUNNING: AtomicBool = AtomicBool::new(false);

#[tauri::command]
async fn start_video_server(port: u16) -> Result<String, String> {
    // Check if server is already running
    if SERVER_RUNNING.load(Ordering::SeqCst) {
        return Ok(format!("http://127.0.0.1:{}", port));
    }
    
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    
    // Try to bind to the port
    let listener = match TcpListener::bind(&addr).await {
        Ok(listener) => listener,
        Err(e) => {
            if e.kind() == std::io::ErrorKind::AddrInUse {
                // If the error is "address in use", assume our server is already running
                SERVER_RUNNING.store(true, Ordering::SeqCst);
                return Ok(format!("http://127.0.0.1:{}", port));
            }
            return Err(format!("Failed to bind to port {}: {}", port, e));
        }
    };
    
    // Create a new Axum router
    let app = Router::new()
        .route("/video/{path}", get(serve_video));
    
    // Spawn the server on a background task
    tauri::async_runtime::spawn(async move {
        SERVER_RUNNING.store(true, Ordering::SeqCst);
        axum::serve(listener, app).await.unwrap();
    });
    
    Ok(format!("http://127.0.0.1:{}", port))
}


async fn serve_video(Path(path): Path<String>) -> Result<Response<axum::body::Body>, StatusCode> {
    // Decode the path
    let path = urlencoding::decode(&path).map_err(|_| StatusCode::BAD_REQUEST)?;
    let path = PathBuf::from(path.into_owned());
   
    // Check if file exists
    if !path.exists() {
        return Err(StatusCode::NOT_FOUND);
    }
   
    // Read the file as bytes, not as a string
    let content = tokio::fs::read(&path).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
   
    // Determine MIME type based on extension
    let mime_type = match path.extension().and_then(|ext| ext.to_str()) {
        Some("mp4") => "video/mp4",
        Some("mkv") => "video/x-matroska",
        Some("webm") => "video/webm",
        _ => "application/octet-stream",
    };
   
    // Build response with binary body
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime_type)
        .body(axum::body::Body::from(content))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
   
    Ok(response)
}

#[command]
fn check_dependencies() -> Result<HashMap<String, String>, String> {
    let mut dependencies = HashMap::new();

    // Get FFmpeg and FFprobe paths using utility functions
    let ffmpeg_path = get_ffmpeg_path();
    let ffprobe_path = get_ffprobe_path();

    // Check if the files exist and are executable
    let ffmpeg_exists = ffmpeg_path.exists()
        && std::process::Command::new(&ffmpeg_path).arg("-version").output().is_ok();
    let ffprobe_exists = ffprobe_path.exists()
        && std::process::Command::new(&ffprobe_path).arg("-version").output().is_ok();

    // Store results in HashMap
    dependencies.insert(
        "ffmpeg".to_string(),
        format!(
            "{} (Exists: {})",
            ffmpeg_path.to_string_lossy().replace("/", "\\"),
            ffmpeg_exists
        ),
    );

    dependencies.insert(
        "ffprobe".to_string(),
        format!(
            "{} (Exists: {})",
            ffprobe_path.to_string_lossy().replace("/", "\\"),
            ffprobe_exists
        ),
    );

    Ok(dependencies)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            load_video,
            cut_video,
            add_intro,
            compress_video,
            save_video,
            get_video_metadata,
            select_file,
            select_directory,
            check_dependencies,
            start_video_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
