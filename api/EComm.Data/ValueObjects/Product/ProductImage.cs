using System.Text.Json;
using System.Text.Json.Serialization;

namespace EComm.Data.ValueObjects.Product;

/// <summary>
/// A product image with optional Umbraco-derived metadata (focal point, named crops, alt text).
/// Serializes as an object, but deserializes from EITHER a bare URL string (legacy shape) or an
/// object — see <see cref="ProductImageJsonConverter"/>. This keeps existing data and older
/// clients working without a database reset.
/// </summary>
[JsonConverter(typeof(ProductImageJsonConverter))]
public class ProductImage
{
    public string Url { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public FocalPoint? FocalPoint { get; set; }
    public List<ImageCrop>? Crops { get; set; }
    /// <summary>Source Umbraco media GUID, when the image came from the media library. Lets the
    /// Umbraco backoffice re-open the native crop/focal editor after a reload. Ignored elsewhere.</summary>
    public string? MediaKey { get; set; }

    /// <summary>Lets a bare URL string be used wherever a ProductImage is expected (seed data, tests).</summary>
    public static implicit operator ProductImage(string url) => new() { Url = url };

    /// <summary>Deep copy — used by product versioning so snapshots don't share mutable instances.</summary>
    public ProductImage Clone() => new()
    {
        Url = Url,
        AltText = AltText,
        FocalPoint = FocalPoint == null ? null : new FocalPoint { Left = FocalPoint.Left, Top = FocalPoint.Top },
        Crops = Crops?.Select(c => c.Clone()).ToList(),
        MediaKey = MediaKey
    };
}

/// <summary>Focal point as 0..1 fractions of width/height (matches Umbraco's image cropper).</summary>
public class FocalPoint
{
    public double Left { get; set; }
    public double Top { get; set; }
}

/// <summary>A named crop (from an Umbraco image-cropper data type), captured for future use.</summary>
public class ImageCrop
{
    public string Alias { get; set; } = string.Empty;
    public int? Width { get; set; }
    public int? Height { get; set; }
    public CropCoordinates? Coordinates { get; set; }

    public ImageCrop Clone() => new()
    {
        Alias = Alias,
        Width = Width,
        Height = Height,
        Coordinates = Coordinates == null
            ? null
            : new CropCoordinates { X1 = Coordinates.X1, Y1 = Coordinates.Y1, X2 = Coordinates.X2, Y2 = Coordinates.Y2 }
    };
}

/// <summary>Percentage crop box (0..1) as stored by Umbraco's image cropper.</summary>
public class CropCoordinates
{
    public double X1 { get; set; }
    public double Y1 { get; set; }
    public double X2 { get; set; }
    public double Y2 { get; set; }
}

/// <summary>
/// Reads a <see cref="ProductImage"/> from a bare string ("url") OR an object; always writes an object.
/// A private data class carries the object shape so (de)serialization never recurses back into this
/// converter, and nested types + property casing follow the ambient <see cref="JsonSerializerOptions"/>.
/// </summary>
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

    // No [JsonConverter] here, so (de)serializing this type is plain reflection — no recursion.
    private class ProductImageData
    {
        public string? Url { get; set; }
        public string? AltText { get; set; }
        public FocalPoint? FocalPoint { get; set; }
        public List<ImageCrop>? Crops { get; set; }
        public string? MediaKey { get; set; }
    }
}
