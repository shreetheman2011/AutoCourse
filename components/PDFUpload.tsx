"use client";

import { useState } from "react";
import { Upload, FileText, X, CheckCircle } from "lucide-react";

interface UploadedDoc {
  id: string;
  name: string;
  pages: number;
  content: string;
}

interface PDFUploadProps {
  onUploaded: (doc: UploadedDoc) => void;
}

export default function PDFUpload({ onUploaded }: PDFUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setUploadStatus("idle");
        setErrorMessage("");
      } else {
        setErrorMessage("Please upload a PDF file");
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("idle");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload PDF");
      }

      const data = await response.json();
      onUploaded({
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        pages: data.pages,
        content: data.content,
      });
      setUploadStatus("success");
    } catch (error: any) {
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
    <div className="bg-white rounded-xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Upload Study Guide PDF
      </h2>

      <div className="space-y-6">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="pdf-upload"
            className={`cursor-pointer flex flex-col items-center gap-4 ${
              isUploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <Upload size={32} className="text-primary-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500 mt-1">PDF files only</p>
            </div>
          </label>
        </div>

        {/* File Preview */}
        {file && (
          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-primary-500" />
              <div>
                <p className="font-medium text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="text-gray-400 hover:text-red-500 transition-colors"
              disabled={isUploading}
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Status Messages */}
        {uploadStatus === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-500" />
            <p className="text-green-700">
              PDF processed successfully! You can now generate study tools.
            </p>
          </div>
        )}

        {uploadStatus === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Upload Button */}
        {file && uploadStatus !== "success" && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing PDF...
              </>
            ) : (
              <>
                <Upload size={20} />
                Process PDF
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
