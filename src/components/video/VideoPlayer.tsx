"use client";

import React, { useRef, useState, useEffect } from "react";
import {
    Play, Pause, Volume2, VolumeX,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useVideoStore } from "../../contexts/videoStore";

interface VideoPlayerProps {
    onTimeUpdate?: (currentTime: number) => void;
}

const ProgressSlider = ({ value, max, onChange }: { value: number, max: number, onChange: (value: number) => void }) => {
    return (
        <input
            type="range"
            min="0"
            max={max}
            step="0.1"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
    );
};

const VolumeSlider = ({ value, onChange }: { value: number, onChange: (value: number) => void }) => {
    return (
        <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
    );
};

const IconButton = ({ onClick, children, className = "" }: { onClick: () => void, children: React.ReactNode, className?: string }) => (
    <button
        onClick={onClick}
        className={`p-2 text-white rounded-full hover:bg-gray-700 transition-colors ${className}`}
    >
        {children}
    </button>
);

const VideoPlayer: React.FC<VideoPlayerProps> = ({ onTimeUpdate }) => {
    const { videoPath } = useVideoStore();
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    async function getVideoStreamUrl(videoPath: string): Promise<string | null> {
        if (!videoPath) {
            setError("Error: No video path provided.");
            return null;
        }

        try {
            const serverUrl = await invoke<string>("start_video_server", { port: 3001 });
            if (!serverUrl) {
                setError("Error: Video server did not return a valid URL.");
                return null;
            }

            const encodedPath = encodeURIComponent(videoPath);
            const fullUrl = `${serverUrl}/video/${encodedPath}`;
            console.log(videoUrl);
            setVideoUrl(fullUrl);
            return fullUrl;
        } catch (err) {
            setError(`Error: Failed to start video server. ${err}`);
            return null;
        }
    }

    useEffect(() => {
        if (!videoPath) {
            setError("Error: No video path found in store.");
            return;
        }

        getVideoStreamUrl(videoPath).then((url) => {
            if (url && videoRef.current) {
                videoRef.current.src = url;
                videoRef.current.load();
            } else {
                setError("Error: Could not generate video URL.");
            }
        });
    }, [videoPath]);

    const handleVideoLoaded = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (onTimeUpdate) onTimeUpdate(videoRef.current.currentTime);
        }
    };

    const togglePlay = () => {
        if (!videoRef.current) return;

        if (videoRef.current.paused) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setError("Failed to play video."));
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleProgressChange = (value: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = value;
            setCurrentTime(value);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    const handleVolumeChange = (value: number) => {
        if (videoRef.current) {
            videoRef.current.volume = value;
            setVolume(value);
            setIsMuted(value === 0);
        }
    };

    const handleSpeedChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newSpeed = parseFloat(event.target.value);
        setPlaybackSpeed(newSpeed);
        if (videoRef.current) {
            videoRef.current.playbackRate = newSpeed;
        }
    };

    return (
        <div
            className="relative w-full bg-gray-900 rounded-lg overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {error && <div className="bg-red-500 text-white p-2 text-sm">{error}</div>}

            <video
                ref={videoRef}
                className="w-full max-h-[500px] object-contain bg-black"
                playsInline
                onLoadedData={handleVideoLoaded}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
            />

            {/* Controls Container (Appears on Hover) */}
            <div
                className={`absolute inset-x-0 bottom-0 bg-gray-800 bg-opacity-90 p-3 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"} duration-300`}
            >
                <div className="flex items-center mb-2">
                    <span className="text-white text-xs mr-2">{Math.floor(currentTime / 60)}:{("0" + Math.floor(currentTime % 60)).slice(-2)}</span>
                    <ProgressSlider value={currentTime} max={duration || 100} onChange={handleProgressChange} />
                    <span className="text-white text-xs ml-2">{Math.floor(duration / 60)}:{("0" + Math.floor(duration % 60)).slice(-2)}</span>
                </div>

                <div className="flex justify-between items-center">
    <div className="flex space-x-2 items-center">
        <IconButton onClick={togglePlay}>
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </IconButton>
        
        <div className="flex items-center space-x-2">
            <IconButton onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </IconButton>
            <VolumeSlider value={isMuted ? 0 : volume} onChange={handleVolumeChange} />
        </div>
    </div>

    <div className="flex items-center">
        <label className="text-white text-sm">Speed:</label>
        <select 
            value={playbackSpeed} 
            onChange={handleSpeedChange} 
            className="ml-2 p-1 rounded bg-gray-700 text-white"
        >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
            <option value="16">16x</option>
        </select>
    </div>
</div>

            </div>
        </div>
    );
};

export default VideoPlayer;
