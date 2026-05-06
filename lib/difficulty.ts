export type Difficulty = "easy" | "medium" | "hard" | "extreme";

export function getDifficultyInstruction(difficulty?: string) {
  if (difficulty === "extreme") {
    return [
      "EXTREME difficulty: make this unbelievably hard, significantly harder than normal AP-level practice.",
      "Require multi-step reasoning, precise distinctions, edge cases, synthesis across concepts, and strong distractors.",
      "Avoid simple recall unless it is embedded inside a harder analytical task.",
      "Assume the learner wants a super rigorous AP/college-prep challenge.",
    ].join(" ");
  }

  if (difficulty === "hard") {
    return "Hard difficulty: require application, analysis, and careful reasoning beyond direct recall.";
  }

  if (difficulty === "easy") {
    return "Easy difficulty: focus on foundational comprehension, clear definitions, and direct checks for understanding.";
  }

  return "Medium difficulty: balance recall, application, and conceptual understanding.";
}

