"use client";

import { useState } from "react";
import Flashcards from "./Flashcards";
import Quiz from "./Quiz";
import Matching from "./Matching";
import { Settings, Layers, HelpCircle, Puzzle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface StudyToolsProps {
  uploadedContent: string;
  selectedDocName?: string;
  docId?: string;
  onGenerate?: () => void;
  initialData?: any;
  initialToolType?: "flashcards" | "quiz" | "matching";
}

export default function StudyTools({
  uploadedContent,
  selectedDocName = "No PDF selected",
  docId,
  onGenerate,
  initialData,
  initialToolType = "flashcards",
}: StudyToolsProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"select" | "customize">("select");
  const [activeTool, setActiveTool] = useState<"flashcards" | "quiz" | "matching">("flashcards");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [customization, setCustomization] = useState({
    difficulty: "medium",
    count: 10,
    topics: "",
  });

  const tools = [
    { id: "flashcards" as const, name: "Flashcards", icon: Layers, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "quiz" as const, name: "Quiz", icon: HelpCircle, color: "text-purple-500", bg: "bg-purple-50" },
    { id: "matching" as const, name: "Matching", icon: Puzzle, color: "text-green-500", bg: "bg-green-50" },
  ];

  const handleToolSelect = (toolId: "flashcards" | "quiz" | "matching") => {
    setActiveTool(toolId);
    setStep("customize");
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let endpoint = "";
      let type = "";
      let title = "";

      if (activeTool === "flashcards") {
        endpoint = "/api/generate-flashcards";
        type = "flashcards";
        title = "Flashcards";
      } else if (activeTool === "quiz") {
        endpoint = "/api/generate-quiz";
        type = "quiz";
        title = "Quiz";
      } else {
        endpoint = "/api/generate-matching";
        type = "matching";
        title = "Matching Game";
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: uploadedContent || "general study topics",
          count: customization.count,
          difficulty: customization.difficulty,
          topics: customization.topics,
        }),
      });

      if (!response.ok) throw new Error(`Failed to generate ${title}`);

      const data = await response.json();
      
      // Save to Supabase
      if (docId && user) {
        // Construct the data payload correctly based on tool type
        let toolData = {};
        if (activeTool === "flashcards") toolData = { flashcards: data.flashcards };
        else if (activeTool === "quiz") toolData = { questions: data.questions };
        else if (activeTool === "matching") toolData = { pairs: data.pairs };

        const { error } = await supabase.from("study_tools").insert({
          document_id: docId,
          user_id: user.id,
          type: type,
          title: `${title} (${new Date().toLocaleDateString()})`,
          data: toolData,
        });
        
        if (error) throw error;
      }

      // Success - Trigger navigation
      if (onGenerate) {
         onGenerate();
      }

    } catch (error) {
      console.error("Generation Error:", error);
      alert("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // If we have initialData, we are in "View Mode" (Saved Tools Viewer)
  // We simply render the appropriate component with data.
  if (initialData) {
     if (initialToolType === "flashcards") return <Flashcards uploadedContent={uploadedContent} customization={customization} docId={docId} initialData={initialData} />;
     if (initialToolType === "quiz") return <Quiz uploadedContent={uploadedContent} customization={customization} docId={docId} initialData={initialData} />;
     if (initialToolType === "matching") return <Matching uploadedContent={uploadedContent} customization={customization} docId={docId} initialData={initialData} />;
     return <div>Unknown Tool</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {step === "select" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className="bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-primary-500 hover:shadow-md transition-all text-center group"
            >
              <div className={`w-16 h-16 ${tool.bg} ${tool.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                <tool.icon size={32} />
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">{tool.name}</h3>
              <p className="text-sm text-gray-500">Click to customize and generate</p>
            </button>
          ))}
        </div>
      )}

      {step === "customize" && (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-100">
             <button 
                onClick={() => setStep("select")}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
             >
                <Settings size={20} className="rotate-90" /> {/* Reusing Settings icon as Back for now, or arrow */}
             </button>
             <div>
                <h3 className="text-2xl font-bold text-gray-800">Customize {tools.find(t => t.id === activeTool)?.name}</h3>
                <p className="text-gray-500">Configure your study session</p>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-2">
                 Difficulty Level
               </label>
               <select
                 value={customization.difficulty}
                 onChange={(e) => setCustomization({...customization, difficulty: e.target.value})}
                 className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
               >
                 <option value="easy">Easy</option>
                 <option value="medium">Medium</option>
                 <option value="hard">Hard</option>
               </select>
               <p className="text-xs text-gray-500 mt-2">Adjusts the complexity of the questions.</p>
             </div>

             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-2">
                 Number of Items
               </label>
               <input
                 type="number"
                 min="3"
                 max="20"
                 value={customization.count}
                 onChange={(e) => setCustomization({...customization, count: parseInt(e.target.value) || 5})}
                 className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
               />
               <p className="text-xs text-gray-500 mt-2">How many questions/cards to generate.</p>
             </div>

             <div className="md:col-span-2">
               <label className="block text-sm font-semibold text-gray-700 mb-2">
                 Specific Topics (Optional)
               </label>
               <input
                 type="text"
                 value={customization.topics}
                 onChange={(e) => setCustomization({...customization, topics: e.target.value})}
                 placeholder="e.g., Photosynthesis, The Great Depression, Calculus"
                 className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
               />
               <p className="text-xs text-gray-500 mt-2">Focus the content on specific areas of the document.</p>
             </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
             <button
               onClick={handleGenerate}
               disabled={isGenerating}
               className="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-semibold shadow-lg hover:shadow-primary-200 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isGenerating ? (
                  <>
                     <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     Generating...
                  </>
               ) : (
                  <>
                     Generate Content
                  </>
               )}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
