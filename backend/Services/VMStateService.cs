namespace Bellum.Backend.Services;

public class VMStateService
{
    private readonly EmulatorService _emulatorService;
    private readonly ILogger<VMStateService> _logger;

    public VMStateService(EmulatorService emulatorService, ILogger<VMStateService> logger)
    {
        _emulatorService = emulatorService;
        _logger = logger;
    }

    public async Task<string> SaveStateAsync(string vmId, byte[] stateData)
    {
        // Optimize state
        var optimized = await _emulatorService.OptimizeStateAsync(stateData);
        
        // Calculate hash for deduplication
        var hash = _emulatorService.CalculateStateHash(optimized);
        
        // In production, save to storage (Puter.js or other)
        _logger.LogInformation($"Saved state for VM {vmId}, hash: {hash}");
        
        return hash;
    }

    public async Task<byte[]?> LoadStateAsync(string vmId, string stateHash)
    {
        // In production, load from storage
        _logger.LogInformation($"Loading state for VM {vmId}, hash: {stateHash}");
        
        // Return null if not found
        return null;
    }
}

