"use client"

import type React from "react"
import { useState } from "react"
import { useVideoStore } from "../contexts/videoStore"
import VideoPlayer from "../components/video/VideoPlayer"
import Timeline from "../components/video/Timeline"
import SegmentEditor from "../components/video/SegmentEditor"
import CompressionSettings from "../components/video/CompressionSettings"
import { loadVideo, selectFile, selectDirectory, cutVideo } from "../services/tauriApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Folder, Upload, Download, RefreshCw, XCircle } from "lucide-react"

const MainPage: React.FC = () => {
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

    // Handle file selection
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
            setError("Error selecting video.")
        }
    }

    // Handle output directory selection
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

    // Process videos
    const handleProcessVideos = async () => {
        if (!videoPath || !outputDirectory || segments.length === 0) {
            setError("Please select a video, an output directory, and create segments before processing.")
            return
        }

        setProcessingState(true)
        setError(null)

        try {
            const results = await cutVideo(videoPath, segments, outputDirectory)
            setProcessingResults(results)
            setCurrentStep("process")
        } catch (error) {
            setError("Error processing videos.")
        } finally {
            setProcessingState(false)
        }
    }

    // Reset and start over
    const handleStartOver = () => {
        resetStore()
        setCurrentStep("select")
        setError(null)
    }

    // Handle Cancel Upload
    const handleCancelUpload = () => {
        resetStore()
        setCurrentStep("select")
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 py-8">
            <div className="container mx-auto px-4 max-w-7xl">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-blue-400 mb-2">eddit</h1>
                    <p className="text-gray-400 text-lg">For your easy edits</p>
                </header>

                {error && (
                    <div className="mb-4 bg-red-900 text-red-100 p-3 rounded-md">
                        <p>{error}</p>
                    </div>
                )}

                <div className="bg-gray-800 rounded-lg shadow-xl p-6 min-h-[600px]">
                    {currentStep === "select" && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <h2 className="text-3xl font-bold text-gray-100 mb-4">Let's Start</h2>
                            <p className="text-gray-400 max-w-md mx-auto mb-6">
                                Import your video &gt; Cut it, clip it, make it slick
                            </p>
                            <Button
                                onClick={handleSelectVideo}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-lg flex items-center space-x-2 transition-all duration-200 transform hover:scale-105"
                            >
                                <Upload className="w-6 h-6 mr-2" />
                                Select Video File
                            </Button>
                        </div>
                    )}

                    {currentStep === "edit" && (
                        <div className="flex h-full space-x-4">
                            {/* Left: Video Player & Timeline */}
                            <div className="flex-1 bg-gray-900 p-4 rounded-lg">
                                {videoPath && (
                                    <>
                                        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                                            <VideoPlayer onTimeUpdate={setCurrentTime} />
                                        </div>
                                        <Timeline currentTime={currentTime} onSeek={setCurrentTime} />

                                        {/* Segment List */}
                                        <div className="mt-6">
                                            <div className="flex justify-between">
                                                <h3 className="text-lg font-semibold text-gray-300 mb-2">Segments</h3>
                                                {segments.length > 0 ? (
                                                    <h3>Segments Selected: {segments.length}</h3>
                                                ) : (
                                                    <p></p>
                                                )}
                                            </div>

                                            <ScrollArea className="h-40 bg-gray-800 p-3 rounded-lg">
                                                {segments.length > 0 ? (
                                                    segments.map((segment) => <SegmentEditor key={segment.id} segment={segment} />)
                                                ) : (
                                                    <p className="text-gray-500">No segments created yet.</p>
                                                )}
                                            </ScrollArea>
                                        </div>


                                        {/* Cancel Button */}
                                        <div className="mt-4">
                                            <Button
                                                onClick={handleCancelUpload}
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
                                            >
                                                <XCircle className="w-5 h-5 mr-2" />
                                                Cancel Upload
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Right: Settings & Output Folder */}
                            <div className="w-1/3 bg-gray-800 p-4 rounded-lg flex flex-col space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-300 mb-2">Settings</h3>
                                    <CompressionSettings />
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-300 mb-2">Output Directory</h3>
                                    <div className="flex items-center">
                                        <Input
                                            id="output-dir"
                                            value={outputDirectory || ""}
                                            readOnly
                                            className="flex-grow"
                                            placeholder="No directory selected"
                                        />
                                        <Button onClick={handleSelectOutputDir} className="ml-2 px-3" variant="secondary">
                                            <Folder className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Process Button */}
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
                    )}

                    {currentStep === "process" && (
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-100 mb-6">Processing Results</h2>
                            <div className="space-y-6 mb-8">
                                {processingResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg ${result.success ? "bg-green-900 border border-green-700" : "bg-red-900 border border-red-700"
                                            }`}
                                    >
                                        <div className="flex items-start">
                                            {result.success ? (
                                                <div className="flex-shrink-0 bg-green-700 rounded-full p-2 mr-4">
                                                    <svg
                                                        className="w-6 h-6 text-green-100"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                </div>
                                            ) : (
                                                <div className="flex-shrink-0 bg-red-700 rounded-full p-2 mr-4">
                                                    <svg
                                                        className="w-6 h-6 text-red-100"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            d="M6 18L18 6M6 6l12 12"
                                                        ></path>
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
                    )}
                </div>
                <footer className="bg-gray-900 text-gray-400 text-sm py-6 mt-10">
                    <div className="container mx-auto text-center">
                        <p className="mb-2">
                            Made with ❤️ for the open-source community.
                        </p>
                        <p className="mb-2">
                            Released under the <a href="https://opensource.org/licenses/MIT" className="text-blue-400 hover:underline">MIT License</a>.
                        </p>
                        <p>
                            Contribute on <a href="https://github.com/AbdulKhadhar/eddit" className="text-blue-400 hover:underline">GitHub</a> |
                            &copy; {new Date().getFullYear()} Your Project Name
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    )
}

export default MainPage
