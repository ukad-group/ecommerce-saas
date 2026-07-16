using EComm.Umbraco.Commerce.Models;

namespace EComm.Umbraco.Commerce.Services;

/// <summary>
/// A pluggable external photo source. Implementations are stateless singletons;
/// credentials are passed per call so only one provider is ever "active" (the one
/// matching the stored settings' ProviderKey).
/// </summary>
public interface IPhotoStorageProvider
{
    /// <summary>Stable identifier stored in settings (e.g. "azure-blob").</summary>
    string Key { get; }

    string DisplayName { get; }

    Task<PhotoTestResult> TestConnectionAsync(PhotoProviderSettings settings);

    /// <summary>Lists photos one page at a time. Pass null token for the first page.</summary>
    Task<PhotoPage> ListPhotosAsync(PhotoProviderSettings settings, string? continuationToken, int pageSize);

    /// <summary>Uploads a photo and returns its publicly resolvable URL.</summary>
    Task<string> UploadAsync(PhotoProviderSettings settings, Stream content, string fileName, string contentType);
}
