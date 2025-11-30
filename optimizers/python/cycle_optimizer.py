# Cycle Optimizer - Python implementation for emulator cycle prediction
# Uses Pyodide for browser execution

import statistics
import json

def optimize_cycles(history):
    """
    Optimize emulator cycles based on performance history.
    
    Args:
        history: List of cycle times in milliseconds
        
    Returns:
        dict with predicted cycle time and optimal frame skip
    """
    if not history:
        return {"predicted": 16.67, "skip": 0, "fps": 60}
    
    # Use recent history for better prediction
    recent = history[-10:] if len(history) > 10 else history
    
    # Calculate statistics
    avg = statistics.mean(recent)
    median = statistics.median(recent)
    
    # Use weighted average (recent values more important)
    if len(recent) > 5:
        weights = [0.1, 0.15, 0.2, 0.25, 0.3]  # Last 5 frames weighted
        weighted_sum = sum(recent[-i-1] * weights[i] for i in range(min(5, len(recent))))
        predicted = weighted_sum / sum(weights[:min(5, len(recent))])
    else:
        predicted = avg
    
    # Calculate optimal frame skip
    target_fps = 60
    current_fps = 1000 / predicted if predicted > 0 else 60
    
    # Determine frame skip based on FPS difference
    if current_fps < target_fps * 0.8:  # Less than 48 FPS
        skip = 2
    elif current_fps < target_fps * 0.9:  # Less than 54 FPS
        skip = 1
    else:
        skip = 0
    
    return {
        "predicted": round(predicted, 2),
        "skip": skip,
        "fps": round(current_fps, 2),
        "avg": round(avg, 2),
        "median": round(median, 2)
    }

def predict_next_cycle(history):
    """
    Predict the next cycle time using exponential moving average.
    """
    if not history:
        return 16.67
    
    alpha = 0.3  # Smoothing factor
    predicted = history[0]
    
    for cycle_time in history[1:]:
        predicted = alpha * cycle_time + (1 - alpha) * predicted
    
    return predicted

def calculate_optimal_settings(history, target_fps=60):
    """
    Calculate optimal emulator settings based on performance.
    """
    if not history:
        return {
            "frame_skip": 0,
            "render_scale": 1.0,
            "texture_scale": 1.0
        }
    
    recent = history[-10:] if len(history) > 10 else history
    avg_fps = 1000 / statistics.mean(recent) if statistics.mean(recent) > 0 else 60
    
    # Calculate frame skip
    if avg_fps < target_fps * 0.7:
        frame_skip = 2
        render_scale = 0.75
        texture_scale = 0.75
    elif avg_fps < target_fps * 0.85:
        frame_skip = 1
        render_scale = 0.85
        texture_scale = 0.85
    elif avg_fps < target_fps * 0.95:
        frame_skip = 0
        render_scale = 0.95
        texture_scale = 0.95
    else:
        frame_skip = 0
        render_scale = 1.0
        texture_scale = 1.0
    
    return {
        "frame_skip": frame_skip,
        "render_scale": render_scale,
        "texture_scale": texture_scale,
        "current_fps": round(avg_fps, 2)
    }

