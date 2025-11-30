import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseDraft, PaymentStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,") for API usage if needed, 
        // but for saving to state we often want the prefix. 
        // The API wants just the base64 data usually, but the SDK handles inlineData well.
        // Let's return the full string for UI and strip it for the API.
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const analyzeReceipt = async (base64DataURI: string): Promise<Partial<ExpenseDraft>> => {
  try {
    // Strip the prefix for the API call
    const base64Data = base64DataURI.split(',')[1];
    const mimeType = base64DataURI.split(';')[0].split(':')[1];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Analise este comprovante de pagamento ou boleto. Extraia o valor total, a data de vencimento (ou pagamento) e sugira uma descrição curta. Retorne em JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "The total amount of the expense" },
            date: { type: Type.STRING, description: "The date found in format YYYY-MM-DD" },
            description: { type: Type.STRING, description: "A short description of the expense" },
            isPaid: { type: Type.BOOLEAN, description: "True if the document indicates payment was made (receipt), false if it is just a bill (boleto)" }
          },
          required: ["amount", "date", "description"]
        }
      }
    });

    const text = response.text;
    if (!text) return {};

    const data = JSON.parse(text);

    return {
      amount: data.amount,
      dueDate: data.date,
      description: data.description,
      status: data.isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING
    };

  } catch (error) {
    console.error("Error analyzing receipt with Gemini:", error);
    throw error;
  }
};
