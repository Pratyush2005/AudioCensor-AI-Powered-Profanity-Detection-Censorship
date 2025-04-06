import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const file = url.searchParams.get("file");

  if (!file) {
    return NextResponse.json({ error: "File name is required" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public/censored_audio", file);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileStream = fs.createReadStream(filePath);
  const headers = new Headers();
  headers.append("Content-Disposition", `attachment; filename=${file}`);
  headers.append("Content-Type", "audio/mp3");

  fileStream.on("close", () => {
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Failed to delete file: ${filePath}`, err);
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      }
    }, 30000); // Delay to ensure download completes
  });

  return new NextResponse(fileStream as any, { headers });
}