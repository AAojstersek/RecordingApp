import Groq from "groq-sdk";
import { toFile } from "groq-sdk/uploads";

// Server-only module - ensure this is not imported in client components
if (typeof window !== "undefined") {
  throw new Error("lib/groq.ts is server-only and cannot be imported in client components");
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  throw new Error("Missing required environment variable: GROQ_API_KEY");
}

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

/**
 * Transcribes audio using Groq's Whisper large v3 model
 * @param audioBuffer - The audio file buffer
 * @param filename - Original filename (used for content type detection)
 * @param contentType - Optional MIME type (e.g., 'audio/mpeg', 'audio/wav')
 * @returns Object with transcript text
 * @throws Error if transcription fails
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  contentType?: string
): Promise<{ text: string }> {
  try {
    // Convert Buffer to File-like object for Groq SDK
    const file = await toFile(audioBuffer, filename, {
      type: contentType,
    });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
    });

    return {
      text: transcription.text || "",
    };
  } catch (error) {
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generates a summary using Llama 3.1 70B model
 * The prompt is in Slovenian and requests key points, decisions, and action items as bullets
 * @param transcript - The transcript text to summarize
 * @returns Summary text in Slovenian with bullets
 * @throws Error if summary generation fails
 */
export async function generateSummary(transcript: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Ti si pomočnik, ki ustvarja strukturirane povzetke posnetkov v slovenščini.",
        },
        {
          role: "user",
          content: `Povzemi naslednji prepis posnetka v slovenščini. Vključi:
- Ključne točke (kot seznam)
- Odločitve (kot seznam)
- Akcijske korake (kot seznam)

Prepís:
${transcript}`,
        },
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content;
    if (!summary) {
      throw new Error("No summary generated from Groq");
    }

    return summary;
  } catch (error) {
    throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generates a short Slovenian title (3-5 words) using Llama 3.1 8B model
 * @param transcript - The transcript text to generate title from
 * @returns Short title in Slovenian (no quotes)
 * @throws Error if title generation fails
 */
export async function generateTitle(transcript: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Ti si pomočnik, ki ustvarja kratke naslove posnetkov v slovenščini (3-5 besed).",
        },
        {
          role: "user",
          content: `Ustvari kratek naslov (3-5 besed) v slovenščini za naslednji prepis posnetka. Vrni samo naslov brez narekovajev ali dodatnega besedila.

Prepís:
${transcript.substring(0, 1000)}`, // Limit transcript length for title generation
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      max_tokens: 20,
    });

    const title = completion.choices[0]?.message?.content?.trim();
    if (!title) {
      throw new Error("No title generated from Groq");
    }

    // Remove quotes if present
    return title.replace(/^["']|["']$/g, "");
  } catch (error) {
    throw new Error(`Failed to generate title: ${error instanceof Error ? error.message : String(error)}`);
  }
}

