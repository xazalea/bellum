use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};

/// Fast chunking for large files
#[wasm_bindgen]
pub struct Chunker {
    chunk_size: usize,
}

#[wasm_bindgen]
impl Chunker {
    #[wasm_bindgen(constructor)]
    pub fn new(chunk_size: usize) -> Self {
        Self { chunk_size }
    }
    
    /// Calculate number of chunks for given data size
    pub fn chunk_count(&self, data_size: usize) -> usize {
        (data_size + self.chunk_size - 1) / self.chunk_size
    }
    
    /// Get chunk boundaries (start, end) for chunk index
    pub fn chunk_boundaries(&self, chunk_index: usize, total_size: usize) -> Vec<usize> {
        let start = chunk_index * self.chunk_size;
        let end = std::cmp::min(start + self.chunk_size, total_size);
        vec![start, end]
    }
}

/// Fast SHA-256 hashing for chunk deduplication
#[wasm_bindgen]
pub fn hash_chunk(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}

/// Hash chunk and return hex string
#[wasm_bindgen]
pub fn hash_chunk_hex(data: &[u8]) -> String {
    let hash = hash_chunk(data);
    hash.iter()
        .map(|b| format!("{:02x}", b))
        .collect()
}

/// Parallel chunk hashing (processes multiple chunks)
#[wasm_bindgen]
pub fn hash_chunks_batch(chunks: Vec<JsValue>) -> Result<Vec<String>, JsValue> {
    let mut hashes = Vec::new();
    
    for chunk_val in chunks {
        if let Ok(bytes) = js_sys::Uint8Array::try_from(chunk_val) {
            let data = bytes.to_vec();
            hashes.push(hash_chunk_hex(&data));
        } else {
            return Err(JsValue::from_str("Invalid chunk data"));
        }
    }
    
    Ok(hashes)
}

/// Calculate content-addressable key for data
#[wasm_bindgen]
pub fn content_address(data: &[u8]) -> String {
    hash_chunk_hex(data)
}

/// Verify chunk integrity
#[wasm_bindgen]
pub fn verify_chunk(data: &[u8], expected_hash: &str) -> bool {
    let actual_hash = hash_chunk_hex(data);
    actual_hash == expected_hash
}
