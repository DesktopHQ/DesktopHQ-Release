#!/usr/bin/env python3
"""
Download Regulars NFT images from OpenSea
"""
import requests
import json
import os

# OpenSea API endpoint for Regulars collection
collection_slug = "regulars"
api_url = f"https://api.opensea.io/api/v2/collection/{collection_slug}/nfts"

headers = {
    "Accept": "application/json",
    "X-API-KEY": ""  # OpenSea API key (optional for public data)
}

try:
    # Fetch first few NFTs
    params = {"limit": 5}
    response = requests.get(api_url, headers=headers, params=params)
    
    if response.status_code == 200:
        data = response.json()
        nfts = data.get("nfts", [])
        
        for i, nft in enumerate(nfts[:3]):  # Download first 3
            image_url = nft.get("image_url") or nft.get("image_original_url")
            if image_url:
                img_response = requests.get(image_url)
                if img_response.status_code == 200:
                    filename = f"regular-hero-{i+1}.jpg"
                    with open(filename, "wb") as f:
                        f.write(img_response.content)
                    print(f"Downloaded {filename}")
    else:
        print(f"API request failed: {response.status_code}")
        print("Using fallback: downloading sample images directly")
        
        # Fallback: try direct image URLs (these are example patterns)
        sample_urls = [
            "https://i.seadn.io/gcs/files/your-image-url-1.png",
            "https://i.seadn.io/gcs/files/your-image-url-2.png",
        ]
        
except Exception as e:
    print(f"Error: {e}")
    print("Please manually download Regulars NFT images and place them in this directory")

