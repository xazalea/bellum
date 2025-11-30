using Microsoft.AspNetCore.Mvc;
using Bellum.Backend.Services;
using Bellum.Backend.Models;

namespace Bellum.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CodeCompilationController : ControllerBase
{
    private readonly CodeCompilationService _compilationService;
    private readonly ILogger<CodeCompilationController> _logger;

    public CodeCompilationController(
        CodeCompilationService compilationService,
        ILogger<CodeCompilationController> logger)
    {
        _compilationService = compilationService;
        _logger = logger;
    }

    [HttpPost("compile/rust")]
    public async Task<IActionResult> CompileRust([FromBody] CompileCodeRequest request)
    {
        try
        {
            var result = await _compilationService.CompileRustAsync(request.Code, request.Config);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error compiling Rust code");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("compile/zig")]
    public async Task<IActionResult> CompileZig([FromBody] CompileCodeRequest request)
    {
        try
        {
            var result = await _compilationService.CompileZigAsync(request.Code);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error compiling Zig code");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("compile/go")]
    public async Task<IActionResult> CompileGo([FromBody] CompileCodeRequest request)
    {
        try
        {
            var result = await _compilationService.CompileGoAsync(request.Code);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error compiling Go code");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}

