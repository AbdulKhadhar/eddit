#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod video;
mod utils;

use commands::video::{
    load_video, cut_video, add_intro, compress_video, save_video, get_video_metadata
};
use commands::file::{select_file, select_directory};

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
            select_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}