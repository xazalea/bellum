use wasm_bindgen::prelude::*;
use flate2::write::{GzEncoder, GzDecoder};
use flate2::Compression as GzCompression;
use std::io::Write;

/// Compression algorithm types
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum Algorithm {
    Gzip = 0,
    Zstd = 1,
    Lz4 = 2,
}

/// Compress data using the specified algorithm
#[wasm_bindgen]
pub fn compress(data: &[u8], algorithm: Algorithm, level: u8) -> Result<Vec<u8>, JsValue> {
    match algorithm {
        Algorithm::Gzip => compress_gzip(data, level),
        Algorithm::Zstd => compress_zstd(data, level),
        Algorithm::Lz4 => compress_lz4(data),
    }
}

/// Decompress data using the specified algorithm
#[wasm_bindgen]
pub fn decompress(data: &[u8], algorithm: Algorithm) -> Result<Vec<u8>, JsValue> {
    match algorithm {
        Algorithm::Gzip => decompress_gzip(data),
        Algorithm::Zstd => decompress_zstd(data),
        Algorithm::Lz4 => decompress_lz4(data),
    }
}

fn compress_gzip(data: &[u8], level: u8) -> Result<Vec<u8>, JsValue> {
    let compression_level = match level {
        0..=9 => GzCompression::new(level as u32),
        _ => GzCompression::default(),
    };
    
    let mut encoder = GzEncoder::new(Vec::new(), compression_level);
    encoder.write_all(data)
        .map_err(|e| JsValue::from_str(&format!("Gzip compression failed: {}", e)))?;
    
    encoder.finish()
        .map_err(|e| JsValue::from_str(&format!("Gzip finalization failed: {}", e)))
}

fn decompress_gzip(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    let mut decoder = GzDecoder::new(Vec::new());
    decoder.write_all(data)
        .map_err(|e| JsValue::from_str(&format!("Gzip decompression failed: {}", e)))?;
    
    decoder.finish()
        .map_err(|e| JsValue::from_str(&format!("Gzip finalization failed: {}", e)))
}

fn compress_zstd(data: &[u8], level: u8) -> Result<Vec<u8>, JsValue> {
    let level = level.min(22).max(1) as i32; // zstd levels: 1-22
    zstd::encode_all(data, level)
        .map_err(|e| JsValue::from_str(&format!("Zstd compression failed: {}", e)))
}

fn decompress_zstd(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    zstd::decode_all(data)
        .map_err(|e| JsValue::from_str(&format!("Zstd decompression failed: {}", e)))
}

fn compress_lz4(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    lz4::block::compress(data, None, true)
        .map_err(|e| JsValue::from_str(&format!("LZ4 compression failed: {}", e)))
}

fn decompress_lz4(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    lz4::block::decompress(data, None)
        .map_err(|e| JsValue::from_str(&format!("LZ4 decompression failed: {}", e)))
}

/// Get compression ratio (compressed_size / original_size)
#[wasm_bindgen]
pub fn compression_ratio(original_size: usize, compressed_size: usize) -> f64 {
    if original_size == 0 {
        return 1.0;
    }
    compressed_size as f64 / original_size as f64
}

/// Estimate compressed size for an algorithm
#[wasm_bindgen]
pub fn estimate_compressed_size(original_size: usize, algorithm: Algorithm) -> usize {
    // Conservative estimates based on typical compression ratios
    match algorithm {
        Algorithm::Gzip => (original_size as f64 * 0.35) as usize, // ~65% reduction
        Algorithm::Zstd => (original_size as f64 * 0.25) as usize, // ~75% reduction
        Algorithm::Lz4 => (original_size as f64 * 0.50) as usize,  // ~50% reduction
    }
}
