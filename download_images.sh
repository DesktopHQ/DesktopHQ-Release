#!/bin/bash
# Download Regulars NFT images for hero section
# These are sample image URLs - replace with actual Regulars NFT image URLs from OpenSea

cd "$(dirname "$0")"

echo "Downloading Regulars NFT images..."

# Sample Regulars NFT image URLs (replace these with actual URLs from opensea.io/collection/regulars)
# You can find image URLs by inspecting the page source or using OpenSea's API

# Try downloading a few sample images
# Format: https://i.seadn.io/gcs/files/[hash].png or similar

# Placeholder - replace these URLs with actual Regulars NFT image URLs
curl -L -o regular-hero.jpg "https://via.placeholder.com/2560x1600/667eea/ffffff?text=Regulars+NFT+Hero" 2>/dev/null

echo "Done! Place regular-hero.jpg in this directory."
echo "To get actual Regulars NFT images:"
echo "1. Visit https://opensea.io/collection/regulars"
echo "2. Right-click on an NFT image and 'Copy Image Address'"
echo "3. Replace the URL in this script or download manually"

