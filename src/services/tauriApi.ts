import { invoke } from '@tauri-apps/api/core';
import { VideoSegment, VideoMetadata, CompressionSettings, ProcessingResult, SegmentProgress } from '../types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';

export async function loadVideo(path: string): Promise<VideoMetadata> {
  try {
    return await invoke<VideoMetadata>('load_video', { path });
  } catch (error) {
    console.error("Error loading video:", error);
    throw error;
  }
}

export async function getVideoMetadata(path: string): Promise<VideoMetadata> {
  try {
    return await invoke<VideoMetadata>('get_video_metadata', { path });
  } catch (error) {
    console.error("Error getting video metadata:", error);
    throw error;
  }
}

export async function cutVideo(
  inputPath: string,
  segments: VideoSegment[],
  outputDir: string,
  onProgress: (progress: SegmentProgress) => void
): Promise<ProcessingResult[]> {
  try {
    // Listen for progress updates from Rust
    const unlisten = await listen("segment_progress", (event) => {
      const progressData = event.payload as SegmentProgress
      onProgress(progressData) // Call the progress callback
    })

    const result = await invoke<ProcessingResult[]>("cut_video_with_progress", {
      inputPath,
      segments,
      outputDir
    })

    unlisten() // Stop listening when processing is complete
    return result
  } catch (error) {
    console.error("Error cutting video:", error)
    throw error
  }
}

export async function addIntro(
  introPath: string,
  videoPath: string,
  outputDir: string
): Promise<string> {
  try {
    return await invoke<string>('add_intro', {
      introPath,
      videoPath,
      outputDir
    });
  } catch (error) {
    console.error("Error adding intro:", error);
    throw error;
  }
}

export async function compressVideo(
  inputPath: string,
  outputDir: string,
  settings: CompressionSettings
): Promise<string> {
  try {
    return await invoke<string>('compress_video', {
      inputPath,
      outputDir,
      settings
    });
  } catch (error) {
    console.error("Error compressing video:", error);
    throw error;
  }
}

export async function saveVideo(
  inputPath: string,
  outputPath: string
): Promise<void> {
  try {
    return await invoke<void>('save_video', {
      inputPath,
      outputPath
    });
  } catch (error) {
    console.error("Error saving video:", error);
    throw error;
  }
}

export async function selectFile(filters?: string[]): Promise<string | null> {
  try {
    const result = await invoke<string | null>('select_file', { filters });
    return result || null;
  } catch (error) {
    console.error("Error selecting file:", error);
    throw error;
  }
}

export async function selectDirectory(): Promise<string | null> {
  try {
    const result = await invoke<string | null>('select_directory', {});
    return result || null;
  } catch (error) {
    console.error("Error selecting directory:", error);
    throw error;
  }
}

// New utility function to check if FFmpeg is available
export const checkDependencies = async (): Promise<Record<string, string>> => {
  try {
    return await invoke('check_dependencies')
  } catch (error) {
    console.error('Error checking dependencies:', error)
    return { error: String(error) }
  }
}

export interface ImageSettings {
  quality: number
  lossless: boolean
  width: number | null
  height: number | null
  crop_w: number | null
  crop_h: number | null
  crop_x: number | null
  crop_y: number | null
}

export const optimizeImage = async (
  inputPath: string,
  outputDir: string,
  settings: ImageSettings
): Promise<string> => {
  return await invoke('optimize_image', {
    inputPath,
    outputDir,
    settings,
  })
}

export const addIntroWithProgress = async (
  introPath: string,
  videoPath: string,
  outputDir: string,
  compressionSettings?: {
    quality: number;
    preset: string;
    codec: string;
  }
) => {
  const appWindow = getCurrentWindow();
  return invoke('add_intro_with_progress', {
    introPath,
    videoPath,
    outputDir,
    settings: compressionSettings,
    window: appWindow
  });
};


export async function processVideo(
  inputPath: string,
  segments: VideoSegment[],
  outputDir: string,
  compressionSettings: CompressionSettings,
  onProgress: (progress: SegmentProgress) => void
): Promise<ProcessingResult[]> {
  try {
    // Listen for progress updates from Rust
    const unlisten = await listen("segment_progress", (event) => {
      const progressData = event.payload as SegmentProgress
      onProgress(progressData) // Call the progress callback
    })

    // Invoke the new Rust function with compression settings
    const result = await invoke<ProcessingResult[]>("process_video_with_progress", {
      inputPath,
      segments,
      outputDir,
      compressionSettings, // Passing compression settings
    })

    unlisten() // Stop listening when processing is complete
    return result
  } catch (error) {
    console.error("Error processing video:", error)
    throw error
  }
}
