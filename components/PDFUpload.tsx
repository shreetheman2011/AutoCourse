"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface PDFUploadProps {
  onUploaded: (doc: any) => void;
}

export default function PDFUpload({ onUploaded }: PDFUploadProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setUploadStatus("idle");
      setErrorMessage("");
    } else {
      setErrorMessage("Please upload a PDF file");
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    setUploadStatus("idle");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Upload to API to parse text
      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to parse PDF");
      }

      const parsedData = await response.json();

      // 2. Save text content to Supabase
      const { data, error } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          name: file.name,
          content: parsedData.content,
        })
        .select()
        .single();

      if (error) throw error;

      onUploaded(data);
      setUploadStatus("success");
      setFile(null); // Reset after successful upload
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setErrorMessage(error.message || "Failed to process PDF");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setUploadStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="w-full">
      <div 
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragging 
            ? "border-primary-500 bg-primary-50 scale-[1.02]" 
            : "border-gray-300 hover:border-primary-400 hover:bg-gray-50 bg-white"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          id="pdf-upload"
          disabled={isUploading}
        />
        
        {!file ? (
          <label
            htmlFor="pdf-upload"
            className={`cursor-pointer flex flex-col items-center gap-4 ${
              isUploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isDragging ? "bg-primary-200" : "bg-primary-50"
            }`}>
              <Upload size={32} className="text-primary-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                Drag & Drop PDF here or <span className="text-primary-600">Browse</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">Max file size: 10MB</p>
            </div>
          </label>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between w-full max-w-md mb-4 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-md shadow-sm text-blue-600">
                  <FileText size={24} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleRemove();
                }}
                className="p-1 hover:bg-white rounded-full text-gray-400 hover:text-red-500 transition-colors"
                disabled={isUploading}
              >
                <X size={20} />
              </button>
            </div>
            
            {uploadStatus === "error" && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg mb-4 text-sm w-full max-w-md">
                <AlertCircle size={16} />
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full max-w-md py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Upload & Process
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {uploadStatus === "success" && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-green-800 font-medium">
            Upload complete! Redirecting...
          </p>
        </div>
      )}
    </div>
  );
}

