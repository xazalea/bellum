/**
 * Custom WASM Neural Codec - C Implementation
 * Tiny autoencoder for ultra-compact compression
 * 
 * To compile:
 * emcc wasm-codec.c -O3 -s WASM=1 -s EXPORTED_FUNCTIONS='["_malloc","_free","_encode","_decode","_init_model"]' -o wasm-codec.wasm
 */

#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#define MAX_LATENT_DIM 512
#define MAX_INPUT_SIZE 8192

// Neural network weights (quantized 4-bit)
static uint8_t encoder_weights[50 * 1024]; // 50KB
static uint8_t decoder_weights[50 * 1024]; // 50KB
static int latent_dim = 256;

// Activation functions
static inline float relu(float x) {
    return x > 0 ? x : 0;
}

static inline float sigmoid(float x) {
    return 1.0f / (1.0f + expf(-x));
}

static inline float tanh_approx(float x) {
    // Fast tanh approximation
    if (x < -3.0f) return -1.0f;
    if (x > 3.0f) return 1.0f;
    return x * (27.0f + x * x) / (27.0f + 9.0f * x * x);
}

// Dequantize 4-bit weights to float
static float dequantize_weight(uint8_t packed, int index) {
    uint8_t value = (index & 1) ? (packed >> 4) : (packed & 0x0F);
    // Map 0-15 to -1.0 to 1.0
    return (value / 7.5f) - 1.0f;
}

// Simple matrix multiplication
static void matmul(const float* input, int input_size, 
                   const uint8_t* weights, int output_size,
                   float* output) {
    for (int i = 0; i < output_size; i++) {
        float sum = 0.0f;
        for (int j = 0; j < input_size; j++) {
            int weight_index = i * input_size + j;
            float weight = dequantize_weight(weights[weight_index / 2], weight_index);
            sum += input[j] * weight;
        }
        output[i] = sum;
    }
}

/**
 * Initialize model with pre-trained weights
 */
void init_model(const uint8_t* weights_data, int size) {
    // Split weights between encoder and decoder
    int encoder_size = size / 2;
    memcpy(encoder_weights, weights_data, encoder_size);
    memcpy(decoder_weights, weights_data + encoder_size, encoder_size);
}

/**
 * Encode data to latent vector
 * 
 * Simplified architecture:
 * Input -> FC(512) -> ReLU -> FC(latent_dim) -> Tanh -> Latent
 */
void encode(const uint8_t* input, int input_size, 
            float* latent, int latent_size) {
    // Normalize input to 0-1
    float normalized[MAX_INPUT_SIZE];
    for (int i = 0; i < input_size && i < MAX_INPUT_SIZE; i++) {
        normalized[i] = input[i] / 255.0f;
    }
    
    // Hidden layer (512 neurons)
    float hidden[512];
    matmul(normalized, input_size, encoder_weights, 512, hidden);
    
    // Apply ReLU
    for (int i = 0; i < 512; i++) {
        hidden[i] = relu(hidden[i]);
    }
    
    // Latent layer
    matmul(hidden, 512, encoder_weights + (512 * input_size / 2), latent_size, latent);
    
    // Apply Tanh
    for (int i = 0; i < latent_size; i++) {
        latent[i] = tanh_approx(latent[i]);
    }
}

/**
 * Decode latent vector to data
 * 
 * Simplified architecture:
 * Latent -> FC(512) -> ReLU -> FC(output_size) -> Sigmoid -> Output
 */
void decode(const float* latent, int latent_size,
            uint8_t* output, int output_size) {
    // Hidden layer (512 neurons)
    float hidden[512];
    matmul(latent, latent_size, decoder_weights, 512, hidden);
    
    // Apply ReLU
    for (int i = 0; i < 512; i++) {
        hidden[i] = relu(hidden[i]);
    }
    
    // Output layer
    float output_float[MAX_INPUT_SIZE];
    matmul(hidden, 512, decoder_weights + (512 * latent_size / 2), output_size, output_float);
    
    // Apply Sigmoid and denormalize
    for (int i = 0; i < output_size && i < MAX_INPUT_SIZE; i++) {
        float value = sigmoid(output_float[i]);
        output[i] = (uint8_t)(value * 255.0f);
    }
}

// Memory management (required by WASM)
void* malloc(size_t size) {
    return __builtin_wasm_memory_grow(0, (size + 65535) / 65536) * 65536;
}

void free(void* ptr) {
    // Simplified: no actual freeing in this stub
    (void)ptr;
}
