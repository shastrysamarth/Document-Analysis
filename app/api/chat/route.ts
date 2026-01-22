// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(req: Request) {
  try {
    const { messages, documentId } = await req.json();

    if (!documentId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Missing documentId or messages" },
        { status: 400 }
      );
    }

    // Get the document to access extracted data and text
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: {
        embeddings: { select: { id: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from user" },
        { status: 400 }
      );
    }

    // Save the user message to the database
    const savedUserMessage = await db.chatMessage.create({
      data: {
        documentId,
        role: "user",
        content: lastMessage.content,
      },
    });

    // Embed the user's query
    const queryEmbedding = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: lastMessage.content,
    });

    // Search for relevant document chunks using vector similarity
    // Format embedding array as pgvector string format (must start with [)
    const embeddingArray = `[${queryEmbedding.data[0].embedding.join(",")}]`;
    const relevantDocs = await db.$queryRawUnsafe(
      `
      SELECT d.id, d.text, d.extracted, d.schema, e.vector <-> $1::vector AS distance
      FROM "DocumentEmbedding" e
      JOIN "Document" d ON d.id = e."documentId"
      WHERE d.id = $2
      ORDER BY e.vector <-> $1::vector
      LIMIT 3
      `,
      embeddingArray,
      documentId
    );

    // Get the most relevant document text (or use the full document if no embeddings)
    const contextText = Array.isArray(relevantDocs) && relevantDocs.length > 0
      ? relevantDocs[0].text || document.text
      : document.text;

    // Define tools for the LLM to call
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "get_extracted_data",
          description: "Get the structured data extracted from the document. Use this when the user asks about specific fields, entities, or structured information.",
          parameters: {
            type: "object",
            properties: {
              field: {
                type: "string",
                description: "The specific field or path to retrieve (e.g., 'person.name', 'experience', 'skills'). Leave empty to get all extracted data.",
              },
            },
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "search_document_text",
          description: "Search for specific information in the document text. Use this when you need to find specific details, quotes, or information that might not be in the extracted data.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query or keywords to look for in the document text.",
              },
            },
          },
        },
      },
    ];

    // Prepare system message with context
    const systemMessage = {
      role: "system" as const,
      content: `You are a helpful assistant that answers questions about documents. 
You have access to:
1. The document text: ${contextText.substring(0, 2000)}${contextText.length > 2000 ? "..." : ""}
2. Extracted structured data: ${JSON.stringify(document.extracted)}
3. Document schema: ${JSON.stringify(document.schema)}

Use the available tools to get more specific information when needed. Answer questions based on the document content and extracted data.

IMPORTANT: Always format your responses using Markdown. Use proper markdown syntax for:
- Headers (# ## ###)
- Lists (- or *)
- Code blocks (\`\`\`language)
- Bold (**text**) and italic (*text*)
- Code inline (\`code\`)
- Links and other markdown features`,
    };

    // Call OpenAI with function calling
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [systemMessage, ...messages],
      tools,
      tool_choice: "auto",
    });

    const assistantMessage = completion.choices[0].message;

    // Handle tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        // Type guard for function tool calls
        if (toolCall.type === "function") {
          if (toolCall.function.name === "get_extracted_data") {
            const args = JSON.parse(toolCall.function.arguments || "{}");
            let result: any = document.extracted;

            // If a specific field is requested, extract it
            if (args.field) {
              const fieldPath = args.field.split(".");
              let current: any = result;
              for (const key of fieldPath) {
                if (current && typeof current === "object" && key in current) {
                  current = (current as Record<string, any>)[key];
                } else {
                  current = null;
                  break;
                }
              }
              result = current;
            }

            toolResults.push({
              role: "tool" as const,
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(result),
            });
          } else if (toolCall.function.name === "search_document_text") {
            const args = JSON.parse(toolCall.function.arguments || "{}");
            const query = args.query?.toLowerCase() || "";

            // Simple text search (could be enhanced with better matching)
            const lines = document.text.split("\n");
            const matchingLines = lines
              .filter((line) => line.toLowerCase().includes(query))
              .slice(0, 5)
              .join("\n");

            toolResults.push({
              role: "tool" as const,
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: matchingLines || "No matching text found.",
            });
          }
        }
      }

      // Get final response with tool results
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          systemMessage,
          ...messages,
          assistantMessage,
          ...toolResults,
        ],
        tools,
      });

      const finalMessage = finalCompletion.choices[0].message;

      // Save the assistant message to the database
      await db.chatMessage.create({
        data: {
          documentId,
          role: "assistant",
          content: finalMessage.content || "",
          toolCalls: assistantMessage.tool_calls || null,
        },
      });

      return NextResponse.json({
        message: finalMessage,
        toolCalls: assistantMessage.tool_calls,
      });
    }

    // Save the assistant message to the database (no tool calls)
    await db.chatMessage.create({
      data: {
        documentId,
        role: "assistant",
        content: assistantMessage.content || "",
        toolCalls: null,
      },
    });

    return NextResponse.json({
      message: assistantMessage,
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

