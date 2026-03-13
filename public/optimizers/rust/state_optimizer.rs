// State Optimizer - Rust implementation for fast VM state compression
// Compiles to WebAssembly for browser execution

#![no_main]
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn optimize_state(input: &[u8]) -> Vec<u8> {
    // Fast RLE (Run-Length Encoding) compression optimized for VM state
    let mut output = Vec::with_capacity(input.len() / 2);
    let mut i = 0;
    
    while i < input.len() {
        let byte = input[i];
        let mut count = 1;
        
        // Count consecutive identical bytes (max 255 for single byte encoding)
        while i + count < input.len() 
            && input[i + count] == byte 
            && count < 255 {
            count += 1;
        }
        
        // Encode: if 4+ consecutive bytes or zero byte, use RLE
        if count > 3 || byte == 0 {
            output.push(0); // RLE marker
            output.push(byte);
            output.push(count as u8);
        } else {
            // Store raw bytes for small runs
            for _ in 0..count {
                output.push(byte);
            }
        }
        
        i += count;
    }
    
    output
}

#[wasm_bindgen]
pub fn decompress_state(compressed: &[u8]) -> Vec<u8> {
    let mut output = Vec::new();
    let mut i = 0;
    
    while i < compressed.len() {
        if compressed[i] == 0 && i + 2 < compressed.len() {
            // RLE marker found
            let byte = compressed[i + 1];
            let count = compressed[i + 2] as usize;
            
            for _ in 0..count {
                output.push(byte);
            }
            
            i += 3;
        } else {
            // Raw byte
            output.push(compressed[i]);
            i += 1;
        }
    }
    
    output
}

#[wasm_bindgen]
pub fn deduplicate_state(state1: &[u8], state2: &[u8]) -> Vec<u8> {
    // Create delta between two states
    let min_len = state1.len().min(state2.len());
    let mut delta = Vec::new();
    
    for i in 0..min_len {
        if state1[i] != state2[i] {
            delta.push(i as u32);
            delta.push(state2[i] as u32);
        }
    }
    
    // Convert to bytes
    delta.iter().flat_map(|&v| v.to_le_bytes().to_vec()).collect()
}

