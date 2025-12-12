using Bellum.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bellum.Backend.Controllers;

[ApiController]
[Route("api/files")]
public class FilesController : ControllerBase
{
    private readonly UploadStorageService _uploads;

    public FilesController(UploadStorageService uploads)
    {
        _uploads = uploads;
    }

    private string RequireUserId()
    {
        var uid = User?.FindFirst("user_id")?.Value
                  ?? User?.FindFirst("sub")?.Value
                  ?? Request.Headers["X-Nacho-UserId"].ToString();
        if (string.IsNullOrWhiteSpace(uid)) throw new UnauthorizedAccessException("Missing user id");
        return uid;
    }

    [HttpGet("{fileId}/manifest")]
    public IActionResult Manifest([FromRoute] string fileId)
    {
        try
        {
            var userId = RequireUserId();
            return Ok(_uploads.GetManifest(userId, fileId));
        }
        catch (UnauthorizedAccessException e)
        {
            return Unauthorized(new { error = e.Message });
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
            var userId = RequireUserId();
            var stream = _uploads.OpenChunkRead(userId, fileId, n);
            return File(stream, "application/octet-stream", enableRangeProcessing: true);
        }
        catch (UnauthorizedAccessException e)
        {
            return Unauthorized(new { error = e.Message });
        }
        catch (Exception e)
        {
            return NotFound(new { error = e.Message });
        }
    }
}


