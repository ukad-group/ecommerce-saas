namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Photo provider configuration. On save, an empty ConnectionString means "keep the stored one".
/// </summary>
public class PhotoProviderSettings
{
    public string? ProviderKey { get; set; }
    public string? ConnectionString { get; set; }
    public string ContainerName { get; set; } = string.Empty;
}

/// <summary>
/// Settings as returned to the backoffice — never contains the secret.
/// </summary>
public class PhotoProviderSettingsDto
{
    public string? ProviderKey { get; set; }
    public string ContainerName { get; set; } = string.Empty;
    public bool ConnectionStringSet { get; set; }
}

public class PhotoItem
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public long? Size { get; set; }
    public DateTimeOffset? LastModified { get; set; }
}

public class PhotoPage
{
    public List<PhotoItem> Items { get; set; } = new();

    /// <summary>Opaque forward-only token; null when there are no more pages.</summary>
    public string? ContinuationToken { get; set; }
}

public class PhotoTestResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
