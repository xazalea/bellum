using Bellum.Backend.Models;
using Bellum.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bellum.Backend.Controllers;

[ApiController]
[Route("api/uploads")]
public class UploadsController : ControllerBase
{
    private readonly UploadStorageService _uploads;

    public UploadsController(UploadStorageService uploads)
    {
        _uploads = uploads;
    }

    private string RequireUserId()
    {
        // For now, use Firebase UID if present; otherwise allow explicit header (dev).
        var uid = User?.FindFirst("user_id")?.Value
                  ?? User?.FindFirst("sub")?.Value
                  ?? Request.Headers["X-Nacho-UserId"].ToString();
        if (string.IsNullOrWhiteSpace(uid)) throw new UnauthorizedAccessException("Missing user id");
        return uid;
    }

    [HttpPost("init")]
    public ActionResult<UploadInitResponse> Init([FromBody] UploadInitRequest req)
    {
        try
        {
            var userId = RequireUserId();
            return Ok(_uploads.Init(userId, req));
        }
        catch (Exception e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    [HttpPut("{id}/chunk/{n:int}")]
    public async Task<IActionResult> PutChunk([FromRoute] string id, [FromRoute] int n)
    {
        try
        {
            var userId = RequireUserId();
            var hash = Request.Headers["X-Chunk-Sha256"].ToString();
            await _uploads.PutChunkAsync(userId, id, n, Request.Body, string.IsNullOrWhiteSpace(hash) ? null : hash);
            return Ok(new { ok = true });
        }
        catch (UnauthorizedAccessException e)
        {
            return Unauthorized(new { error = e.Message });
        }
        catch (Exception e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    [HttpPost("{id}/complete")]
    public async Task<ActionResult<UploadCompleteResponse>> Complete([FromRoute] string id)
    {
        try
        {
            var userId = RequireUserId();
            var res = await _uploads.CompleteAsync(userId, new UploadCompleteRequest(id));
            return Ok(res);
        }
        catch (UnauthorizedAccessException e)
        {
            return Unauthorized(new { error = e.Message });
        }
        catch (Exception e)
        {
            return BadRequest(new { error = e.Message });
        }
    }
}

