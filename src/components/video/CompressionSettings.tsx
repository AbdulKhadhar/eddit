import type React from "react"
import { useVideoStore } from "../../contexts/videoStore"
import type { PresetOption, CodecOption } from "../../types"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const CompressionSettings: React.FC = () => {
  const { compressionSettings, updateCompressionSettings } = useVideoStore()

  const presetOptions: PresetOption[] = [
    "ultrafast",
    "superfast",
    "veryfast",
    "faster",
    "fast",
    "medium",
    "slow",
    "slower",
    "veryslow",
  ]

  const codecOptions: CodecOption[] = ["libx264", "libx265"]

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-4 text-white">Compression Settings</h3>

      <div className="space-y-6">
        <div>
          <Label htmlFor="quality-slider" className="text-gray-300">
            Quality (CRF)
          </Label>
          <div className="flex items-center mt-2">
            <Slider
              id="quality-slider"
              min={0}
              max={51}
              value={[compressionSettings.quality]}
              onValueChange={(value) => updateCompressionSettings({ quality: value[0] })}
              className="flex-grow mr-4"
            />
            <span className="text-sm font-medium text-white w-8 text-center">{compressionSettings.quality}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Better Quality (0)</span>
            <span>Smaller Size (51)</span>
          </div>
        </div>

        <div>
          <Label htmlFor="preset-select" className="text-gray-300">
            Preset
          </Label>
          <Select
            value={compressionSettings.preset}
            onValueChange={(value) => updateCompressionSettings({ preset: value as PresetOption })}
          >
            <SelectTrigger id="preset-select" className="w-full mt-2">
              <SelectValue placeholder="Select a preset" />
            </SelectTrigger>
            <SelectContent>
              {presetOptions.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400 mt-1">
            Faster presets result in larger files, slower presets take more time but create smaller files
          </p>
        </div>

        <div>
          <Label htmlFor="codec-select" className="text-gray-300">
            Codec
          </Label>
          <Select
            value={compressionSettings.codec}
            onValueChange={(value) => updateCompressionSettings({ codec: value as CodecOption })}
          >
            <SelectTrigger id="codec-select" className="w-full mt-2">
              <SelectValue placeholder="Select a codec" />
            </SelectTrigger>
            <SelectContent>
              {codecOptions.map((codec) => (
                <SelectItem key={codec} value={codec}>
                  {codec === "libx264" ? "H.264 (more compatible)" : "H.265 (better compression)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 bg-gray-700 p-3 rounded text-sm">
        <h4 className="font-medium mb-1 text-white">Current Settings Summary:</h4>
        <ul className="list-disc pl-5 space-y-1 text-gray-300">
          <li>Quality: {compressionSettings.quality} (CRF - lower is better quality)</li>
          <li>Encoding Speed: {compressionSettings.preset}</li>
          <li>Codec: {compressionSettings.codec === "libx264" ? "H.264" : "H.265 (HEVC)"}</li>
        </ul>
      </div>
    </div>
  )
}

export default CompressionSettings

