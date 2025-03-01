export interface VideoSegment {
  id: string;
  start_time: number;
  end_time: number;
  intro_path?: string;
  output_name: string; 
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  framerate: number;
  codec: string;
}

export interface CompressionSettings {
  quality: number; // 0-51 for x264/x265 (lower is better)
  preset: string; // e.g., "medium", "slow", "veryslow"
  codec: string; // e.g., "libx264", "libx265"
}

export type PresetOption = 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';

export type CodecOption = 'libx264' | 'libx265';

export interface ProcessingResult {
  success: boolean;
  output_path?: string;
  error_message?: string;
}

export interface SegmentProgress {
  index: number;      // Current segment index (starting from 0)
  total: number;      // Total number of segments
  status: string;     // Status of the process ("cutting", "adding_intro", etc.)
  progress: number;   // Progress percentage (0 to 100)
  estimated_time?: number; // Estimated time remaining (optional, in seconds)
}