import os.path
import pickle
import json
import base64
import logging
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# Scopes required
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# The ID of the spreadsheet to use
SPREADSHEET_ID = '1dFv8C6nNKGRuRucxqs7WP4g_G12VoLfv3uwlvHSso-s'

class SheetClient:
    def __init__(self, spreadsheet_id=SPREADSHEET_ID):
        self.spreadsheet_id = spreadsheet_id
        self.creds = None
        self.service = None
        self.metadata_range = 'Metadata!A2:C' # Path, Attrs, Chunks
        self.data_range = 'Data!A2:B' # ChunkID, Data
        
        self.authenticate()

    def authenticate(self):
        """Shows basic usage of the Sheets API.
        Prints the names and majors of students in a sample spreadsheet.
        """
        creds = None
        # The file token.json stores the user's access and refresh tokens, and is
        # created automatically when the authorization flow completes for the first
        # time.
        if os.path.exists('token.json'):
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        # If there are no (valid) credentials available, let the user log in.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    'credentials.json', SCOPES)
                creds = flow.run_local_server(port=0)
            # Save the credentials for the next run
            with open('token.json', 'w') as token:
                token.write(creds.to_json())

        self.creds = creds
        self.service = build('sheets', 'v4', credentials=creds)
        self.init_sheets()

    def init_sheets(self):
        # Check if sheets exist, if not create them
        sheet_metadata = self.service.spreadsheets().get(spreadsheetId=self.spreadsheet_id).execute()
        sheets = sheet_metadata.get('sheets', [])
        sheet_titles = [s['properties']['title'] for s in sheets]

        requests = []
        if 'Metadata' not in sheet_titles:
            requests.append({
                'addSheet': {
                    'properties': {'title': 'Metadata'}
                }
            })
        if 'Data' not in sheet_titles:
            requests.append({
                'addSheet': {
                    'properties': {'title': 'Data'}
                }
            })
        
        if requests:
            body = {'requests': requests}
            self.service.spreadsheets().batchUpdate(
                spreadsheetId=self.spreadsheet_id,
                body=body).execute()
            
            # Init headers
            self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range='Metadata!A1:C1',
                valueInputOption='RAW',
                body={'values': [['Path', 'Attributes', 'Chunks']]}
            ).execute()
            
            self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range='Data!A1:B1',
                valueInputOption='RAW',
                body={'values': [['ChunkID', 'Data']]}
            ).execute()

    def get_metadata(self):
        result = self.service.spreadsheets().values().get(
            spreadsheetId=self.spreadsheet_id, range=self.metadata_range).execute()
        rows = result.get('values', [])
        metadata = {}
        for i, row in enumerate(rows):
            if len(row) >= 2:
                path = row[0]
                try:
                    attrs = json.loads(row[1])
                    chunks = json.loads(row[2]) if len(row) > 2 else []
                    metadata[path] = {
                        'attrs': attrs,
                        'chunks': chunks,
                        'row_idx': i + 2 # 1-based index + header
                    }
                except:
                    continue
        return metadata

    def update_metadata(self, path, attrs, chunks, row_idx=None):
        values = [[path, json.dumps(attrs), json.dumps(chunks)]]
        
        if row_idx:
            # Update existing
            range_name = f'Metadata!A{row_idx}:C{row_idx}'
            self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                body={'values': values}
            ).execute()
            return row_idx
        else:
            # Append new
            result = self.service.spreadsheets().values().append(
                spreadsheetId=self.spreadsheet_id,
                range='Metadata!A:C',
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body={'values': values}
            ).execute()
            # Extract row index from range update?? Simplified: just reload or assume append logic
            # This is tricky for concurrent access, but fine for single user
            # Regex to get range?
            updates = result.get('updates', {})
            updated_range = updates.get('updatedRange', '') 
            # e.g. Metadata!A5:C5
            return self._parse_row_from_range(updated_range)

    def delete_metadata(self, row_idx):
        # We can't easily delete rows without shifting everything and breaking indices if we cached them.
        # Lazy delete: Clear the content
        range_name = f'Metadata!A{row_idx}:C{row_idx}'
        self.service.spreadsheets().values().clear(
            spreadsheetId=self.spreadsheet_id,
            range=range_name
        ).execute()

    def read_chunk(self, chunk_id):
        # This is SLOW (O(N)). In a real app we'd need an index.
        # For this demo, we'll scan or maybe we assume chunk_id is the Row Index in Data sheet?
        # Let's assume chunk_id IS the row index in 'Data' sheet.
        range_name = f'Data!B{chunk_id}'
        result = self.service.spreadsheets().values().get(
            spreadsheetId=self.spreadsheet_id, range=range_name).execute()
        values = result.get('values', [])
        if values and values[0]:
            return base64.b64decode(values[0][0])
        return b''

    def write_chunk(self, data):
        # Append to Data sheet, return Row Index
        b64_data = base64.b64encode(data).decode('utf-8')
        # We don't really need a ChunkID column if we use Row Index, but good for debug
        values = [['RowRef', b64_data]] 
        
        result = self.service.spreadsheets().values().append(
            spreadsheetId=self.spreadsheet_id,
            range='Data!A:B',
            valueInputOption='RAW',
            insertDataOption='INSERT_ROWS',
            body={'values': values}
        ).execute()
        
        updates = result.get('updates', {})
        updated_range = updates.get('updatedRange', '')
        return self._parse_row_from_range(updated_range)

    def _parse_row_from_range(self, range_str):
        # Metadata!A5:C5 -> 5
        try:
            # Split by ! then :
            # 'Metadata!A5:C5' -> 'A5:C5'
            # 'A5' -> 5
            part = range_str.split('!')[-1].split(':')[0]
            # Remove letters
            row_str = ''.join(filter(str.isdigit, part))
            return int(row_str)
        except:
            return None

