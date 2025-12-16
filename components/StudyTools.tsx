"use client";

import { useState } from "react";
import Flashcards from "./Flashcards";
import Quiz from "./Quiz";
import Matching from "./Matching";
import { Settings } from "lucide-react";

interface StudyToolsProps {
  uploadedContent: string;
  selectedDocName?: string;
}

export default function StudyTools({
  uploadedContent,
  selectedDocName = "No PDF selected",
}: StudyToolsProps) {
  const [activeTool, setActiveTool] = useState<
    "flashcards" | "quiz" | "matching"
  >("flashcards");
  const [flashcardCustomization, setFlashcardCustomization] = useState({
    difficulty: "medium",
    count: 10,
    topics: "",
  });
  const [quizCustomization, setQuizCustomization] = useState({
    difficulty: "medium",
    count: 10,
    topics: "",
  });
  const [matchingCustomization, setMatchingCustomization] = useState({
    difficulty: "medium",
    count: 10,
    topics: "",
  });
  const [showSettings, setShowSettings] = useState(false);

  const tools = [
    { id: "flashcards" as const, name: "Flashcards" },
    { id: "quiz" as const, name: "Quiz" },
    { id: "matching" as const, name: "Matching" },
  ];

  const currentCustomization =
    activeTool === "flashcards"
      ? flashcardCustomization
      : activeTool === "quiz"
      ? quizCustomization
      : matchingCustomization;

  return (
    <div className="space-y-6">
      {/* Tool Selector */}
      <div className="bg-white rounded-xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Study Tools</h2>
            <p className="text-sm text-gray-500">Source: {selectedDocName}</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Settings size={20} />
            Customize {activeTool}
          </button>
        </div>

        {/* Customization Panel */}
        {showSettings && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                value={currentCustomization.difficulty}
                onChange={(e) => {
                  const value = e.target.value;
                  if (activeTool === "flashcards") {
                    setFlashcardCustomization({
                      ...flashcardCustomization,
                      difficulty: value,
                    });
                  } else if (activeTool === "quiz") {
                    setQuizCustomization({
                      ...quizCustomization,
                      difficulty: value,
                    });
                  } else {
                    setMatchingCustomization({
                      ...matchingCustomization,
                      difficulty: value,
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Items
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={currentCustomization.count}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 10;
                  if (activeTool === "flashcards") {
                    setFlashcardCustomization({
                      ...flashcardCustomization,
                      count: value,
                    });
                  } else if (activeTool === "quiz") {
                    setQuizCustomization({
                      ...quizCustomization,
                      count: value,
                    });
                  } else {
                    setMatchingCustomization({
                      ...matchingCustomization,
                      count: value,
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specific Topics (optional, comma-separated)
              </label>
              <input
                type="text"
                value={currentCustomization.topics}
                onChange={(e) => {
                  const value = e.target.value;
                  if (activeTool === "flashcards") {
                    setFlashcardCustomization({
                      ...flashcardCustomization,
                      topics: value,
                    });
                  } else if (activeTool === "quiz") {
                    setQuizCustomization({
                      ...quizCustomization,
                      topics: value,
                    });
                  } else {
                    setMatchingCustomization({
                      ...matchingCustomization,
                      topics: value,
                    });
                  }
                }}
                placeholder="e.g., photosynthesis, cell division"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {/* Tool Tabs */}
        <div className="flex gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTool === tool.id
                  ? "bg-primary-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tool.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active Tool Component */}
      <div className="bg-white rounded-xl shadow-xl p-6">
        {activeTool === "flashcards" && (
          <Flashcards
            uploadedContent={uploadedContent}
            customization={flashcardCustomization}
          />
        )}
        {activeTool === "quiz" && (
          <Quiz uploadedContent={uploadedContent} customization={quizCustomization} />
        )}
        {activeTool === "matching" && (
          <Matching
            uploadedContent={uploadedContent}
            customization={matchingCustomization}
          />
        )}
      </div>
    </div>
  );
}
