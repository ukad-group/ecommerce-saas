using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using EComm.Umbraco.Commerce.Models;

namespace EComm.Umbraco.Commerce.Services;

/// <summary>
/// Photo provider backed by an Azure Blob Storage container.
/// Blob URLs are returned as-is, so the container is expected to allow public blob read.
/// </summary>
public class AzureBlobPhotoProvider : IPhotoStorageProvider
{
    private static readonly string[] ImageExtensions =
        { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg" };

    public string Key => "azure-blob";

    public string DisplayName => "Azure Blob Storage";

    public async Task<PhotoTestResult> TestConnectionAsync(PhotoProviderSettings settings)
    {
        try
        {
            var container = GetContainer(settings);
            var exists = await container.ExistsAsync();
            return exists
                ? new PhotoTestResult { Success = true, Message = $"Connected. Container '{settings.ContainerName}' found." }
                : new PhotoTestResult { Success = false, Message = $"Connected, but container '{settings.ContainerName}' does not exist." };
        }
        catch (FormatException)
        {
            // Never echo the connection string back
            return new PhotoTestResult { Success = false, Message = "The connection string is malformed." };
        }
        catch (RequestFailedException ex)
        {
            return new PhotoTestResult { Success = false, Message = $"Azure request failed ({ex.Status}): {ex.ErrorCode}" };
        }
        catch (Exception ex) when (ex is AggregateException or TaskCanceledException or HttpRequestException)
        {
            return new PhotoTestResult { Success = false, Message = "Could not reach the storage account (network error or bad endpoint)." };
        }
    }

    public async Task<PhotoPage> ListPhotosAsync(PhotoProviderSettings settings, string? continuationToken, int pageSize)
    {
        var container = GetContainer(settings);

        await foreach (Page<BlobItem> page in container.GetBlobsAsync()
            .AsPages(continuationToken, pageSizeHint: pageSize))
        {
            // pageSizeHint applies before the extension filter, so a page may hold fewer items
            return new PhotoPage
            {
                Items = page.Values
                    .Where(b => ImageExtensions.Contains(Path.GetExtension(b.Name), StringComparer.OrdinalIgnoreCase))
                    .Select(b => new PhotoItem
                    {
                        Name = b.Name,
                        Url = container.GetBlobClient(b.Name).Uri.ToString(),
                        Size = b.Properties.ContentLength,
                        LastModified = b.Properties.LastModified,
                    })
                    .ToList(),
                ContinuationToken = string.IsNullOrEmpty(page.ContinuationToken) ? null : page.ContinuationToken,
            };
        }

        return new PhotoPage();
    }

    public async Task<string> UploadAsync(PhotoProviderSettings settings, Stream content, string fileName, string contentType)
    {
        var container = GetContainer(settings);
        var options = new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
            Conditions = new BlobRequestConditions { IfNoneMatch = ETag.All }, // fail instead of overwriting
        };

        var blob = container.GetBlobClient(fileName);
        try
        {
            await blob.UploadAsync(content, options);
        }
        catch (RequestFailedException ex) when (ex.Status == 409)
        {
            var unique = $"{Path.GetFileNameWithoutExtension(fileName)}-{Guid.NewGuid():N}{Path.GetExtension(fileName)}";
            blob = container.GetBlobClient(unique);
            await blob.UploadAsync(content, options);
        }

        return blob.Uri.ToString();
    }

    private static BlobContainerClient GetContainer(PhotoProviderSettings settings)
        => new(settings.ConnectionString, settings.ContainerName);
}
