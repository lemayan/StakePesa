# Manual Images — Drop Folder

Place your manually sourced images here. The system will use these **first**, before trying Wikimedia API.

## Required Images (add these)

| Filename | Person / Entity | Used In Market |
|---|---|---|
| `sakaja.jpg` | Johnson Sakaja — Nairobi Governor | Nairobi Governor 2027 |
| `babu.jpg` | Babu Owino — MP / Gubernatorial Candidate | Nairobi Governor 2027 |
| `ruto.jpg` | William Ruto — President of Kenya | Kenya Presidential 2027 |
| `mudavadi.jpg` | Musalia Mudavadi — Deputy PM | (future markets) |
| `gachagua.jpg` | Rigathi Gachagua | (future markets) |
| `kipchoge.jpg` | Eliud Kipchoge | (future markets) |
| `kipyegon.jpg` | Faith Kipyegon | (future markets) |

## Image Specs

- Format: `.jpg` or `.png`
- Size: at least **200×200px**, ideally square
- Style: clear headshot / portrait (no logos or group photos)
- Recommended: 400×400px

## Where to Get Them

- Wikipedia / Wikimedia Commons (download the original, not the thumbnail)
- Official government/party websites
- News agency press-release photos

## After Adding Images

Run in terminal:
```bash
node scripts/clear-stale-images.mjs
```
Then call: `POST http://localhost:3000/api/admin/seed-images`

The system will detect the local files first and use them instead of Wikimedia thumbnails.
