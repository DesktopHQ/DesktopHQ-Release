# DesktopHQ Landing Page

Landing page inspired by MODEM Works / TERRA design aesthetic.

## Setup

1. **Preview the page**
   ```bash
   open index.html
   ```

2. **Swap or update imagery (optional)**
   - Regulars NFT artwork is stored in `assets/` (`regular-hero-1.jpg`, `regular-hero-2.jpg`, `regular-hero-3.jpg`, `regular-hero-4.jpg`).
   - Replace these files with other selections from the [Regulars collection](https://opensea.io/collection/regulars) to refresh the visuals. Keep the filenames the same to avoid HTML changes.
   - If you need to download new images, either fetch them manually or modify and re-run `download_images.sh` with your chosen URLs.

## Design Notes

The design follows the MODEM Works / TERRA aesthetic:
- Warm, off-white background with serif headline typography
- Tall flexible-content stack with generous whitespace
- Feature badges and prompt card styled after the reference layout
- Image columns, wide imagery, and icon grid fed by Regulars NFTs

## Files

- `index.html` — Main landing page
- `assets/` — Regulars NFT imagery used throughout the layout
- `download_images.sh` — Helper script to download new imagery

