'use client';
import { useState, useRef } from "react";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [customWords, setCustomWords] = useState<string>("");
  const [words, setWords] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (selectedFile: File) => {
    if (selectedFile.type.startsWith("audio/")) {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError("Only audio files are allowed.");
    }
  };

  const handleFileChange = async (event: any) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    validateFile(selectedFile);
    if (selectedFile.type.startsWith("audio/")) {
      await uploadFile(selectedFile);
    }
  };

  const handleDrop = (event: any) => {
    event.preventDefault();
    if (event.dataTransfer.files.length > 0) {
      const selectedFile = event.dataTransfer.files[0];
      validateFile(selectedFile);
      if (selectedFile.type.startsWith("audio/")) {
        uploadFile(selectedFile);
      }
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setProcessedFileUrl(null);
    
    console.log("Uploading file:", file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Upload response:", data);

      if (!response.ok) {
        throw new Error(`Upload failed: ${data.error || response.statusText}`);
      }

      if (data.processedFileName) {
        const fileUrl = `/api/download?file=${data.processedFileName}`;
        console.log("Processed file URL:", fileUrl);
        setProcessedFileUrl(fileUrl);
      } else {
        setError("No processed file received.");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setError("File upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (value: string) => {
    const split = value.trim().split(/\s+/);
    setWords(split);
  };

  const handleCustomWordsChange = (e: any) => {
    const newWords = e.target.value;
    setCustomWords(newWords);
    handleInputChange(newWords);
  };

  const handleSaveWords = async () => {
    if (words.length === 0) {
      console.warn("No words to save.");
      return;
    }

    try {
      console.log("Calling /api/updatewords with:", words);

      const response = await fetch('http://localhost:3000/api/updatewords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words })
      });

      if (!response.ok) {
        throw new Error('Failed to save words');
      }

      console.log('Words successfully saved');
    } catch (err) {
      console.error('Error saving words:', err);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-r from-purple-400 to-blue-500">
      <div className="box-border w-96 p-6 flex flex-col items-center bg-white shadow-2xl rounded-xl">
        <p className="text-center font-bold text-2xl text-gray-800 mb-4">
          Audio Profanity Filter
        </p>

        <div
          className="w-full h-36 border-2 border-dashed border-gray-400 rounded-xl flex flex-col justify-center items-center text-gray-600 cursor-pointer transition-all duration-300 hover:bg-gray-100"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            <p className="text-black font-medium">{file.name}</p>
          ) : (
            <p className="text-center px-4">
              Drag & Drop an audio file here or{" "}
              <span className="text-blue-500 font-semibold">click to upload</span>
            </p>
          )}
        </div>

        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}

        <input
          type="file"
          accept="audio/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 text-white px-5 py-2 rounded-lg cursor-pointer transition-all duration-300 shadow-md ${
            uploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          }`}
          disabled={uploading}
        >
          {uploading ? "Processing..." : "Upload Audio"}
        </button>

        {processedFileUrl && (
          <div className="mt-4">
            <p className="text-black font-medium">Processed File:</p>
            <audio controls className="mt-2">
              <source src={processedFileUrl} type="audio/mp3" />
              Your browser does not support the audio element.
            </audio>
            <a
              href={processedFileUrl}
              download="censored_audio.mp3"
              className="mt-4 block bg-green-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-green-600 transition-all duration-300 shadow-md text-center"
              onClick={async () => {
                setTimeout(async () => {
                  try {
                    await fetch(processedFileUrl, { method: "DELETE" });
                    console.log("File deletion request sent");
                  } catch (error) {
                    console.error("File deletion failed:", error);
                  }
                }, 5000); // Delay to allow download completion
              }}
            >
              Download Processed File
            </a>
          </div>
        )}

        <div className="mt-6 w-full">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Add Custom Words to Censor</h3>
          <textarea
            className="w-full p-2 border rounded-md text-black"
            rows="3"
            placeholder="Enter words separated by commas (e.g., badword1, badword2)"
            value={customWords}
            onChange={handleCustomWordsChange}
          />
          <button
            onClick={handleSaveWords}
            className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-all duration-300"
          >
            Save Words
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;