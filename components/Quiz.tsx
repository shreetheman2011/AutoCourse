"use client";

import { useState, useEffect } from "react";
import { Sparkles, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizProps {
  uploadedContent: string;
  customization: {
    difficulty: string;
    count: number;
    topics: string;
  };
  docId?: string;
  initialData?: { questions: Question[] };
  onGenerate?: () => void;
}

export default function Quiz({ uploadedContent, customization, docId, initialData, onGenerate }: QuizProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  const generateQuiz = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: uploadedContent || "general study topics",
          count: customization.count,
          difficulty: customization.difficulty,
          topics: customization.topics,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate quiz");

      const data = await response.json();
      setQuestions(data.questions);
      
      // Save to Supabase
      if (docId && user) {
        await supabase.from("study_tools").insert({
          document_id: docId,
          user_id: user.id,
          type: "quiz",
          title: `Quiz (${new Date().toLocaleDateString()})`,
          data: { questions: data.questions },
        });
      }

      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setScore(0);
      setQuizStarted(true);
      
      if (onGenerate) onGenerate();
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to generate quiz.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Removed auto-generation useEffect to prevent loops.

  const handleAnswerSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect =
      selectedAnswer === questions[currentQuestion].correctAnswer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Advance to summary view
      setCurrentQuestion(questions.length);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizStarted(false);
  };

  const handleRetakeCurrent = () => {
    if (questions.length === 0) return;
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizStarted(true);
  };

  if (!quizStarted && questions.length === 0 && !isGenerating) {
    return (
      <div className="text-center py-12">
        <Sparkles size={48} className="mx-auto text-primary-500 mb-4" />
        <p className="text-gray-600 mb-4">
          {uploadedContent
            ? "Click the button below to generate a quiz"
            : "Upload a PDF first to generate a quiz"}
        </p>
        {uploadedContent && (
          <button
            onClick={generateQuiz}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Generate Quiz
          </button>
        )}
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Generating quiz...</p>
      </div>
    );
  }

  if (currentQuestion >= questions.length) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="text-center py-12 space-y-6">
        <div className="text-6xl font-bold text-primary-500 mb-2">
          {percentage}%
        </div>
        <p className="text-xl text-gray-700">
          You scored {score} out of {questions.length}
        </p>
        <button
          onClick={handleRestart}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Start New Quiz
        </button>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800">Quiz</h3>
        <p className="text-sm text-gray-600">
          Question {currentQuestion + 1} of {questions.length} | Score: {score}
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-6">
          {question.question}
        </h4>

        <div className="space-y-3">
          {question.options.map((option, index) => {
            let buttonClass =
              "w-full text-left px-4 py-3 rounded-lg border-2 transition-all";
            let icon = null;

            if (showResult) {
              if (index === question.correctAnswer) {
                buttonClass += " border-green-500 bg-green-50";
                icon = <CheckCircle size={20} className="text-green-500" />;
              } else if (
                index === selectedAnswer &&
                index !== question.correctAnswer
              ) {
                buttonClass += " border-red-500 bg-red-50";
                icon = <XCircle size={20} className="text-red-500" />;
              } else {
                buttonClass += " border-gray-200 bg-white";
              }
            } else {
              buttonClass +=
                selectedAnswer === index
                  ? " border-primary-500 bg-primary-50"
                  : " border-gray-200 bg-white hover:border-primary-300";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={showResult}
                className={`${buttonClass} flex items-center justify-between`}
              >
                <span>{option}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {showResult && question.explanation && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Explanation:</strong> {question.explanation}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {!showResult ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Answer
          </button>
        ) : (
          <>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              {currentQuestion < questions.length - 1
                ? "Next Question"
                : "View Results"}
            </button>
            <button
              onClick={handleRetakeCurrent}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Retake Quiz
            </button>
            <button
              onClick={generateQuiz}
              className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors disabled:opacity-60"
              disabled={isGenerating}
            >
              {isGenerating ? "Regenerating..." : "Regenerate Quiz"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
