
import { GoogleGenAI, Type } from "@google/genai";
import { WorkDay, AIInsight } from "../types";

export const getWorkInsights = async (workData: WorkDay[]): Promise<AIInsight> => {
  // Directly using process.env.API_KEY as it is managed by the environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze the following work log data for a user. Provide a summary of their work habits, 
    recommendations for better work-life balance or productivity, and a productivity score (0-100).
    
    Data: ${JSON.stringify(workData)}
    
    Focus on:
    - Consistency of work hours.
    - Potential burnout (working too long).
    - Regularity of breaks.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            productivityScore: { type: Type.NUMBER }
          },
          required: ["summary", "recommendations", "productivityScore"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as AIInsight;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return {
      summary: "We couldn't generate insights at this moment. Keep up the good work!",
      recommendations: ["Ensure you take regular breaks", "Log your punches consistently"],
      productivityScore: 0
    };
  }
};
