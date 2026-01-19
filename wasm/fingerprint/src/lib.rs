use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};

/// Fast SHA-256 hashing for fingerprint generation
#[wasm_bindgen]
pub fn hash_sha256(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}

/// Hash multiple data sources and combine them
#[wasm_bindgen]
pub fn hash_combined(data_sources: Vec<JsValue>) -> Result<Vec<u8>, JsValue> {
    let mut hasher = Sha256::new();
    
    for value in data_sources {
        if let Some(bytes) = value.as_string() {
            hasher.update(bytes.as_bytes());
        } else if let Ok(bytes) = js_sys::Uint8Array::try_from(value) {
            hasher.update(&bytes.to_vec());
        }
    }
    
    Ok(hasher.finalize().to_vec())
}

/// Convert hash bytes to hex string
#[wasm_bindgen]
pub fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter()
        .map(|b| format!("{:02x}", b))
        .collect()
}

/// Canvas fingerprinting helper - hash pixel data
#[wasm_bindgen]
pub fn hash_canvas_data(pixels: &[u8], width: u32, height: u32) -> String {
    let mut hasher = Sha256::new();
    
    // Sample pixels at intervals for faster hashing
    let sample_rate = 16;
    let total_pixels = (width * height) as usize;
    
    for i in (0..total_pixels).step_by(sample_rate) {
        let offset = i * 4; // RGBA
        if offset + 3 < pixels.len() {
            hasher.update(&pixels[offset..offset + 4]);
        }
    }
    
    bytes_to_hex(&hasher.finalize())
}

/// Audio fingerprinting helper - hash audio data
#[wasm_bindgen]
pub fn hash_audio_data(samples: &[f32]) -> String {
    let mut hasher = Sha256::new();
    
    // Convert float samples to bytes and hash
    for sample in samples.iter().step_by(100) {
        hasher.update(&sample.to_le_bytes());
    }
    
    bytes_to_hex(&hasher.finalize())
}

/// Generate a unique ID from multiple fingerprint components
#[wasm_bindgen]
pub fn generate_fingerprint_id(components: Vec<String>) -> String {
    let mut hasher = Sha256::new();
    
    for component in components {
        hasher.update(component.as_bytes());
        hasher.update(b"|"); // Separator
    }
    
    bytes_to_hex(&hasher.finalize())
}
