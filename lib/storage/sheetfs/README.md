# Google Sheet FS ("Unlimited Storage")

This module implements a FUSE filesystem backed by Google Sheets, allowing for "unlimited" storage by leveraging the grid as a block device.

## Prerequisites

1. **Python 3**
2. **FUSE**
   - macOS: Install [macFUSE](https://osxfuse.github.io/)
   - Linux: `sudo apt-get install libfuse-dev`
3. **Google Cloud Credentials**
   - Create a project in Google Cloud Console.
   - Enable **Google Sheets API**.
   - Create **OAuth 2.0 Client IDs** (Desktop App).
   - Download the JSON and save it as `src/credentials.json`.

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
cd src
python main.py /path/to/mountpoint
```

## Architecture

- **Metadata Sheet**: Stores file paths, attributes (permissions, size), and chunk lists.
- **Data Sheet**: Stores raw binary data as Base64 strings in cells.
- **API**: Uses `google-api-python-client` with `fusepy`.

## Limitations

- Performance is limited by Google Sheets API latency.
- "Unlimited" is bound by the 10 Million cell limit per spreadsheet (though multiple spreadsheets could be linked).
- No concurrency support (single threaded FUSE).

