import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function DELETE(req: NextRequest) {
    const url = new URL(req.url);
    const fileName = url.searchParams.get("file");

    if (!fileName) {
        return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public/censored_audio", fileName);

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
        const fileStream = fs.createReadStream(filePath);
        return new NextResponse(fileStream as any, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });
    } finally {
        try {
            await fs.promises.unlink(filePath);
            console.log(`Censored file auto-deleted after download: ${filePath}`);
        } catch (error) {
            console.error(`Failed to delete file after download: ${filePath}`, error);
        }
    }
}