import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseDraft, PaymentStatus } from "../types";

// Helper to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
            text: "Analise este documento (boleto ou comprovante). Extraia o valor total, a data de vencimento/pagamento. IMPORTANTE: Se parecer uma conta mensal (aluguel, condominio, luz), a descrição DEVE ser estritamente no formato 'Parcela Mensal MM/AAAA' correspondente ao mês de referência. Se for pago, marque isPaid como true. Retorne JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Valor total do documento" },
            date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
            description: { type: Type.STRING, description: "Descrição sugerida, preferencialmente 'Parcela Mensal MM/AAAA'" },
            isPaid: { type: Type.BOOLEAN, description: "True se for um comprovante de pagamento, False se for um boleto a pagar" }
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