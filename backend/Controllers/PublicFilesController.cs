using Bellum.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bellum.Backend.Controllers;

[ApiController]
[Route("api/public/files")]
public class PublicFilesController : ControllerBase
{
    private readonly UploadStorageService _uploads;

    public PublicFilesController(UploadStorageService uploads)
    {
        _uploads = uploads;
    }

    [HttpGet("{fileId}/manifest")]
    public IActionResult Manifest([FromRoute] string fileId)
    {
        try
        {
            return Ok(_uploads.GetPublicManifest(fileId));
        }
        catch (Exception e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    [HttpGet("{fileId}/chunk/{n:int}")]
    public IActionResult Chunk([FromRoute] string fileId, [FromRoute] int n)
    {
        try
        {
            var stream = _uploads.OpenPublicChunkRead(fileId, n);
            return File(stream, "application/octet-stream", enableRangeProcessing: true);
        }
        catch (Exception e)
        {
            return NotFound(new { error = e.Message });
        }
    }
}


