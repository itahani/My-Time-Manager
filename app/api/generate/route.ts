import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// fallback mock plan in case of AI failure
const MOCK_PLAN = {
  projectName: "Project Plan (Demo Mode)",
  steps: [
    { 
      id: "step1", 
      title: "Initial Setup", 
      subTasks: [
        { id: "st1", task: "Install dependencies", time: "15 min", done: false },
        { id: "st2", task: "Configure environment", time: "30 min", done: false }
      ] 
    },
    { 
      id: "step2", 
      title: "Core Execution", 
      subTasks: [
        { id: "st3", task: "Develop main features", time: "4 hours", done: false },
        { id: "st4", task: "Unit testing", time: "1 hour", done: false }
      ] 
    }
  ]
};

export async function POST(req: Request) {
  try {
    const { goal, duration } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional Project Manager and Productivity Coach.
            Your goal is to break down a user's goal into a realistic, time-boxed plan.

            STRICT RULES:
            1. Total Budget: The user will provide a 'Total Duration' (e.g., "5 hours"). You MUST ensure the sum of all sub-task durations matches this budget closely.
            2. Realistic Estimates: Researching usually takes 30-60 min, deep work takes 60-120 min, and quick breaks take 5-10 min. Do not give 5 minutes for complex tasks.
            3. Formatting: You must return a JSON object with the exact structure below.
            4. Time Field: The 'time' field MUST be a plain integer representing minutes. No strings, no units. Respond only in JSON format.
            Return a JSON object with this exact structure:
                    {
                        "projectName": "string",
                        "steps": [
                        { 
                            "id": "unique_id", 
                            "title": "string", 
                            "subTasks": [
                            { "id": "unique_sub_id", "task": "string", "time": "string", "done": false }
                            ] 
                        }
                        ]
                    }`
        },
        {
          role: "user",
          content: `Create a detailed plan for: "${goal}" with a total duration of "${duration}".
          Each step must have subtasks. Each subtask must have its own estimated time. 
          Estimate the duration of each subtask realistically based on the user's total duration. 
          IMPORTANT: Return the 'time' field as a plain number representing minutes (e.g., 30, 45, 120). Do not use text labels.
          Do not include units like 'min' or 'hours', just the number.
          `
        }
      ],
      response_format: { type: "json_object" },
    });

    const aiContent = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(aiContent);

  } catch (error: any) {
    console.error("AI Error:", error.message);
    return NextResponse.json(MOCK_PLAN);
  }
}