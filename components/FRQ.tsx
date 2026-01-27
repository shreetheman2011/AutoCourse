"use client";

import { useState, useEffect } from "react";
import { Sparkles, FileText, ChevronDown, ChevronUp, History, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface FRQItem {
  prompt: string;
  scoring_guideline: string[];
  sample_answer: string;
}

interface Attempt {
  id: string;
  user_answer: string;
  feedback: string;
  score: number;
  created_at: string;
}

interface FRQProps {
  uploadedContent: string;
  docId?: string;
  initialData?: { frqs: FRQItem[] };
  onGenerate?: () => void;
  toolId?: string;
}

export default function FRQ({ uploadedContent, docId, initialData, onGenerate, toolId }: FRQProps) {
  const { user } = useAuth();
  const [frqs, setFrqs] = useState<FRQItem[]>(initialData?.frqs || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customization, setCustomization] = useState({
    difficulty: "medium",
    count: 2,
    topics: "",
  });
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // Answering State
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [attempts, setAttempts] = useState<Record<number, Attempt[]>>({});
  const [showHistory, setShowHistory] = useState<number | null>(null);

  // Load attempts when toolId is available
  useEffect(() => {
    if (toolId && user) {
       fetchAttempts();
    }
  }, [toolId, user]);

  const fetchAttempts = async () => {
     try {
        const { data, error } = await supabase
           .from("frq_attempts")
           .select("*")
           .eq("study_tool_id", toolId)
           .order("created_at", { ascending: false });
           
        if (error) throw error;
        
        // Group attempts by question index
        const grouped: Record<number, Attempt[]> = {};
        data?.forEach((attempt: any) => {
           if (!grouped[attempt.question_index]) {
              grouped[attempt.question_index] = [];
           }
           grouped[attempt.question_index].push(attempt);
        });
        setAttempts(grouped);
     } catch (e) {
        console.error("Error fetching attempts", e);
     }
  };

  const generateFRQ = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-frq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: uploadedContent || "general study topics",
          count: customization.count,
          difficulty: customization.difficulty,
          topics: customization.topics,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate FRQs");

      const data = await response.json();
      setFrqs(data.frqs);
      setExpandedIndex(0);

      // Save to Supabase
      if (docId && user) {
        const { data: savedTool, error } = await supabase.from("study_tools").insert({
          document_id: docId,
          user_id: user.id,
          type: "frq",
          title: `FRQ Practice (${new Date().toLocaleDateString()})`,
          data: { frqs: data.frqs },
        }).select().single();
        
        if (!error && onGenerate) onGenerate();
      } else if (onGenerate) {
         onGenerate();
      }

    } catch (error) {
      console.error("Error:", error);
      alert("Failed to generate FRQs.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGrade = async (index: number) => {
     if (!currentAnswer.trim()) return;
     
     setIsGrading(true);
     try {
        const frq = frqs[index];
        const response = await fetch("/api/grade-frq", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
              question: frq.prompt,
              scoring_guideline: frq.scoring_guideline,
              user_answer: currentAnswer
           })
        });
        
        if (!response.ok) throw new Error("Grading failed");
        const result = await response.json();
        
        const newAttempt: Attempt = {
           id: Date.now().toString(), 
           user_answer: currentAnswer,
           feedback: result.feedback,
           score: result.score,
           created_at: new Date().toISOString()
        };
        
        // Save to DB if toolId exists
        if (toolId && user) {
           await supabase.from("frq_attempts").insert({
              user_id: user.id,
              study_tool_id: toolId,
              question_index: index,
              user_answer: currentAnswer,
              feedback: result.feedback,
              score: result.score,
              total_possible_score: 10
           });
           
           // Refresh attempts
           fetchAttempts();
        } else {
           // Fallback for unsaved tool (shouldn't happen in updated flow)
           setAttempts(prev => ({
              ...prev,
              [index]: [newAttempt, ...(prev[index] || [])]
           }));
        }
        
        setCurrentAnswer("");
     } catch (error) {
        console.error("Grading error:", error);
        alert("Failed to grade answer.");
     } finally {
        setIsGrading(false);
     }
  };

  if (frqs.length === 0 && !isGenerating) {
    return (
      <div className="space-y-6">
        {/* Customization */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
           <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-purple-600"/> 
              Customize FRQ Generation
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                 <select 
                    value={customization.difficulty}
                    onChange={(e) => setCustomization({...customization, difficulty: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border px-3 py-2"
                 >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Count</label>
                 <select 
                    value={customization.count}
                    onChange={(e) => setCustomization({...customization, count: parseInt(e.target.value)})}
                    className="w-full rounded-lg border-gray-300 border px-3 py-2"
                 >
                    <option value="1">1 Question</option>
                    <option value="2">2 Questions</option>
                    <option value="3">3 Questions</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Topics (Optional)</label>
                 <input 
                    type="text"
                    placeholder="e.g. History, Calculus"
                    value={customization.topics}
                    onChange={(e) => setCustomization({...customization, topics: e.target.value})}
                    className="w-full rounded-lg border-gray-300 border px-3 py-2"
                 />
              </div>
           </div>
        </div>

        <div className="text-center py-8">
          <button
            onClick={generateFRQ}
            className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg hover:shadow-purple-200 flex items-center gap-3 mx-auto font-semibold text-lg"
          >
            <Sparkles size={24} />
            Generate Practice FRQs
          </button>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h3 className="text-xl font-semibold text-gray-800">Constructing FRQs...</h3>
        <p className="text-gray-500 mt-2">Analyzing content and creating scoring guidelines. Proceed to the saved tools tab after making a tool.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Practice FRQs</h2>
        {!initialData && (
           <button 
              onClick={() => setFrqs([])}
              className="text-gray-500 hover:text-purple-600"
           >
              Generate New
           </button>
        )}
      </div>
      
      <div className="space-y-6">
        {frqs.map((frq, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div 
               className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-start gap-4"
               onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            >
               <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                     <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                        Question {index + 1}
                     </span>
                     {attempts[index]?.length > 0 && (
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                           <CheckCircleIcon /> Completed {attempts[index].length} attempts
                        </span>
                     )}
                  </div>
                  <p className="text-lg text-gray-800 font-medium leading-relaxed">
                     {frq.prompt}
                  </p>
               </div>
               {expandedIndex === index ? <ChevronUp className="text-gray-400 mt-1" /> : <ChevronDown className="text-gray-400 mt-1" />}
            </div>

            {expandedIndex === index && (
               <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-6 animate-in slide-in-from-top-2">
                  
                  {/* Grading Interface */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                     <label className="block text-sm font-semibold text-gray-700 mb-2">Write your answer:</label>
                     <textarea 
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none mb-3"
                        placeholder="Type your response here..."
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                     />
                     <div className="flex justify-end">
                        <button 
                           onClick={() => handleGrade(index)}
                           disabled={isGrading || !currentAnswer.trim()}
                           className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                           {isGrading ? "Grading..." : <><Send size={16}/> Grade & Submit</>}
                        </button>
                     </div>
                  </div>

                  {/* History Toggle */}
                  {(attempts[index]?.length > 0 || frq.sample_answer) && (
                     <div className="flex gap-4 border-b border-gray-200 pb-2">
                        <button 
                           onClick={() => setShowHistory(showHistory === index ? null : index)}
                           className={`text-sm font-medium ${showHistory === index ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-500 hover:text-gray-800"}`}
                        >
                           Your Attempts ({attempts[index]?.length || 0})
                        </button>
                        <button 
                           className="text-sm font-medium text-gray-500 hover:text-gray-800"
                           onClick={() => alert(frq.sample_answer)} // Simple alert for now or implement modal/expand
                        >
                           View Sample Answer
                        </button>
                        <button 
                           className="text-sm font-medium text-gray-500 hover:text-gray-800"
                           onClick={() => alert(frq.scoring_guideline.join("\n"))} 
                        >
                           View Rubric
                        </button>
                     </div>
                  )}

                  {/* Attempts List */}
                  {showHistory === index && attempts[index] && (
                     <div className="space-y-4">
                        {attempts[index].map((attempt, i) => (
                           <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex justify-between items-start mb-2">
                                 <span className="text-xs text-gray-500">{new Date(attempt.created_at).toLocaleString()}</span>
                                 <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">Score: {attempt.score}/10</span>
                              </div>
                              <p className="text-gray-700 italic mb-3 border-l-2 border-gray-300 pl-3">"{attempt.user_answer}"</p>
                              <div className="bg-purple-50 p-3 rounded text-sm text-purple-900 icon-text-gap">
                                 <strong>Feedback:</strong> {attempt.feedback}
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const CheckCircleIcon = () => (
   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
   </svg>
);
