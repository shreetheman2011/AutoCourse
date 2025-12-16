"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardsProps {
  uploadedContent: string;
  customization: {
    difficulty: string;
    count: number;
    topics: string;
  };
}

export default function Flashcards({
  uploadedContent,
  customization,
}: FlashcardsProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateFlashcards = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: uploadedContent || "general study topics",
          count: customization.count,
          difficulty: customization.difficulty,
          topics: customization.topics,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate flashcards");

      const data = await response.json();
      setFlashcards(data.flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error("Error:", error);
      alert(
        "Failed to generate flashcards. Make sure your Gemini API key is set."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (uploadedContent) {
      generateFlashcards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    uploadedContent,
    customization.count,
    customization.difficulty,
    customization.topics,
  ]);

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    setIsFlipped(false);
  };

  const prevCard = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + flashcards.length) % flashcards.length
    );
    setIsFlipped(false);
  };

  if (flashcards.length === 0 && !isGenerating) {
    return (
      <div className="text-center py-12">
        <Sparkles size={48} className="mx-auto text-primary-500 mb-4" />
        <p className="text-gray-600 mb-4">
          {uploadedContent
            ? "Click the button below to generate flashcards"
            : "Upload a PDF first to generate flashcards"}
        </p>
        {uploadedContent && (
          <button
            onClick={generateFlashcards}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Generate Flashcards
          </button>
        )}
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Generating flashcards...</p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Flashcards</h3>
        <p className="text-sm text-gray-600">
          Card {currentIndex + 1} of {flashcards.length}
        </p>
      </div>

      {/* Flashcard */}
      <div className="relative h-64" style={{ perspective: "1000px" }}>
        <div
          className={`relative w-full h-full transition-transform duration-500 ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
          style={{ transformStyle: "preserve-3d" }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 flex items-center justify-center cursor-pointer"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-white text-xl font-medium text-center">
              {currentCard.front}
            </p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 flex items-center justify-center cursor-pointer"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-white text-lg text-center">{currentCard.back}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={prevCard}
          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
        >
          <RotateCcw size={20} />
          Flip Card
        </button>
        <button
          onClick={nextCard}
          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
