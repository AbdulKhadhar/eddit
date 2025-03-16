import React, { useState } from "react";
import { useVideoStore } from "../../contexts/videoStore";
import { VideoSegment } from "../../types";
import { selectFile } from "../../services/tauriApi";
import { Trash2, Edit, Check, Folder } from "lucide-react";

interface SegmentEditorProps {
  segment: VideoSegment;
}

const SegmentEditor: React.FC<SegmentEditorProps> = ({ segment }) => {
  const { updateSegment, removeSegment, metadata } = useVideoStore();
  const [isEditing, setIsEditing] = useState(false);

  // Format time for display (MM:SS.ms)
  const formatTimeDetailed = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const ms = Math.floor((timeInSeconds % 1) * 100);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  // Handle intro file selection
  const handleSelectIntro = async () => {
    try {
      const filePath = await selectFile(["Video Files"]);
      if (filePath) {
        updateSegment(segment.id, { intro_path: filePath });
      }
    } catch (error) {
      console.error("Error selecting intro file:", error);
    }
  };

  // Handle output name change
  const handleOutputNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSegment(segment.id, { output_name: e.target.value });
  };

  // Calculate segment duration
  const duration = segment.end_time - segment.start_time;

  return (
    <div className="segment-editor bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4 shadow-md">

      {/* Header and duration */}
      <div className="flex justify-between items-center mb-3">

        <h3 className="text-lg font-semibold text-gray-100">
          {isEditing ? (
            <input
              type="text"
              value={segment.output_name}
              onChange={handleOutputNameChange}
              className="bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 w-full"
              placeholder="Segment name"
            />
          ) : (

            segment.output_name || "Unnamed Segment"
          )}
          {segment.intro_path && (
            <div className="right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded">
              Intro Selected
            </div>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Duration: {formatTimeDetailed(duration)}</span>
          <button onClick={() => setIsEditing(!isEditing)} className="text-blue-400 hover:text-blue-500 transition-all">
            {isEditing ? <Check className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
          </button>
          <button onClick={() => removeSegment(segment.id)} className="text-red-400 hover:text-red-500 transition-all">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* Start Time Input */}
        {/* Start Time Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
          <div className="flex items-center space-x-2">
            <button
              className="bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600"
              onClick={() => {
                const newTime = Math.max(0, parseFloat((segment.start_time - 0.1).toFixed(2)));
                if (newTime < segment.end_time) updateSegment(segment.id, { start_time: newTime });
              }}
            >
              −
            </button>
            <input
              type="text"
              value={segment.start_time !== undefined ? segment.start_time : ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value.trim() === "") {
                  updateSegment(segment.id, { start_time: 0 }); // Default to 0 instead of undefined
                  return;
                }
                const newTime = parseFloat(value);
                if (!isNaN(newTime) && newTime >= 0 && newTime < segment.end_time) {
                  updateSegment(segment.id, { start_time: newTime });
                }
              }}
              step="0.1"
              min="0"
              max={metadata ? metadata.duration : 100}
              className="bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 w-full text-center"
            />
            <button
              className="bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600"
              onClick={() => {
                const newTime = Math.min(segment.end_time - 0.1, parseFloat((segment.start_time + 0.1).toFixed(2)));
                updateSegment(segment.id, { start_time: newTime });
              }}
            >
              +
            </button>
            <span className="ml-2 text-gray-400">{segment.start_time !== undefined ? formatTimeDetailed(segment.start_time) : "–"}</span>
          </div>
        </div>

        {/* End Time Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
          <div className="flex items-center space-x-2">
            {/* Decrease button */}
            <button
              className="bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600"
              onClick={() => {
                const newTime = Math.max(segment.start_time + 0.1, parseFloat((segment.end_time - 0.1).toFixed(2)));
                updateSegment(segment.id, { end_time: newTime });
              }}
            >
              -
            </button>

            {/* Input field */}
            <input
              type="text"
              value={segment.end_time !== undefined ? segment.end_time.toString() : ""}
              onChange={(e) => {
                const newTime = e.target.value.trim(); // Allow free typing
                updateSegment(segment.id, { end_time: newTime === "" ? undefined : parseFloat(newTime) });
              }}
              onBlur={(e) => {
                let newTime = parseFloat(e.target.value); // Convert input to a number
                if (isNaN(newTime) || newTime <= segment.start_time) {
                  newTime = segment.start_time + 1; // Ensure at least 1 sec greater
                } else if (metadata && newTime > metadata.duration) {
                  newTime = metadata.duration; // Ensure within video duration
                }
                updateSegment(segment.id, { end_time: newTime }); // Set corrected value after unfocusing
              }}
              step="0.1"
              min={segment.start_time}
              max={metadata ? metadata.duration : 100}
              className="bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 w-full text-center"
            />

            {/* Increase button */}
            <button
              className="bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600"
              onClick={() => {
                const newTime = Math.min(metadata ? metadata.duration : 100, parseFloat((segment.end_time + 0.1).toFixed(2)));
                updateSegment(segment.id, { end_time: newTime });
              }}
            >
              +
            </button>

            <span className="ml-2 text-gray-400">
              {segment.end_time !== undefined ? formatTimeDetailed(segment.end_time) : "-"}
            </span>
          </div>
        </div>



      </div>


      {/* Intro selection */}
      {isEditing && (
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-300 mb-1">Intro Video (Optional)</label>
          <div className="flex items-center">
            <input
              type="text"
              value={segment.intro_path || ""}
              readOnly
              className="bg-gray-900 text-gray-400 border border-gray-600 rounded px-2 py-1 w-full"
              placeholder="No intro selected"
            />
            <button
              onClick={handleSelectIntro}
              className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center"
            >
              <Folder className="w-4 h-4 mr-1" />
              Browse
            </button>
            {segment.intro_path && (
              <button
                onClick={() => updateSegment(segment.id, { intro_path: undefined })}
                className="ml-2 text-red-400 hover:text-red-500 transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentEditor;
