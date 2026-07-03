using System.Text.Json;
using System.Text.Json.Serialization;

namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Handles DateTime? deserialization gracefully — null, empty string, and invalid values all become null.
/// </summary>
public class FlexibleDateTimeConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
            return null;

        if (reader.TokenType == JsonTokenType.String)
        {
            var str = reader.GetString();
            if (string.IsNullOrWhiteSpace(str))
                return null;

            if (DateTime.TryParse(str, out var dt))
                return dt;

            return null;
        }

        return null;
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value.HasValue)
            writer.WriteStringValue(value.Value.ToString("O"));
        else
            writer.WriteNullValue();
    }
}
