"use client"

import React, { useState } from "react"
import { selectFile, selectDirectory, optimizeImage, ImageSettings, checkDependencies } from "../services/tauriApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Folder, Download, RefreshCw, XCircle, AlertTriangle, Image as ImageIcon, CheckCircle } from "lucide-react"

const ImageOptimizationPage: React.FC = () => {
    const [images, setImages] = useState<string[]>([])
    const [outputDirectory, setOutputDirectory] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState<{ current: number; total: number; status: string } | null>(null)
    const [results, setResults] = useState<{ path: string; success: boolean; error?: string }[]>([])
    const [currentStep, setCurrentStep] = useState<"select" | "edit" | "process">("select")

    const [settings, setSettings] = useState<ImageSettings>({
        quality: 80,
        lossless: false,
        width: null,
        height: null,
        crop_w: null,
        crop_h: null,
        crop_x: null,
        crop_y: null
    })

    const handleSelectImages = async () => {
        try {
            setError(null)
            const filePath = await selectFile(["Image Files"])

            if (!filePath) {
                setError("No image was selected.")
                return
            }

            // Append to array
            setImages(prev => Array.isArray(filePath) ? [...prev, ...filePath] : [...prev, filePath])
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

    const handleProcessImages = async () => {
        if (images.length === 0 || !outputDirectory) {
            setError("Please select images and an output directory.")
            return
        }

        setIsProcessing(true)
        setError(null)
        setProgress({ current: 0, total: images.length, status: "Starting..." })
        setResults([])
        
        try {
            const { ffmpeg } = await checkDependencies()
            if (!ffmpeg) {
                setError("⚠ FFmpeg is missing! Please install FFmpeg and add it to your system PATH.")
                setIsProcessing(false)
                return
            }

            const newResults: { path: string; success: boolean; error?: string }[] = []
            let count = 0

            // Process concurrently with the backend semaphore handling the load
            const promises = images.map(async (imagePath) => {
                try {
                    const outPath = await optimizeImage(imagePath, outputDirectory, settings)
                    count++
                    setProgress({ current: count, total: images.length, status: "Processing..." })
                    newResults.push({ path: outPath, success: true })
                } catch (e) {
                    count++
                    setProgress({ current: count, total: images.length, status: "Processing..." })
                    newResults.push({ path: imagePath, success: false, error: String(e) })
                }
            })

            await Promise.all(promises)
            setResults(newResults)
            setCurrentStep("process")
        } catch (error) {
            setError(`Error processing images: ${error}`)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleStartOver = () => {
        setImages([])
        setCurrentStep("select")
        setError(null)
        setProgress(null)
        setResults([])
    }

    const handleRemoveImage = (index: number) => {
        setImages(prev => {
            const newImages = [...prev]
            newImages.splice(index, 1)
            if (newImages.length === 0) setCurrentStep("select")
            return newImages
        })
    }

    const updateSetting = (key: keyof ImageSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }))
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
                <div className="flex items-center justify-center w-full bg-gray-900">
                    <div className="bg-gray-800 rounded-lg shadow-xl p-6 min-h-[400px] w-[90%] max-w-lg flex flex-col items-center justify-center border-2 border-gray-700 transition-all duration-200">
                        <ImageIcon className="w-16 h-16 mb-4 text-blue-400" />
                        <h2 className="text-3xl font-bold text-gray-100 mb-4">Optimize Images</h2>
                        <p className="text-gray-400 max-w-md text-center mb-6">
                            Select images to convert to WebP, resize, and compress.
                        </p>
                        <button
                            onClick={handleSelectImages}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-lg flex items-center space-x-2 transition-all duration-200 transform hover:scale-105"
                        >
                            <ImageIcon className="w-6 h-6 mr-2" />
                            Select Images
                        </button>
                    </div>
                </div>
            )}

            {currentStep === "edit" && (
                <div className="bg-gray-800 rounded-lg shadow-xl p-6 min-h-[600px]">
                    <div className="flex h-full space-x-4">
                        <div className="flex-1 bg-gray-900 p-4 rounded-lg flex flex-col">
                            <h3 className="text-lg font-semibold text-gray-300 mb-4">Selected Images ({images.length})</h3>
                            <ScrollArea className="flex-1 bg-gray-800 p-3 rounded-lg">
                                <div className="space-y-2">
                                    {images.map((img, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                                            <p className="text-sm text-gray-200 truncate pr-4">{img}</p>
                                            <button onClick={() => handleRemoveImage(idx)} className="text-red-400 hover:text-red-300">
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="mt-4 flex gap-4">
                                <Button onClick={handleSelectImages} className="bg-gray-700 hover:bg-gray-600">
                                    Add More Images
                                </Button>
                            </div>
                        </div>

                        <div className="w-1/3 bg-gray-800 p-4 rounded-lg flex flex-col space-y-6">
                            <h3 className="text-lg font-semibold text-gray-300 mb-2">Global Settings</h3>
                            
                            <div className="space-y-4 bg-gray-900 p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <label className="text-gray-300">Lossless WebP</label>
                                    <button
                                        onClick={() => updateSetting("lossless", !settings.lossless)}
                                        className={`w-12 h-6 flex items-center rounded-full p-1 transition ${settings.lossless ? "bg-green-500" : "bg-gray-500"}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${settings.lossless ? "translate-x-6" : "translate-x-0"}`}></div>
                                    </button>
                                </div>

                                {!settings.lossless && (
                                    <div>
                                        <label className="text-gray-300 text-sm block mb-1">Quality ({settings.quality}%)</label>
                                        <input
                                            type="range"
                                            min="1" max="100"
                                            value={settings.quality}
                                            onChange={(e) => updateSetting("quality", parseInt(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                <div className="border-t border-gray-700 pt-4">
                                    <h4 className="text-gray-400 text-sm font-semibold mb-2">Resize (Optional)</h4>
                                    <div className="flex space-x-2">
                                        <Input type="number" placeholder="Width" value={settings.width || ""} onChange={(e) => updateSetting("width", e.target.value ? parseInt(e.target.value) : null)} />
                                        <Input type="number" placeholder="Height" value={settings.height || ""} onChange={(e) => updateSetting("height", e.target.value ? parseInt(e.target.value) : null)} />
                                    </div>
                                </div>

                                <div className="border-t border-gray-700 pt-4">
                                    <h4 className="text-gray-400 text-sm font-semibold mb-2">Crop (Optional)</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input type="number" placeholder="Width" value={settings.crop_w || ""} onChange={(e) => updateSetting("crop_w", e.target.value ? parseInt(e.target.value) : null)} />
                                        <Input type="number" placeholder="Height" value={settings.crop_h || ""} onChange={(e) => updateSetting("crop_h", e.target.value ? parseInt(e.target.value) : null)} />
                                        <Input type="number" placeholder="X Offset" value={settings.crop_x || ""} onChange={(e) => updateSetting("crop_x", e.target.value ? parseInt(e.target.value) : null)} />
                                        <Input type="number" placeholder="Y Offset" value={settings.crop_y || ""} onChange={(e) => updateSetting("crop_y", e.target.value ? parseInt(e.target.value) : null)} />
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-300 mb-2 mt-4">Output Directory</h3>
                            <div className="flex items-center">
                                <Input id="output-dir" value={outputDirectory || ""} readOnly className="flex-grow" placeholder="No directory selected" />
                                <Button onClick={handleSelectOutputDir} className="ml-2 px-3" variant="secondary">
                                    <Folder className="w-4 h-4" />
                                </Button>
                            </div>

                            {progress && (
                                <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                                    <div
                                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    ></div>
                                </div>
                            )}

                            <div className="mt-auto">
                                <Button
                                    onClick={handleProcessImages}
                                    disabled={!outputDirectory || images.length === 0 || isProcessing}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-lg flex items-center justify-center"
                                >
                                    {isProcessing ? (
                                        <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                                    ) : (
                                        <><Download className="w-5 h-5 mr-2" /> Optimize Images</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === "process" && (
                <div className="bg-gray-800 rounded-lg shadow-xl p-6 min-h-[600px]">
                    <h2 className="text-2xl font-bold text-gray-100 mb-6">Optimization Results</h2>
                    <ScrollArea className="h-96 space-y-4 mb-8">
                        {results.map((result, idx) => (
                            <div key={idx} className={`p-4 rounded-lg mb-4 ${result.success ? "bg-green-900 border border-green-700" : "bg-red-900 border border-red-700"}`}>
                                <div className="flex items-center">
                                    {result.success ? <CheckCircle className="w-6 h-6 text-green-400 mr-4" /> : <AlertTriangle className="w-6 h-6 text-red-400 mr-4" />}
                                    <div>
                                        <p className="text-sm font-semibold text-gray-100">{result.success ? "Optimized" : "Failed"}</p>
                                        <p className="text-xs text-gray-400 font-mono break-all">{result.path}</p>
                                        {result.error && <p className="text-xs text-red-300 mt-1">{result.error}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </ScrollArea>
                    <div className="flex justify-center">
                        <Button onClick={handleStartOver} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-lg">
                            <RefreshCw className="w-5 h-5 mr-2" /> Process More Images
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ImageOptimizationPage
