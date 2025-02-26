"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { useVideoStore } from "../../contexts/videoStore"

interface TimelineProps {
  currentTime: number
  onSeek: (time: number) => void
}

const Timeline: React.FC<TimelineProps> = ({ currentTime, onSeek }) => {
  const { metadata, segments, addSegment } = useVideoStore()
  const timelineRef = useRef<HTMLDivElement>(null)
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !metadata) return

    const rect = timelineRef.current.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    const clickTime = clickPosition * metadata.duration

    onSeek(clickTime)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !metadata) return

    const rect = timelineRef.current.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    const clickTime = clickPosition * metadata.duration

    setSelectionStart(clickTime)
    setSelectionEnd(clickTime)
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !timelineRef.current || !metadata) return

    const rect = timelineRef.current.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    const clickTime = Math.max(0, Math.min(clickPosition * metadata.duration, metadata.duration))

    setSelectionEnd(clickTime)
  }

  const handleMouseUp = useCallback(() => {
    if (isDragging && selectionStart !== null && selectionEnd !== null) {
      const start = Math.min(selectionStart, selectionEnd)
      const end = Math.max(selectionStart, selectionEnd)

      if (end - start >= 0.5) {
        addSegment({
          start_time: start,
          end_time: end,
          output_name: `Segment_${segments.length + 1}`,
        })
      }

      setIsDragging(false)
      setSelectionStart(null)
      setSelectionEnd(null)
    }
  }, [isDragging, selectionStart, selectionEnd, addSegment, segments])

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp()
      }
    }

    document.addEventListener("mouseup", handleGlobalMouseUp)
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp)
    }
  }, [isDragging, handleMouseUp])

  if (!metadata) return null

  const currentTimePercent = (currentTime / metadata.duration) * 100

  let selectionStyle = {}
  if (selectionStart !== null && selectionEnd !== null) {
    const startPercent = (Math.min(selectionStart, selectionEnd) / metadata.duration) * 100
    const endPercent = (Math.max(selectionStart, selectionEnd) / metadata.duration) * 100
    selectionStyle = {
      left: `${startPercent}%`,
      width: `${endPercent - startPercent}%`,
    }
  }

  return (
    <div className="timeline-container my-4">
      <div
        ref={timelineRef}
        className="timeline relative h-12 bg-gray-700 rounded cursor-pointer"
        onClick={handleTimelineClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="absolute bottom-0 h-2 border-l border-gray-500" style={{ left: `${(i + 1) * 10}%` }}>
            <span className="absolute text-xs text-gray-400" style={{ bottom: "10px", transform: "translateX(-50%)" }}>
              {formatTime(((i + 1) * metadata.duration) / 10)}
            </span>
          </div>
        ))}

        {segments.map((segment) => (
          <div
            key={segment.id}
            className="absolute h-full bg-blue-500 opacity-70"
            style={{
              left: `${(segment.start_time / metadata.duration) * 100}%`,
              width: `${((segment.end_time - segment.start_time) / metadata.duration) * 100}%`,
            }}
          >
            <span
              className="absolute text-xs text-white truncate px-1"
              style={{ top: "2px", left: "2px", maxWidth: "100%" }}
            >
              {segment.output_name}
            </span>
          </div>
        ))}

        {isDragging && <div className="absolute h-full bg-green-500 opacity-70" style={selectionStyle} />}

        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: `${currentTimePercent}%` }} />
      </div>

      <div className="text-center mt-2 text-sm text-gray-400">
        <p>Click to seek, or click and drag to create a new segment</p>
      </div>
    </div>
  )
}

export default Timeline

