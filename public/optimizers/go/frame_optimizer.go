package main

import (
	"sync"
)

// OptimizeFrame processes frame data in parallel using goroutines
// Optimized for WebAssembly execution
func OptimizeFrame(data []byte, width, height int) []byte {
	optimized := make([]byte, len(data))
	chunkSize := len(data) / 4
	var wg sync.WaitGroup
	
	// Process in 4 parallel chunks
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func(start int) {
			defer wg.Done()
			end := start + chunkSize
			if end > len(data) {
				end = len(data)
			}
			
			// Apply optimizations to chunk
			for j := start; j < end; j += 4 {
				if j+3 >= len(data) {
					break
				}
				
				// RGBA values
				r, g, b, a := data[j], data[j+1], data[j+2], data[j+3]
				
				// Fast gamma correction (2.2 gamma)
				optimized[j] = gammaCorrect(r)
				optimized[j+1] = gammaCorrect(g)
				optimized[j+2] = gammaCorrect(b)
				optimized[j+3] = a // Alpha unchanged
			}
		}(i * chunkSize)
	}
	
	wg.Wait()
	return optimized
}

// gammaCorrect applies fast gamma 2.2 correction
func gammaCorrect(v byte) byte {
	// Fast approximation: v^2.2 ≈ v * 1.8 (linear approximation)
	val := float64(v) * 1.8
	if val > 255 {
		return 255
	}
	return byte(val)
}

// ApplyDithering applies Floyd-Steinberg dithering for better color depth
func ApplyDithering(data []byte, width, height int) []byte {
	output := make([]byte, len(data))
	copy(output, data)
	
	for y := 0; y < height-1; y++ {
		for x := 1; x < width-1; x++ {
			idx := (y*width + x) * 4
			if idx+3 >= len(output) {
				continue
			}
			
			oldR := int(output[idx])
			oldG := int(output[idx+1])
			oldB := int(output[idx+2])
			
			// Quantize to 8 levels
			newR := (oldR / 32) * 32
			newG := (oldG / 32) * 32
			newB := (oldB / 32) * 32
			
			output[idx] = byte(newR)
			output[idx+1] = byte(newG)
			output[idx+2] = byte(newB)
			
			// Distribute error
			errR := oldR - newR
			errG := oldG - newG
			errB := oldB - newB
			
			// Right pixel
			if idx+4 < len(output) {
				output[idx+4] = clamp(int(output[idx+4]) + errR*7/16)
				output[idx+5] = clamp(int(output[idx+5]) + errG*7/16)
				output[idx+6] = clamp(int(output[idx+6]) + errB*7/16)
			}
			
			// Bottom-left pixel
			if idx+width*4-4 >= 0 && idx+width*4-4 < len(output) {
				output[idx+width*4-4] = clamp(int(output[idx+width*4-4]) + errR*3/16)
				output[idx+width*4-3] = clamp(int(output[idx+width*4-3]) + errG*3/16)
				output[idx+width*4-2] = clamp(int(output[idx+width*4-2]) + errB*3/16)
			}
			
			// Bottom pixel
			if idx+width*4 < len(output) {
				output[idx+width*4] = clamp(int(output[idx+width*4]) + errR*5/16)
				output[idx+width*4+1] = clamp(int(output[idx+width*4+1]) + errG*5/16)
				output[idx+width*4+2] = clamp(int(output[idx+width*4+2]) + errB*5/16)
			}
			
			// Bottom-right pixel
			if idx+width*4+4 < len(output) {
				output[idx+width*4+4] = clamp(int(output[idx+width*4+4]) + errR*1/16)
				output[idx+width*4+5] = clamp(int(output[idx+width*4+5]) + errG*1/16)
				output[idx+width*4+6] = clamp(int(output[idx+width*4+6]) + errB*1/16)
			}
		}
	}
	
	return output
}

func clamp(v int) byte {
	if v < 0 {
		return 0
	}
	if v > 255 {
		return 255
	}
	return byte(v)
}

