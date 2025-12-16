"use client";

import { useState, useEffect } from "react";
import { Sparkles, CheckCircle } from "lucide-react";

interface MatchingPair {
  term: string;
  definition: string;
}

interface MatchingProps {
  uploadedContent: string;
  customization: {
    difficulty: string;
    count: number;
    topics: string;
  };
}

export default function Matching({
  uploadedContent,
  customization,
}: MatchingProps) {
  const [pairs, setPairs] = useState<MatchingPair[]>([]);
  const [shuffledTerms, setShuffledTerms] = useState<string[]>([]);
  const [shuffledDefinitions, setShuffledDefinitions] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [selectedDefinition, setSelectedDefinition] = useState<string | null>(
    null
  );
  const [matches, setMatches] = useState<Map<string, string>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const generateMatching = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: uploadedContent || "general study topics",
          count: customization.count,
          difficulty: customization.difficulty,
          topics: customization.topics,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate matching exercise");

      const data = await response.json();
      setPairs(data.pairs);

      // Shuffle terms and definitions
      const terms = data.pairs.map((p: MatchingPair) => p.term);
      const definitions = data.pairs.map((p: MatchingPair) => p.definition);
      setShuffledTerms(shuffleArray([...terms]));
      setShuffledDefinitions(shuffleArray([...definitions]));

      setMatches(new Map());
      setSelectedTerm(null);
      setSelectedDefinition(null);
      setGameStarted(true);
    } catch (error) {
      console.error("Error:", error);
      alert(
        "Failed to generate matching exercise. Make sure your Gemini API key is set."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    if (uploadedContent && pairs.length === 0) {
      // Auto-generate on content load
    }
  }, [uploadedContent]);

  const handleTermClick = (term: string) => {
    if (matches.has(term)) return; // Already matched

    if (selectedTerm === term) {
      setSelectedTerm(null);
    } else if (selectedTerm && selectedDefinition) {
      // Try to make a match
      checkMatch(selectedTerm, selectedDefinition);
      setSelectedTerm(term);
      setSelectedDefinition(null);
    } else {
      setSelectedTerm(term);
    }
  };

  const handleDefinitionClick = (definition: string) => {
    const matchedTerm = Array.from(matches.entries()).find(
      ([_, def]) => def === definition
    )?.[0];
    if (matchedTerm) return; // Already matched

    if (selectedDefinition === definition) {
      setSelectedDefinition(null);
    } else if (selectedTerm && selectedDefinition) {
      // Try to make a match
      checkMatch(selectedTerm, selectedDefinition);
      setSelectedTerm(null);
      setSelectedDefinition(definition);
    } else {
      setSelectedDefinition(definition);
      if (selectedTerm) {
        checkMatch(selectedTerm, definition);
      }
    }
  };

  const checkMatch = (term: string, definition: string) => {
    const pair = pairs.find(
      (p) => p.term === term && p.definition === definition
    );
    if (pair) {
      setMatches((prev) => new Map(prev).set(term, definition));
      setSelectedTerm(null);
      setSelectedDefinition(null);
    } else {
      // Wrong match - reset selection after a brief delay
      setTimeout(() => {
        setSelectedTerm(null);
        setSelectedDefinition(null);
      }, 500);
    }
  };

  const handleReset = () => {
    setMatches(new Map());
    setSelectedTerm(null);
    setSelectedDefinition(null);
    const terms = pairs.map((p) => p.term);
    const definitions = pairs.map((p) => p.definition);
    setShuffledTerms(shuffleArray([...terms]));
    setShuffledDefinitions(shuffleArray([...definitions]));
  };

  if (!gameStarted && pairs.length === 0 && !isGenerating) {
    return (
      <div className="text-center py-12">
        <Sparkles size={48} className="mx-auto text-primary-500 mb-4" />
        <p className="text-gray-600 mb-4">
          {uploadedContent
            ? "Click the button below to generate a matching exercise"
            : "Upload a PDF first to generate a matching exercise"}
        </p>
        {uploadedContent && (
          <button
            onClick={generateMatching}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Generate Matching Exercise
          </button>
        )}
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Generating matching exercise...</p>
      </div>
    );
  }

  const allMatched = matches.size === pairs.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800">Matching Exercise</h3>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            Matched: {matches.size} / {pairs.length}
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {allMatched && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle size={24} className="text-green-500" />
          <p className="text-green-700 font-medium">
            Congratulations! You matched all pairs!
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Terms Column */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 mb-3">Terms</h4>
          {shuffledTerms.map((term, index) => {
            const isMatched = matches.has(term);
            const isSelected = selectedTerm === term;
            let className =
              "w-full text-left px-4 py-3 rounded-lg border-2 transition-all";

            if (isMatched) {
              className += " border-green-500 bg-green-50 opacity-60";
            } else if (isSelected) {
              className += " border-primary-500 bg-primary-50";
            } else {
              className += " border-gray-200 bg-white hover:border-primary-300";
            }

            return (
              <button
                key={index}
                onClick={() => handleTermClick(term)}
                disabled={isMatched}
                className={className}
              >
                {term}
              </button>
            );
          })}
        </div>

        {/* Definitions Column */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 mb-3">Definitions</h4>
          {shuffledDefinitions.map((definition, index) => {
            const matchedTerm = Array.from(matches.entries()).find(
              ([_, def]) => def === definition
            )?.[0];
            const isMatched = !!matchedTerm;
            const isSelected = selectedDefinition === definition;
            let className =
              "w-full text-left px-4 py-3 rounded-lg border-2 transition-all";

            if (isMatched) {
              className += " border-green-500 bg-green-50 opacity-60";
            } else if (isSelected) {
              className += " border-primary-500 bg-primary-50";
            } else {
              className += " border-gray-200 bg-white hover:border-primary-300";
            }

            return (
              <button
                key={index}
                onClick={() => handleDefinitionClick(definition)}
                disabled={isMatched}
                className={className}
              >
                {definition}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Click a term and then its matching definition to make a pair
        </p>
      </div>
    </div>
  );
}
