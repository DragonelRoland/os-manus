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

// Agent system prompts
const agentPrompts = {
  rephraser: `You are a Query Rephraser Agent. Your job is to take a user's question and rephrase it to be more precise, specific, and searchable. 
  Maintain the original intent but make it clearer and more focused on extracting relevant information.
  Only return the rephrased query with no additional explanation.`,

  searcher: `You are a Search Agent with access to Y Combinator startup information. Given a query, find the most relevant information from the database.
  Your job is to extract and organize the most pertinent details that answer the query.
  Here is the database:
  
  ${ycStartupData}
  
  Return only the relevant information with brief explanations of why it's relevant. Format your response in markdown.`,

  generator: `You are a Response Generation Agent. Your job is to take search results about Y Combinator startups and craft them into a comprehensive, well-organized answer.
  Make your response engaging, informative, and easy to understand. Use markdown formatting for better readability.
  Do not add information that isn't supported by the search results.`
};

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    const steps = [];
    let finalResponse = '';
    
    // Step 1: Rephrase the query
    steps.push({
      agent: 'rephraser',
      status: 'Rephrasing your query for better search results...',
      output: ''
    });
    
    const rephrasedQueryResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: 'system', content: agentPrompts.rephraser },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
    });
    
    const rephrasedQuery = rephrasedQueryResponse.choices[0].message.content || query;
    steps[0].output = rephrasedQuery;
    
    // Step 2: Search for information
    steps.push({
      agent: 'searcher',
      status: 'Searching for relevant information...',
      output: ''
    });
    
    const searchResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: 'system', content: agentPrompts.searcher },
        { role: 'user', content: rephrasedQuery }
      ],
      temperature: 0.5,
    });
    
    const searchResults = searchResponse.choices[0].message.content || 'No relevant information found.';
    steps[1].output = searchResults;
    
    // Step 3: Generate final response
    steps.push({
      agent: 'generator',
      status: 'Generating comprehensive response...',
      output: ''
    });
    
    const finalResponseObj = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: 'system', content: agentPrompts.generator },
        { role: 'user', content: `Query: ${rephrasedQuery}\n\nSearch Results: ${searchResults}` }
      ],
      temperature: 0.7,
    });
    
    finalResponse = finalResponseObj.choices[0].message.content || 'Sorry, I could not generate a response.';
    steps[2].output = finalResponse;
    
    return NextResponse.json({ 
      steps, 
      finalResponse 
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 