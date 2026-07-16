using System.Text.Json;
using System.Text.Json.Serialization;

namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// A product image with optional metadata, mirroring the eCommerce API contract. Deserializes from
/// either a bare URL string (legacy) or an object, so responses in either shape are tolerated.
/// </summary>
[JsonConverter(typeof(ProductImageJsonConverter))]
public class ProductImage
{
    public string Url { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public FocalPoint? FocalPoint { get; set; }
    public List<ImageCrop>? Crops { get; set; }
    /// <summary>Source Umbraco media GUID, so the native crop/focal editor can be re-opened.</summary>
    public string? MediaKey { get; set; }

    public static implicit operator ProductImage(string url) => new() { Url = url };
}

public class FocalPoint
{
    public double Left { get; set; }
    public double Top { get; set; }
}

public class ImageCrop
{
    public string Alias { get; set; } = string.Empty;
    public int? Width { get; set; }
    public int? Height { get; set; }
    public CropCoordinates? Coordinates { get; set; }
}

public class CropCoordinates
{
    public double X1 { get; set; }
    public double Y1 { get; set; }
    public double X2 { get; set; }
    public double Y2 { get; set; }
}

/// <summary>Reads a ProductImage from a bare string or an object; always writes an object.</summary>
public class ProductImageJsonConverter : JsonConverter<ProductImage>
{
    public override ProductImage Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.Null:
                return new ProductImage();
            case JsonTokenType.String:
                return new ProductImage { Url = reader.GetString() ?? string.Empty };
            default:
                var data = JsonSerializer.Deserialize<ProductImageData>(ref reader, options) ?? new ProductImageData();
                return new ProductImage
                {
                    Url = data.Url ?? string.Empty,
                    AltText = data.AltText,
                    FocalPoint = data.FocalPoint,
                    Crops = data.Crops,
                    MediaKey = data.MediaKey
                };
        }
    }

    public override void Write(Utf8JsonWriter writer, ProductImage value, JsonSerializerOptions options)
    {
        var data = new ProductImageData
        {
            Url = value.Url,
            AltText = value.AltText,
            FocalPoint = value.FocalPoint,
            Crops = value.Crops,
            MediaKey = value.MediaKey
        };
        JsonSerializer.Serialize(writer, data, options);
    }

    private class ProductImageData
    {
        public string? Url { get; set; }
        public string? AltText { get; set; }
        public FocalPoint? FocalPoint { get; set; }
        public List<ImageCrop>? Crops { get; set; }
        public string? MediaKey { get; set; }
    }
}
