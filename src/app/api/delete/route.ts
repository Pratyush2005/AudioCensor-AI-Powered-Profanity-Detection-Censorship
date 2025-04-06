import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function DELETE(req: NextRequest) {
    const url = new URL(req.url);
    const file = url.searchParams.get("file");

    if (!file) {
        return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public/censored_audio", file);

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
        await fs.promises.unlink(filePath);
        console.log(`File deleted successfully: ${filePath}`);
        return NextResponse.json({ message: "File deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error(`Error deleting file: ${filePath}`, error);
        return NextResponse.json({ error: "Error deleting file", details: (error as Error).message }, { status: 500 });
    }
}