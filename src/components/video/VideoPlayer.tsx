"use client"

import React, { useRef, useState, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useVideoStore } from "../../contexts/videoStore"
import { convertFileSrc } from "@tauri-apps/api/core"

interface VideoPlayerProps {
    onTimeUpdate?: (currentTime: number) => void
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ onTimeUpdate }) => {
    const { videoPath, metadata } = useVideoStore()
    const videoRef = useRef<HTMLVideoElement>(null)

    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)

    // Convert file path for Tauri and load video
    useEffect(() => {
        if (videoPath && videoRef.current) {
            const convertedSrc = convertFileSrc(videoPath)
            console.log("Converted Video Path:", convertedSrc)
            videoRef.current.src = convertedSrc
            videoRef.current.load()
        }
    }, [videoPath])

    // Update current time when video plays
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime
            setCurrentTime(time)
            onTimeUpdate?.(time)
        }
    }

    // Toggle Play/Pause
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause()
            } else {
                videoRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    // Seek video position
    const seekTo = (time: number) => {
        if (videoRef.current && metadata) {
            const clampedTime = Math.min(Math.max(time, 0), metadata.duration)
            videoRef.current.currentTime = clampedTime
            setCurrentTime(clampedTime)
        }
    }

    // Toggle Mute
    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted
            setIsMuted(!isMuted)
        }
    }

    // Format time for UI display
    const formatTime = (timeInSeconds: number): string => {
        const minutes = Math.floor(timeInSeconds / 60)
        const seconds = Math.floor(timeInSeconds % 60)
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }

    return (
        <div className="video-player w-full bg-gray-900 rounded-lg overflow-hidden">
            {/* Video Element (No Default Controls) */}
            
            <video
            src={videoPath!}
                ref={videoRef}
                className="w-full max-h-[500px] object-contain"
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
            />


            {/* Custom Controls */}
            <div className="controls bg-gray-800 p-4 flex flex-col space-y-3">
                {/* Play/Pause & Seek Slider in Same Row */}
                <div className="flex items-center space-x-4">
                    {/* Play/Pause Button */}
                    <Button size="icon" variant="ghost" onClick={togglePlay} className="text-white hover:text-blue-400">
                        {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </Button>

                    {/* Seek Slider */}
                    <Slider
                        value={[currentTime]}
                        max={metadata?.duration || 100}
                        step={0.1}
                        onValueChange={(value) => seekTo(value[0])}
                        className="flex-1"
                    />

                    {/* Time Display */}
                    <span className="text-white text-sm w-16 text-right">
                        {formatTime(currentTime)}/{metadata ? formatTime(metadata.duration) : "00:00"}
                    </span>
                </div>

                {/* Volume Controls */}
                <div className="flex items-center space-x-2">
                    <Button size="icon" variant="ghost" onClick={toggleMute} className="text-white hover:text-blue-400">
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>

                    <Slider
                        value={[volume * 100]}
                        max={100}
                        step={1}
                        onValueChange={(value) => {
                            const newVolume = value[0] / 100
                            setVolume(newVolume)
                            if (videoRef.current) {
                                videoRef.current.volume = newVolume
                            }
                        }}
                        className="w-24"
                    />
                </div>
                
            </div>
            
        </div>
    )
}

export default VideoPlayer
