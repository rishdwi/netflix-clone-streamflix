import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ffmpegPath = process.env.FFMPEG_BIN || 'ffmpeg';

console.log('ffmpeg path:', ffmpegPath);

const movies = [
  { video: 'animal.mp4', image: 'animal.jpg', time: '00:00:05' },
  { video: 'kgf-2.mp4', image: 'kgf-2.jpg', time: '00:00:10' },
  { video: 'toxic.mp4', image: 'toxic.jpg', time: '00:00:05' }
];

for (const m of movies) {
  const vidPath = path.join(process.cwd(), 'public', 'videos', m.video);
  const imgPath = path.join(process.cwd(), 'public', 'images', 'backdrops', m.image);
  if (fs.existsSync(vidPath)) {
    try {
      execSync(`"${ffmpegPath}" -ss ${m.time} -i "${vidPath}" -vframes 1 -q:v 2 "${imgPath}" -y`);
      console.log(`Generated thumbnail for ${m.video} -> ${m.image}`);
    } catch (err) {
      console.error(`Error for ${m.video}:`, err);
    }
  }
}
