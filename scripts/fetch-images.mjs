import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Downloads Wikimedia Commons images for well-known Kenyan public figures.
 *
 * Run from the project root:
 *   node scripts/fetch-images.mjs
 *
 * Wikimedia requires a proper User-Agent header to allow downloads.
 */

const IMAGES = {
  // Politics
  "ruto.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/William_Ruto.jpg/400px-William_Ruto.jpg",
  "gachagua.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Rigathi_Gachagua_portrait.jpg/400px-Rigathi_Gachagua_portrait.jpg",
  "mudavadi.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Musalia_Mudavadi.jpg/400px-Musalia_Mudavadi.jpg",
  // Sports
  "olunga.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Michael_Olunga.jpg/400px-Michael_Olunga.jpg",
  "kipchoge.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Eliud_Kipchoge_in_2019.jpg/400px-Eliud_Kipchoge_in_2019.jpg",
  // Misc / fallbacks
  "kenya_flag.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Flag_of_Kenya.svg/400px-Flag_of_Kenya.svg.png",
};

const dir = path.join(__dirname, '..', 'public', 'images', 'figures');

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

function download(url, filename) {
  const dest = path.join(dir, filename);
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        // Wikimedia requires User-Agent and Referer to serve images
        'User-Agent': 'WekaPesa-ImageFetcher/1.0 (https://wekapesa.com; contact@wekapesa.com)',
        'Referer': 'https://en.wikipedia.org/',
        'Accept': 'image/jpeg,image/png,image/*,*/*',
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        return download(response.headers.location, filename).then(resolve).catch(reject);
      }
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded ${filename}`);
          resolve();
        });
        file.on('error', reject);
      } else {
        console.error(`❌ Failed to download ${filename}: HTTP ${response.statusCode}`);
        reject(new Error(`Status: ${response.statusCode}`));
      }
    });
    req.on('error', (err) => {
      console.error(`❌ Error downloading ${filename}:`, err.message);
      reject(err);
    });
  });
}

async function main() {
  console.log('📥 Downloading public figure images...');
  for (const [filename, url] of Object.entries(IMAGES)) {
    const dest = path.join(dir, filename);
    if (fs.existsSync(dest)) {
      console.log(`⏭  Skipped ${filename} (already exists)`);
      continue;
    }
    try {
      await download(url, filename);
    } catch {
      console.warn(`⚠️  Skipping ${filename} — will use Wikimedia API or DiceBear fallback`);
    }
  }
  console.log('Done.');
}

main();
