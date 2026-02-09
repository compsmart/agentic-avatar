# TalkingHead Library Installation Guide

## Important: Manual Installation Required

The TalkingHead library needs to be downloaded manually and placed in this directory.

## Installation Steps

### Option 1: Download from GitHub (Recommended)

1. Go to https://github.com/met4citizen/TalkingHead
2. Download the latest release
3. Copy `talkinghead.mjs` to this directory (`public/modules/`)

### Option 2: Clone the Repository

```bash
# From the project root
cd public/modules
git clone https://github.com/met4citizen/TalkingHead.git temp
cp temp/modules/talkinghead.mjs .
rm -rf temp
```

### Option 3: Use NPM (if available)

```bash
# From project root
npm install @met4citizen/talkinghead
# Then copy the module file to public/modules/
```

## Verification

After installation, you should have:
- `public/modules/talkinghead.mjs`

The file should be approximately 100KB-200KB in size.

## Troubleshooting

If you see errors like "Failed to resolve module specifier 'talkinghead'":
1. Ensure the file is in the correct location
2. Check that the filename is exactly `talkinghead.mjs`
3. Verify the import map in `index.html` points to the correct path

## License

TalkingHead is licensed under the MIT License. Please review the license terms at:
https://github.com/met4citizen/TalkingHead/blob/main/LICENSE
