using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;

namespace MockApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class FilesController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public FilesController(IWebHostEnvironment environment, IConfiguration configuration)
    {
        _environment = environment;
        _configuration = configuration;
    }

    /// <summary>
    /// Upload one or more image files
    /// </summary>
    /// <param name="files">Image files to upload</param>
    /// <param name="tenantId">Tenant ID (from header)</param>
    /// <param name="marketId">Market ID (from header)</param>
    /// <param name="userId">User ID (from header, required for authentication)</param>
    /// <returns>List of uploaded file URLs</returns>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<UploadResponse>> UploadFiles(
        [FromForm] IFormFileCollection files,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId = null,
        [FromHeader(Name = "X-Market-ID")] string? marketId = null,
        [FromHeader(Name = "X-User-ID")] string? userId = null)
    {
        if (files == null || files.Count == 0)
        {
            return BadRequest(new { message = "No files provided" });
        }

        // Validate authentication
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "X-User-ID header is required for authentication" });
        }

        // Validate tenant and market
        if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(marketId))
        {
            return BadRequest(new { message = "X-Tenant-ID and X-Market-ID headers are required" });
        }

        var uploadedUrls = new List<string>();
        var errors = new List<string>();

        // Create uploads directory if it doesn't exist
        var uploadsPath = Path.Combine(_environment.ContentRootPath, "uploads", tenantId, marketId);
        Directory.CreateDirectory(uploadsPath);

        foreach (var file in files)
        {
            try
            {
                // Validate file
                if (file.Length == 0)
                {
                    errors.Add($"{file.FileName}: File is empty");
                    continue;
                }

                // Validate file size (max 5MB)
                if (file.Length > 5 * 1024 * 1024)
                {
                    errors.Add($"{file.FileName}: File size exceeds 5MB limit");
                    continue;
                }

                // Validate file type (only images)
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(extension))
                {
                    errors.Add($"{file.FileName}: Invalid file type. Allowed types: jpg, jpeg, png, gif, webp");
                    continue;
                }

                // Generate unique filename
                var fileName = $"{Guid.NewGuid()}{extension}";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Save file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Generate URL
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var fileUrl = $"{baseUrl}/uploads/{tenantId}/{marketId}/{fileName}";
                uploadedUrls.Add(fileUrl);
            }
            catch (Exception ex)
            {
                errors.Add($"{file.FileName}: {ex.Message}");
            }
        }

        return Ok(new UploadResponse
        {
            Urls = uploadedUrls,
            Errors = errors.Count > 0 ? errors : null
        });
    }

    /// <summary>
    /// Get a resized image with specified dimensions
    /// </summary>
    /// <param name="tenantId">Tenant ID</param>
    /// <param name="marketId">Market ID</param>
    /// <param name="fileName">File name</param>
    /// <param name="width">Maximum width (optional)</param>
    /// <param name="height">Maximum height (optional)</param>
    /// <returns>Resized image</returns>
    [HttpGet("resize/{tenantId}/{marketId}/{fileName}")]
    [ResponseCache(Duration = 604800)] // Cache for 7 days
    public async Task<IActionResult> GetResizedImage(
        string tenantId,
        string marketId,
        string fileName,
        [FromQuery] int? width = null,
        [FromQuery] int? height = null)
    {
        var filePath = Path.Combine(_environment.ContentRootPath, "uploads", tenantId, marketId, fileName);

        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "File not found" });
        }

        // If no dimensions specified, return original file
        if (!width.HasValue && !height.HasValue)
        {
            var originalBytes = await System.IO.File.ReadAllBytesAsync(filePath);
            return File(originalBytes, GetContentType(fileName));
        }

        try
        {
            using var image = await Image.LoadAsync(filePath);

            // Calculate resize dimensions maintaining aspect ratio
            var resizeOptions = new ResizeOptions
            {
                Mode = ResizeMode.Max,
                Size = new Size(width ?? image.Width, height ?? image.Height)
            };

            image.Mutate(x => x.Resize(resizeOptions));

            using var memoryStream = new MemoryStream();
            await image.SaveAsJpegAsync(memoryStream, new JpegEncoder { Quality = 85 });
            memoryStream.Position = 0;

            return File(memoryStream.ToArray(), "image/jpeg");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Error resizing image: {ex.Message}" });
        }
    }

    /// <summary>
    /// Delete an uploaded file
    /// </summary>
    /// <param name="fileName">File name to delete</param>
    /// <param name="tenantId">Tenant ID (from header)</param>
    /// <param name="marketId">Market ID (from header)</param>
    /// <param name="userId">User ID (from header, required for authentication)</param>
    [HttpDelete("{fileName}")]
    public ActionResult DeleteFile(
        string fileName,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId = null,
        [FromHeader(Name = "X-Market-ID")] string? marketId = null,
        [FromHeader(Name = "X-User-ID")] string? userId = null)
    {
        // Validate authentication
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "X-User-ID header is required for authentication" });
        }

        if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(marketId))
        {
            return BadRequest(new { message = "X-Tenant-ID and X-Market-ID headers are required" });
        }

        var filePath = Path.Combine(_environment.ContentRootPath, "uploads", tenantId, marketId, fileName);

        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "File not found" });
        }

        try
        {
            System.IO.File.Delete(filePath);
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Error deleting file: {ex.Message}" });
        }
    }

    private string GetContentType(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
    }
}

public class UploadResponse
{
    public List<string> Urls { get; set; } = new();
    public List<string>? Errors { get; set; }
}
