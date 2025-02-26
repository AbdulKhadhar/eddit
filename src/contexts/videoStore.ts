import { create } from 'zustand';
import { VideoSegment, VideoMetadata, CompressionSettings, ProcessingResult } from '../types';
import { v4 as uuidv4 } from 'uuid';


interface VideoState {
  // Video data
  videoPath: string | null;
  metadata: VideoMetadata | null;
  outputDirectory: string | null;
  
  // Processing segments
  segments: VideoSegment[];
  
  // Compression settings
  compressionSettings: CompressionSettings;
  
  // Processing state
  isProcessing: boolean;
  processingResults: ProcessingResult[];
  
  // Actions
  setVideoPath: (path: string) => void;
  setMetadata: (metadata: VideoMetadata) => void;
  setOutputDirectory: (path: string) => void;
  addSegment: (segment: Omit<VideoSegment, 'id'>) => void;
  updateSegment: (id: string, segment: Partial<VideoSegment>) => void;
  removeSegment: (id: string) => void;
  updateCompressionSettings: (settings: Partial<CompressionSettings>) => void;
  setProcessingState: (isProcessing: boolean) => void;
  setProcessingResults: (results: ProcessingResult[]) => void;
  resetStore: () => void;
}

const initialCompressionSettings: CompressionSettings = {
  quality: 23, // Default CRF value (lower is better quality)
  preset: 'medium',
  codec: 'libx264'
};

export const useVideoStore = create<VideoState>((set) => ({
  // Initial state
  videoPath: null,
  metadata: null,
  outputDirectory: null,
  segments: [],
  compressionSettings: initialCompressionSettings,
  isProcessing: false,
  processingResults: [],
  
  // Actions
  setVideoPath: (path) => set({ videoPath: path }),
  
  setMetadata: (metadata) => set({ metadata }),
  
  setOutputDirectory: (path) => set({ outputDirectory: path }),
  
  addSegment: (segment) => set((state) => ({
    segments: [...state.segments, { id: uuidv4(), ...segment }]
  })),
  
  updateSegment: (id, updatedSegment) => set((state) => ({
    segments: state.segments.map((segment) => 
      segment.id === id ? { ...segment, ...updatedSegment } : segment
    )
  })),
  
  removeSegment: (id) => set((state) => ({
    segments: state.segments.filter((segment) => segment.id !== id)
  })),
  
  updateCompressionSettings: (settings) => set((state) => ({
    compressionSettings: { ...state.compressionSettings, ...settings }
  })),
  
  setProcessingState: (isProcessing) => set({ isProcessing }),
  
  setProcessingResults: (results) => set({ processingResults: results }),
  
  resetStore: () => set({
    videoPath: null,
    metadata: null,
    segments: [],
    isProcessing: false,
    processingResults: []
  })
}));