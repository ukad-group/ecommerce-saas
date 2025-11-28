namespace EComm.Api.DTOs.Responses.Files;

public class UploadResponse
{
    public List<string> Urls { get; set; } = new();
    public List<string>? Errors { get; set; }
}
