using System.Text.Json;
using System.Text.Json.Nodes;

namespace EComm.Payment;

/// <summary>
/// Helpers for safely reading/writing a provider's per-market settings JSON: masking secret fields
/// for display and merging incoming edits without clobbering secrets the caller left masked.
/// Secret handling is driven by the provider's descriptor, so it stays gateway-agnostic.
/// </summary>
public static class PaymentSettings
{
    /// <summary>Placeholder returned in place of a stored secret, and ignored on the way back in.</summary>
    public const string SecretMask = "********";

    private static readonly JsonSerializerOptions ReadOptions = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Deserializes a provider's raw settings entry into its own typed model, returning a fresh
    /// <typeparamref name="T"/> when there is nothing stored. Shared by every place a provider reads
    /// its settings (payment creation and webhook handling) so the options live in one spot.
    /// </summary>
    public static T Read<T>(JsonElement? settings) where T : new()
        => settings is { ValueKind: JsonValueKind.Object } element
            ? element.Deserialize<T>(ReadOptions) ?? new T()
            : new T();

    /// <summary>Returns a copy of <paramref name="stored"/> with every secret-typed field masked.</summary>
    public static JsonObject Mask(PaymentProviderDescriptor descriptor, JsonElement stored)
    {
        var obj = stored.ValueKind == JsonValueKind.Object ? JsonObject.Create(stored) ?? new() : new JsonObject();
        foreach (var field in descriptor.Fields.Where(f => f.Type == PaymentFieldType.Secret))
        {
            if (obj.TryGetPropertyValue(field.Key, out var value) && !string.IsNullOrEmpty(value?.ToString()))
                obj[field.Key] = SecretMask;
        }
        return obj;
    }

    /// <summary>
    /// Merges <paramref name="incoming"/> over <paramref name="existing"/>. Secret fields left blank
    /// or still holding the mask keep their previously stored value (write-only secrets).
    /// </summary>
    public static JsonObject Merge(PaymentProviderDescriptor descriptor, JsonElement? existing, JsonObject incoming)
    {
        var result = existing is { ValueKind: JsonValueKind.Object } e ? JsonObject.Create(e) ?? new() : new JsonObject();
        var secretKeys = descriptor.Fields.Where(f => f.Type == PaymentFieldType.Secret).Select(f => f.Key).ToHashSet();

        foreach (var (key, node) in incoming)
        {
            if (secretKeys.Contains(key))
            {
                var incomingValue = node?.ToString();
                if (string.IsNullOrEmpty(incomingValue) || incomingValue == SecretMask)
                    continue; // keep the existing secret
            }
            result[key] = node?.DeepClone();
        }
        return result;
    }
}
