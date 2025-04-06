import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import censorAudio from '@/app/api/upload/censor'; // Import censorAudio from censor.ts

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY as string;
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

let customBadWords: string[] = [];

export async function POST(req: NextRequest) {
  console.log("API /api/upload called");

  try {
    // Log request headers to ensure the Content-Type is correct
    console.log('Request Headers:', req.headers);

    // Check if the request body is in the correct format
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Invalid Content-Type. Must be multipart/form-data." }, { status: 400 });
    }

    const formData = await req.formData();  // Get the form data from the request
    console.log('Form data:', formData);
    console.log('File:', formData.get("file"));
    const file = formData.get("file") as Blob;  // Retrieve the file from the form data

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "File not found in request" }, { status: 400 });
    }

    // Save the file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempFilePath = path.join('/tmp', 'uploaded_audio.mp3');
    fs.writeFileSync(tempFilePath, buffer);
    console.log(`File saved: ${tempFilePath}, size: ${buffer.length} bytes`);

    // Automatically start transcription after uploading
    return await transcribe(tempFilePath);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed", details: error.message }, { status: 500 });
  }
}

async function transcribe(localFilePath: string) {
  const headers = {
    authorization: ASSEMBLYAI_API_KEY,
    'content-type': 'application/json',
  };

  let uploadUrl;

  try {
    console.log("Uploading local file to AssemblyAI...");
    const audioData = await fs.readFile(localFilePath);
    const uploadResponse = await axios.post(`${ASSEMBLYAI_BASE_URL}/upload`, audioData, { headers });
    uploadUrl = uploadResponse.data.upload_url;
    console.log("File uploaded successfully:", uploadUrl);
  } catch (error) {
    console.error("Error from '/upload' request:", (error as any).response?.data || error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }

  const data = {
    audio_url: uploadUrl,
    speaker_labels: true
  };

  try {
    const url = `${ASSEMBLYAI_BASE_URL}/transcript`;
    let transcriptId;

    try {
      const transcriptResponse = await axios.post(url, data, { headers });
      transcriptId = transcriptResponse.data.id;
      console.log("Transcription started with ID:", transcriptId);
    } catch (error) {
      console.error("Error from POST '/transcript' request:", (error as any).response?.data || error);
      return NextResponse.json({ error: "Transcription request failed" }, { status: 500 });
    }

    const pollingEndpoint = `${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`;
    console.log("Polling for transcription result...");

    while (true) {
      const pollingResponse = await axios.get(pollingEndpoint, { headers });
      const transcriptionResult = pollingResponse.data;

      if (transcriptionResult.status === 'completed') {
        console.log("\nFull Transcript:\n", transcriptionResult.text);

        const wordTimestampsPath = path.join('/tmp', 'word_timestamps.json');
        if (transcriptionResult.words) {
          console.log('\nWord-level Timestamps:\n');
          await fs.writeFile(wordTimestampsPath, JSON.stringify(transcriptionResult.words, null, 2));
          transcriptionResult.words.forEach((word: any) => {
            console.log(`Word: ${word.text}, Start: ${word.start} ms, End: ${word.end} ms, Confidence: ${word.confidence}`);
          });
        }

        if (transcriptionResult.utterances) {
          console.log('\nSpeaker Segmentation:\n');
          transcriptionResult.utterances.forEach((utterance: any) => {
            console.log(`Speaker ${utterance.speaker}: ${utterance.text}`);
          });
        }

        // Ensure the output directory exists before saving the censored file
        const outputDir = path.join(process.cwd(), 'public', 'censored_audio');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Call censorAudio after transcription is completed
        const outputPath = path.join(outputDir, `censored_${Date.now()}.mp3`);
        const censoredAudioPath = await censorAudio(localFilePath, transcriptionResult.words, outputPath, customBadWords);

        if (!censoredAudioPath) {
          return NextResponse.json({ error: "Censorship process failed" }, { status: 500 });
        }

        const wordTimestamps = await fs.readFile(wordTimestampsPath, 'utf-8');
        return NextResponse.json({ 
          transcript: transcriptionResult.text, 
          words: transcriptionResult.words, 
          wordTimestamps,
          processedFileName: path.basename(censoredAudioPath),
          downloadUrl: `/api/download?file=${path.basename(censoredAudioPath)}` // Add download URL
        });
      } else if (transcriptionResult.status === 'error') {
        throw new Error(`Transcription failed: ${transcriptionResult.error}`);
      } else {
        console.log("Still processing... Retrying in 3 seconds.");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  } catch (error) {
    console.error("Error:", (error as any).message);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const fileName = url.searchParams.get('file');

  if (!fileName) {
    console.error("No file specified in request.");
    return NextResponse.json({ error: "No file specified" }, { status: 400 });
  }

  // Ensure the file path is correct
  const filePath = path.join(process.cwd(), 'public', 'censored_audio', fileName);
  console.log("Attempting to serve file from path:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await fs.readFile(filePath);

    const response = new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

    // Delete file after response is sent
    response.headers.set("X-File-Delete", "true"); // Just a flag for debugging

    response.body?.pipeTo(new WritableStream({
      close: async () => {
        try {
          await fs.unlink(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (err) {
          console.error(`Failed to delete file: ${err.message}`);
        }
      }
    }));

    return response;
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
  }
}