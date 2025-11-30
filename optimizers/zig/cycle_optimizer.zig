// Cycle Optimizer - Zig implementation for emulator cycle optimization
// Compiles to WebAssembly for browser execution

const std = @import("std");

// OptimizeCycleTiming calculates optimal frame timing based on cycle history
export fn optimize_cycle_timing(cycle_times: [*]f64, count: usize) f64 {
    if (count == 0) return 16.67; // Default 60 FPS
    
    var sum: f64 = 0;
    var min: f64 = std.math.f64_max;
    var max: f64 = 0;
    
    // Calculate statistics
    var i: usize = 0;
    while (i < count) : (i += 1) {
        const time = cycle_times[i];
        sum += time;
        if (time < min) min = time;
        if (time > max) max = time;
    }
    
    const avg = sum / @as(f64, @floatFromInt(count));
    
    // Use median of recent values for stability
    const recent_count = if (count > 10) 10 else count;
    const recent_start = count - recent_count;
    
    var recent_sum: f64 = 0;
    i = recent_start;
    while (i < count) : (i += 1) {
        recent_sum += cycle_times[i];
    }
    
    const recent_avg = recent_sum / @as(f64, @floatFromInt(recent_count));
    
    // Predict next cycle time (exponential moving average)
    return recent_avg * 0.7 + avg * 0.3;
}

// CalculateFrameSkip determines optimal frame skip based on performance
export fn calculate_frame_skip(current_fps: f64, target_fps: f64) u32 {
    if (current_fps >= target_fps) return 0;
    
    const ratio = target_fps / current_fps;
    const skip = @as(u32, @intFromFloat((ratio - 1.0) * 2.0));
    
    // Cap at 2 frames max
    return if (skip > 2) 2 else skip;
}

// OptimizeMemoryAllocation calculates optimal memory allocation
export fn optimize_memory_allocation(current: u64, target: u64) u64 {
    const ratio = @as(f64, @floatFromInt(current)) / @as(f64, @floatFromInt(target));
    
    // If over 120% of target, suggest 90% of target
    if (ratio > 1.2) {
        return @as(u64, @intFromFloat(@as(f64, @floatFromInt(target)) * 0.9));
    }
    
    // Otherwise, maintain current
    return current;
}

