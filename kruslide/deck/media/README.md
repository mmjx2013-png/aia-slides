# media/ · the Ayutthaya trailer for slide 14

The deck plays the trailer made in `kruslide/trailer/` (another agent renders it to `kruslide/trailer/out/`).

Put these two files in this folder before presenting or deploying:

| File here | Copy from | Used when |
|---|---|---|
| `ayutthaya-4k.mp4` | `kruslide/trailer/out/ayutthaya-4k.mp4` | the screen is 2500 px wide or more (4K projector, Retina laptop) |
| `ayutthaya-1080.mp4` | `kruslide/trailer/out/ayutthaya-1080.mp4` | every other screen, and as the fallback if the 4K file fails |

- `ayutthaya-poster.jpg` (already here) is the poster shown before the video plays. It is our own illustration from the sales site.
- If neither video file is here, slide 14 shows the poster with the line "วิดีโอกำลังเรนเดอร์" and the deck still works.
- GitHub rejects files over 100 MB. If the 4K file is larger, host it with Git LFS or on Cloudflare R2 under the same path, or keep only the 1080p file.
- Image credits for the trailer are in `kruslide/trailer/credits.md` and at the end of the video.
