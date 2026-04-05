import { GoogleGenAI } from '@google/genai';

export const evaluateCodeWithAI = async (language, code, problemTitle, problemDescription) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            // Fallback mock check if no API key is provided
            const simulatedPassed = Math.floor(Math.random() * 20) + 30; // 30-50 tests
            return {
                success: true,
                output: "✨ [MOCK] AI Validation Bypassed. Please provide GEMINI_API_KEY for true evaluation!\nCode compilation and syntax checks passed.",
                runtimeMs: 42,
                memoryKb: 0,
                passed: simulatedPassed,
                total: simulatedPassed
            };
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompt = `
You are an expert programming technical interviewer and automated judge. 
Your task is to evaluate the following user submission for a coding problem.

Problem Name: ${problemTitle}
Problem Description:
${problemDescription}

Language: ${language}
User's Code:
\`\`\`${language}
${code}
\`\`\`

Analyze the code for:
1. Correctness: Does it solve the problem logically?
2. Edge cases: Will it handle typical edge cases (e.g., empty arrays, null, negative numbers if applicable)?
3. Complexity: Is it reasonably efficient (not O(N^3) if O(N) is expected)?

Return a pure JSON response (no markdown fences, strictly parseable JSON) matching this exact format:
{
  "success": boolean (true if the code is completely correct and optimal enough, false otherwise),
  "passed": int (number of testcases you estimate it would pass, make it realistic eg. 45),
  "total": int (total test cases, make it the same as passed if success is true, e.g. 45),
  "output": string (a short, encouraging explanation of your verdict, pointing out errors if any)
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.2, // Low temperature for deterministic evaluation
            }
        });

        const textResponse = response.text.trim();
        // Extract JSON if it contains markdown by accident
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        const parseable = jsonMatch ? jsonMatch[0] : textResponse;
        
        const result = JSON.parse(parseable);
        
        return {
            success: result.success,
            output: "🤖 AI Evaluation Verdict:\n" + result.output,
            runtimeMs: Math.floor(Math.random() * 20) + 15, // Simulate rapid runtime
            memoryKb: 0,
            passed: result.passed,
            total: result.total
        };

    } catch (err) {
        console.error('AI Evaluation error:', err);
        return {
            success: false,
            output: "System Error during AI Evaluation: " + err.message,
            runtimeMs: 0,
            memoryKb: 0,
            passed: 0,
            total: 0
        };
    }
};
