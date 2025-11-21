using Microsoft.AspNetCore.Mvc;
using Bellum.Backend.Services;
using Bellum.Backend.Models;

namespace Bellum.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmulatorController : ControllerBase
{
    private readonly EmulatorService _emulatorService;
    private readonly FileProcessingService _fileProcessingService;
    private readonly ILogger<EmulatorController> _logger;

    public EmulatorController(
        EmulatorService emulatorService,
        FileProcessingService fileProcessingService,
        ILogger<EmulatorController> logger)
    {
        _emulatorService = emulatorService;
        _fileProcessingService = fileProcessingService;
        _logger = logger;
    }

    [HttpPost("process-disk-image")]
    public async Task<IActionResult> ProcessDiskImage([FromBody] DiskImageRequest request)
    {
        try
        {
            var result = await _fileProcessingService.ProcessDiskImageAsync(
                request.Url,
                request.Format,
                request.TargetFormat
            );
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing disk image");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("optimize-state")]
    public async Task<IActionResult> OptimizeState([FromBody] StateOptimizationRequest request)
    {
        try
        {
            var optimized = await _emulatorService.OptimizeStateAsync(
                request.StateData,
                request.CompressionLevel
            );
            return Ok(new { optimizedState = Convert.ToBase64String(optimized) });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error optimizing state");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("extract-app")]
    public async Task<IActionResult> ExtractApp([FromBody] AppExtractionRequest request)
    {
        try
        {
            var result = await _fileProcessingService.ExtractAppAsync(
                request.Url,
                request.AppType
            );
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting app");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("patch-compatibility")]
    public async Task<IActionResult> PatchCompatibility([FromBody] CompatibilityPatchRequest request)
    {
        try
        {
            var patched = await _fileProcessingService.ApplyCompatibilityPatchAsync(
                request.Url,
                request.Platform,
                request.Patches
            );
            return Ok(new { patchedUrl = patched });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying compatibility patch");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}

