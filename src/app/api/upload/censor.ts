import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

ffmpeg.setFfmpegPath('/usr/local/bin/ffmpeg');

const audioFilePath = '/tmp/uploaded_audio.mp3';
const outputDir = path.join(process.cwd(), 'public', 'censored_audio');
const customWordsTempFilePath = path.join(process.cwd(), 'src', 'app', 'api', 'upload', 'custom_words.json');
const timestampsFilePath = '/tmp/word_timestamps.json';
const beepFilePath = path.join(process.cwd(), 'public', 'beep.mp3');
const temporaryOutputFilePath = path.join(process.cwd(), 'public', 'temp_censored_audio.mp3');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

let isProcessing = false;

const generateBeep = async (duration: number = 0.5) => {
    console.log(`Using pre-recorded beep file from public folder with duration: ${duration}s.`);
};

const validateInputFiles = () => {
    if (!fs.existsSync(audioFilePath)) {
        console.error('Audio file does not exist. Censorship process aborted.');
        return false;
    }
    if (!fs.existsSync(timestampsFilePath)) {
        console.error('Timestamps file does not exist.');
        return false;
    }
    if (!fs.existsSync(beepFilePath)) {
        console.error('Beep file does not exist.');
        return false;
    }
    return true;
};

const censorAudio = async () => {
    if (isProcessing) {
        console.log("Censorship process is already running. Skipping duplicate execution.");
        return;
    }

    if (!validateInputFiles()) {
        console.log("Censorship aborted due to missing input files.");
        return null;
    }

    isProcessing = true;

    try {
        const data = fs.readFileSync(timestampsFilePath);
        const timestamps = JSON.parse(data.toString());

        const defaultBadWords = ["fuck", "shit", "bitch", "asshole", "bastard", "dick", "pussy", "cunt", "motherfucker", "cock"];

        let safeCustomBadWords: string[] = [];

        try {
            const customWordsRaw = fs.readFileSync(customWordsTempFilePath, 'utf-8');
            const parsedCustomWords = JSON.parse(customWordsRaw);
            if (Array.isArray(parsedCustomWords)) {
                safeCustomBadWords = parsedCustomWords.map(word => word.toLowerCase());
            }
        } catch (err) {
            console.warn('No custom words file found or invalid JSON. Using only default words.');
        }

        const badWords = [...new Set([...defaultBadWords, ...safeCustomBadWords])].map(word => word.toLowerCase());

        const badWordsTimestamps = timestamps
            .filter((word: any) => badWords.includes(word.text?.toLowerCase()))
            .sort((a: any, b: any) => a.start - b.start);

        if (badWordsTimestamps.length === 0) {
            console.log("No matching words to censor. Returning original file.");
            isProcessing = false;
            return audioFilePath;
        }

        await generateBeep(0.5);

        const volumeFilter = badWordsTimestamps
            .map(({ start, end }: { start: number; end: number }) => `volume=0:enable='between(t,${start / 1000},${end / 1000})'`)
            .join(',');

        const filters = volumeFilter
            ? [`[0:a]${volumeFilter}[muted]`, '[muted][1:a]amix=inputs=2:duration=first[out]']
            : ['[0:a]anull[out]'];

        const finalOutputFilePath = path.join(outputDir, `censored_${Date.now()}.mp3`);

        ffmpeg(audioFilePath)
            .input(beepFilePath)
            .complexFilter(filters)
            .outputOptions('-map', '[out]')
            .toFormat('mp3')
            .on('start', (commandLine) => console.log('Spawned Ffmpeg with command: ' + commandLine))
            .on('progress', (progress) => console.log(`Processing: ${progress.percent}% done`))
            .on('error', (err) => {
                console.error('Error processing audio:', err.message);
                isProcessing = false;
            })
            .on('end', () => {
                console.log('Censorship process completed successfully.');
                console.log(`File saved at: ${finalOutputFilePath}`);

                if (fs.existsSync(temporaryOutputFilePath)) {
                    fs.unlinkSync(temporaryOutputFilePath);
                }

                try {
                    fs.unlinkSync(customWordsTempFilePath);
                    console.log('Custom words file deleted after use.');
                } catch (err) {
                    console.warn('Failed to delete custom words file:', err);
                }

                isProcessing = false;
            })
            .output(finalOutputFilePath)
            .run();

        return finalOutputFilePath;

    } catch (error) {
        console.error('Error processing audio:', error instanceof Error ? error.message : error);
        isProcessing = false;
        return null;
    }
};

export default censorAudio;