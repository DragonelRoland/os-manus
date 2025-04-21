import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Read the YC startup data
const ycStartupData = fs.readFileSync(
  path.join(process.cwd(), 'internet.md'),
  'utf-8'
);

const systemPrompt = `You are a knowledgeable AI assistant with access to information about Y Combinator startups. 
You have access to the following startup directory data:

${ycStartupData}

When answering questions:
1. Only use information that's explicitly present in the data provided
2. If asked about a specific company, provide all available information about it
3. If asked to compare companies or find companies by criteria (e.g., industry, batch, location), analyze the data accordingly
4. If information is not available in the data, clearly state that
5. You can make logical connections between data points, but clearly indicate when you're making an inference
6. Format your responses in a clear, readable way

Current data is from the X25 batch of Y Combinator startups.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Add system prompt to the beginning of the conversation
    const augmentedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: augmentedMessages,
      temperature: 0.7,
      stream: false,
    });

    return NextResponse.json(completion.choices[0].message);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 