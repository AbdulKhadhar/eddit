/**
 * @license
 * Copyright (c) 2025 Abdul Khadhar. All rights reserved.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use client"

import React, { useState } from "react"
import { useVideoStore } from "../contexts/videoStore"
import VideoPlayer from "../components/video/VideoPlayer"
import Timeline from "../components/video/Timeline"
import SegmentEditor from "../components/video/SegmentEditor"
import CompressionSettings from "../components/video/CompressionSettings"
import { loadVideo, selectFile, selectDirectory, cutVideo, checkDependencies } from "../services/tauriApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Folder, Download, RefreshCw, XCircle, AlertTriangle } from "lucide-react"
import { SegmentProgress } from "@/types"


const VideoEditPage: React.FC = () => {
    const {
        videoPath,
        segments,
        outputDirectory,
        isProcessing,
        processingResults,
        setVideoPath,
        setMetadata,
        setOutputDirectory,
        setProcessingState,
        setProcessingResults,
        resetStore,
    } = useVideoStore()

    const [currentTime, setCurrentTime] = useState(0)
    const [currentStep, setCurrentStep] = useState<"select" | "edit" | "process">("select")
    const [error, setError] = useState<string | null>(null)
    const [isDragging] = useState(false)
    const [progress, setProgress] = useState<SegmentProgress | null>(null)
    const [elapsedTime, setElapsedTime] = useState(0);
    const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);



    const handleSelectVideo = async () => {
        try {
            setError(null)
            const filePath = await selectFile(["Video Files"])

            if (!filePath) {
                setError("No file was selected.")
                return
            }

            setVideoPath(filePath)
            const videoMetadata = await loadVideo(filePath)

            if (!videoMetadata) {
                setError("Failed to load video metadata.")
                return
            }

            setMetadata(videoMetadata)
            setCurrentStep("edit")
        } catch (error) {
            setError(`${error}`)
        }
    }

    const handleSelectOutputDir = async () => {
        try {
            setError(null)
            const dirPath = await selectDirectory()

            if (!dirPath) {
                setError("No directory was selected.")
                return
            }

            setOutputDirectory(dirPath)
        } catch (error) {
            setError("Error selecting output directory.")
        }
    }

    const handleProcessVideos = async () => {
        if (!videoPath || !outputDirectory || segments.length === 0) {
            setError("Please select a video, an output directory, and create segments before processing.")
            return
        }

        setProcessingState(true)
        setError(null)
        setProgress(null) // Reset progress
        setElapsedTime(0);

        // Start Timer
        if (timer) clearInterval(timer); // Clear previous timer if exists
        const newTimer = setInterval(() => {
            setElapsedTime((prev) => prev + 1);
        }, 1000);
        setTimer(newTimer);

        try {
            const { ffmpeg } = await checkDependencies()

            if (!ffmpeg) {
                setError("⚠ FFmpeg is missing! Please install FFmpeg and add it to your system PATH.")
                setProcessingState(false)
                return
            }

            const results = await cutVideo(videoPath, segments, outputDirectory, (progressData) => {
                setProgress(progressData) // Update UI with progress
            })

            setProcessingResults(results)
            setCurrentStep("process")
        } catch (error) {
            setError(`Error processing videos: ${error}`)
        } finally {
            setProcessingState(false)
            clearInterval(newTimer);
        }
    }

    const handleStartOver = () => {
        resetStore()
        setCurrentStep("select")
        setError(null)
        setProgress(null)
    }

    const handleCancelUpload = () => {
        resetStore()
        setCurrentStep("select")
        setProgress(null)
        setElapsedTime(0); // Reset elapsed time
        if (timer) clearInterval(timer); // Stop timer if running
    }




    return (
        <div>
            {error && (
                <div className="mb-4 bg-red-900 text-red-100 p-3 rounded-md flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <p>{error}</p>
                </div>
            )}





            {currentStep === "select" && (
                <div
                    className="flex items-center justify-center w-full bg-gray-900"

                >
                    <div
                        className={`bg-gray-800 rounded-lg shadow-xl p-6 min-h-[400px] w-[90%] max-w-lg flex flex-col items-center justify-center border-2 ${isDragging ? "border-blue-500 border-dashed" : "border-gray-700"
                            } transition-all duration-200`}
                    >
                        <img src="app-icon.png" alt="Eddit Icon" className="w-16 h-16 mb-4" />

                        <h2 className="text-3xl font-bold text-gray-100 mb-4">Let's Start</h2>
                        <p className="text-gray-400 max-w-md text-center mb-6">
                            Click to select a video.
                        </p>

                        <button
                            onClick={() => handleSelectVideo()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-lg flex items-center space-x-2 transition-all duration-200 transform hover:scale-105"
                        >
                            <svg
                                className="w-6 h-6 mr-2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4v12m0 0l4-4m-4 4l-4-4m0 8h8"
                                />
                            </svg>
                            Select Video File
                        </button>
                    </div>
                </div>
            )}

            {currentStep === "edit" && (
                <div className="bg-gray-800 rounded-lg shadow-xl p-6 min-h-[600px]">
                    <div className="flex h-full space-x-4">
                        <div className="flex-1 bg-gray-900 p-4 rounded-lg">
                            {videoPath && (
                                <>
                                    <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                                        <VideoPlayer onTimeUpdate={setCurrentTime} />
                                    </div>

                                    <Timeline currentTime={currentTime} onSeek={setCurrentTime} />

                                    <ScrollArea className="h-50 bg-gray-800 p-3 rounded-lg">
                                        {segments.length > 0 ? (
                                            segments.map((segment) => (
                                                <SegmentEditor key={segment.id} segment={segment} />
                                            ))
                                        ) : (
                                            <p className="text-gray-500">No segments created yet.</p>
                                        )}
                                    </ScrollArea>

                                    {/* Cancel Button and Progress Bar in the same row */}
                                    <div className="flex items-center gap-4 mt-4">
                                        <Button
                                            onClick={handleCancelUpload}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
                                        >
                                            <XCircle className="w-5 h-5 mr-2" />
                                            Cancel Upload
                                        </Button>

                                        {progress && (
                                            <div className="flex flex-col bg-gray-800 p-2 rounded-md w-full">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-gray-300 text-sm">
                                                        Processing Segment {progress.index + 1} of {progress.total} ({progress.status})
                                                    </p>
                                                    <p className="text-gray-400 text-sm font-semibold">
                                                        ⏳ {elapsedTime}s
                                                    </p>
                                                </div>

                                                {/* Progress Bar (Full Width) */}
                                                <div className="w-full bg-gray-600 rounded-full h-2.5">
                                                    <div
                                                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${((progress.index + progress.progress / 100) / progress.total) * 100}%`
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>


                        <div className="w-1/3 bg-gray-800 p-4 rounded-lg flex flex-col space-y-6">
                            <h3 className="text-lg font-semibold text-gray-300 mb-2">Settings</h3>
                            <CompressionSettings />

                            <h3 className="text-lg font-semibold text-gray-300 mb-2">Output Directory</h3>
                            <div className="flex items-center">
                                <Input id="output-dir" value={outputDirectory || ""} readOnly className="flex-grow" placeholder="No directory selected" />
                                <Button onClick={handleSelectOutputDir} className="ml-2 px-3" variant="secondary">
                                    <Folder className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="mt-auto">
                                <Button
                                    onClick={handleProcessVideos}
                                    disabled={!outputDirectory || segments.length === 0 || isProcessing}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-lg flex items-center justify-center"
                                >
                                    {isProcessing ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-5 h-5 mr-2" />
                                            Process Videos
                                        </>
                                    )}
                                </Button>

                            </div>
                        </div>
                    </div>
                </div>
            )}


            {currentStep === "process" && (
                <div className="bg-gray-800 rounded-lg shadow-xl p-6 min-h-[600px]">
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-100 mb-6">Processing Results</h2>
                        <div className="space-y-6 mb-8">
                            {processingResults.map((result, index) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded-lg ${result.success ? "bg-green-900 border border-green-700" : "bg-red-900 border border-red-700"}`}
                                >
                                    <div className="flex items-start">
                                        {result.success ? (
                                            <div className="flex-shrink-0 bg-green-700 rounded-full p-2 mr-4">
                                                <svg className="w-6 h-6 text-green-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                </svg>
                                            </div>
                                        ) : (
                                            <div className="flex-shrink-0 bg-red-700 rounded-full p-2 mr-4">
                                                <svg className="w-6 h-6 text-red-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                            </div>
                                        )}

                                        <div>
                                            <h3 className="text-lg font-semibold mb-2">
                                                {result.success ? (
                                                    <span className="text-green-100">Segment {index + 1} Successfully Processed</span>
                                                ) : (
                                                    <span className="text-red-100">Segment {index + 1} Failed to Process</span>
                                                )}
                                            </h3>

                                            {result.output_path && (
                                                <div className="mt-2 flex items-center">
                                                    <Folder className="w-4 h-4 text-gray-400 mr-2" />
                                                    <p className="text-sm text-gray-300 font-mono truncate max-w-lg">{result.output_path}</p>
                                                </div>
                                            )}

                                            {!result.success && result.error_message && (
                                                <div className="mt-3 bg-red-800 p-3 rounded-md">
                                                    <p className="text-sm text-red-100 font-mono">{result.error_message}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center">
                            <Button
                                onClick={handleStartOver}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-lg flex items-center space-x-2"
                            >
                                <RefreshCw className="w-5 h-5 mr-2" />
                                Process Another Video
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>




    )
}

export default VideoEditPage
