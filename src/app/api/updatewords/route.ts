import fs from 'fs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const customWordsFile = process.cwd() + '/src/app/api/upload/custom_words.json';

    const body = await request.json();
    const { words } = body;

    console.log("Received words:", words);

    if (!Array.isArray(words)) {
      return NextResponse.json({ error: "Invalid words format" }, { status: 400 });
    }

    // Save new custom words
    fs.writeFileSync(customWordsFile, JSON.stringify(words, null, 2));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error in updateWords API:", error);
    return NextResponse.json({ error: "Failed to process custom words" }, { status: 500 });
  }
}