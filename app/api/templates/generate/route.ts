import { connectDB } from '@/lib/db';
import { OfferConfig } from '@/models/OfferConfig';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Request validation schema
const generateRequestSchema = z.object({
  goal: z.string().min(1, 'Goal is required'),
  tone: z.enum(['Professional', 'Friendly', 'Casual']),
  keyPoints: z.string().optional(),
});

// Available template variables
const TEMPLATE_VARIABLES = [
  'firstName',
  'lastName',
  'companyName',
  'location',
  'calendlyUrl',
  'fromName',
  'nicheName',
  'offerDescription',
];

/**
 * Validates and corrects template variable syntax
 * Ensures all variables use {{variableName}} format
 */
function validateVariableSyntax(text: string): string {
  let correctedText = text;
  
  // Fix single braces to double braces
  TEMPLATE_VARIABLES.forEach((variable) => {
    // Replace {variable} with {{variable}}
    const singleBraceRegex = new RegExp(`(?<!\\{)\\{${variable}\\}(?!\\})`, 'g');
    correctedText = correctedText.replace(singleBraceRegex, `{{${variable}}}`);
  });
  
  return correctedText;
}

/**
 * Builds the AI prompt with user inputs and OfferConfig context
 */
function buildPrompt(
  goal: string,
  tone: string,
  keyPoints: string | undefined,
  offerConfig: any
): string {
  const toneGuidelines = {
    Professional: 'formal, business-like, and respectful',
    Friendly: 'warm, approachable, and personable',
    Casual: 'relaxed, conversational, and informal',
  };

  return `You are a professional cold email copywriter. Generate a cold outreach email template based on the following information:

**GOAL**: ${goal}

**TONE**: ${tone} (${toneGuidelines[tone as keyof typeof toneGuidelines]})

**TARGET AUDIENCE**:
- Niche: ${offerConfig.nicheName}
- ICP Description: ${offerConfig.icpDescription}

**YOUR OFFER**: ${offerConfig.offerDescription}

**YOUR DETAILS**:
- From Name: ${offerConfig.fromName}
- Calendly URL: ${offerConfig.calendlyUrl}

${keyPoints ? `**KEY POINTS TO HIGHLIGHT**: ${keyPoints}` : ''}

**TEMPLATE VARIABLES** (use these exact formats in your email):
- {{firstName}} - Lead's first name
- {{lastName}} - Lead's last name
- {{companyName}} - Lead's company name
- {{location}} - Lead's location
- {{calendlyUrl}} - Your booking link
- {{fromName}} - Your name
- {{nicheName}} - Target niche
- {{offerDescription}} - Your offer description

**REQUIREMENTS**:
1. Keep email body under 150 words
2. Include at least one personalization variable ({{firstName}}, {{companyName}}, etc.)
3. MUST include {{calendlyUrl}} for booking calls with a clear call-to-action
4. Sound natural and conversational, not robotic
5. Avoid spam trigger words
6. Include a clear, compelling call-to-action
7. Use the ${tone.toLowerCase()} tone throughout

**OUTPUT FORMAT**:
Provide ONLY the email in this exact JSON format (no markdown, no extra text):
{
  "subject": "Your subject line here",
  "body": "Your email body here"
}

The subject should be attention-grabbing and use variables where appropriate. The body should be well-structured with proper paragraphs and line breaks.`;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = generateRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }
    
    const { goal, tone, keyPoints } = validationResult.data;
    
    // Fetch user's OfferConfig
    const offerConfig = await OfferConfig.findOne().lean();
    
    if (!offerConfig) {
      return NextResponse.json(
        { 
          error: 'Offer configuration not found. Please configure your offer at /settings/offer first.',
          redirectTo: '/settings/offer'
        },
        { status: 404 }
      );
    }
    
    // Build prompt with context
    const prompt = buildPrompt(goal, tone, keyPoints, offerConfig);
    
    // Call Gemini AI - using Gemini 2.0 Flash (supported by SDK 0.24.1)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const generatedText = response.text();
    
    // Parse the JSON response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedText);
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }
    
    // Validate and correct variable syntax
    const subject = validateVariableSyntax(parsedResponse.subject || '');
    const bodyText = validateVariableSyntax(parsedResponse.body || '');
    
    // Ensure calendlyUrl is included
    if (!bodyText.includes('{{calendlyUrl}}')) {
      console.warn('Generated template missing {{calendlyUrl}} variable');
    }
    
    return NextResponse.json({
      subject,
      body: bodyText,
    });
    
  } catch (error: any) {
    console.error('Error generating template:', error);
    
    // Handle rate limit errors
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: 'API rate limit exceeded. Please try again in a few moments.' },
        { status: 429 }
      );
    }
    
    // Handle API key errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'API configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate template. Please try again.' },
      { status: 500 }
    );
  }
}
