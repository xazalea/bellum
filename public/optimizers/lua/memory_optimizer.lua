-- Memory Optimizer - Lua implementation for lightweight memory management
-- Uses Fengari for browser execution

-- Optimize memory allocation based on current and target usage
function optimize_memory(current, target)
    local ratio = current / target
    local should_gc = ratio > 1.2  -- GC if 20% over target
    local target_alloc = target * 0.9  -- Aim for 90% of target
    
    return {
        gc = should_gc,
        alloc = math.floor(target_alloc),
        ratio = ratio,
        status = ratio > 1.2 and "high" or (ratio > 1.0 and "warning" or "normal")
    }
end

-- Calculate memory pressure score
function memory_pressure(current, target, max)
    local usage_ratio = current / target
    local max_ratio = max and (current / max) or 1.0
    
    local pressure = 0
    if usage_ratio > 1.5 then
        pressure = 100  -- Critical
    elseif usage_ratio > 1.2 then
        pressure = 75   -- High
    elseif usage_ratio > 1.0 then
        pressure = 50   -- Warning
    else
        pressure = 25   -- Normal
    end
    
    -- Adjust for max memory
    if max_ratio > 0.9 then
        pressure = math.min(100, pressure + 20)
    end
    
    return pressure
end

-- Suggest memory optimizations
function suggest_memory_optimizations(current, target, max)
    local ratio = current / target
    local suggestions = {}
    
    if ratio > 1.5 then
        table.insert(suggestions, "Critical: Immediate garbage collection needed")
        table.insert(suggestions, "Pause non-essential VMs")
        table.insert(suggestions, "Reduce VM memory allocation")
    elseif ratio > 1.2 then
        table.insert(suggestions, "High memory usage: Consider GC")
        table.insert(suggestions, "Reduce texture quality")
    elseif ratio > 1.0 then
        table.insert(suggestions, "Memory usage above target")
        table.insert(suggestions, "Monitor memory growth")
    else
        table.insert(suggestions, "Memory usage normal")
    end
    
    return suggestions
end

-- Calculate optimal allocation for multiple VMs
function optimize_vm_allocations(total_memory, vm_count, priorities)
    priorities = priorities or {}
    local base_allocation = total_memory / vm_count
    local allocations = {}
    
    for i = 1, vm_count do
        local priority = priorities[i] or 1.0
        allocations[i] = math.floor(base_allocation * priority)
    end
    
    return allocations
end

