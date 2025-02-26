use tauri::command;
use tauri::{Runtime, Manager};
use tauri_plugin_dialog::{Dialog, FileDialogBuilder, FilePath, DialogExt};
use tokio::sync::oneshot;

#[command]
pub async fn select_file<R: Runtime>(window: tauri::Window<R>, filters: Option<Vec<String>>) -> Result<Option<String>, String> {
    let (tx, rx) = oneshot::channel();

    let dialog = window.dialog().clone(); // Clone the Dialog

    let mut builder = FileDialogBuilder::new(dialog);

    if let Some(filter_list) = filters {
        for filter in filter_list {
            builder = builder.add_filter("Video Files", &["mp4", "mov", "avi", "mkv"]);
        }
    } else {
        builder = builder.add_filter("Video Files", &["mp4", "mov", "avi", "mkv"]);
    }

    builder.pick_file(move |path: Option<FilePath>| {
        let _ = tx.send(path.and_then(|p| p.as_path().map(|p| p.to_string_lossy().to_string())));
    });

    match rx.await {
        Ok(selected_file) => Ok(selected_file),
        Err(_) => Err("Failed to receive file selection".into()),
    }
}

#[command]
pub async fn select_directory<R: Runtime>(window: tauri::Window<R>) -> Result<Option<String>, String> {
    let (tx, rx) = oneshot::channel();

    let dialog = window.dialog().clone(); // Clone the Dialog

    FileDialogBuilder::new(dialog).pick_folder(move |path: Option<FilePath>| {
        let _ = tx.send(path.and_then(|p| p.as_path().map(|p| p.to_string_lossy().to_string())));
    });

    match rx.await {
        Ok(selected_folder) => Ok(selected_folder),
        Err(_) => Err("Failed to receive directory selection".into()),
    }
}