using System.Text.Json.Serialization;

namespace EComm.Payment;

/// <summary>Kind of a settings field — drives how a UI renders/validates it and how the API masks it.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PaymentFieldType
{
    Text,
    Secret,
    Bool,
    Number
}

/// <summary>One editable setting a provider needs, so UIs can render a form without hardcoding it.</summary>
public class PaymentSettingField
{
    public string Key { get; init; } = "";
    public string Label { get; init; } = "";
    public PaymentFieldType Type { get; init; } = PaymentFieldType.Text;
    public bool Required { get; init; }
    public string? HelpText { get; init; }
    public string? DefaultValue { get; init; }
}

/// <summary>Self-description a provider publishes so the backoffice/admin can list and configure it.</summary>
public class PaymentProviderDescriptor
{
    public string Alias { get; init; } = "";
    public string DisplayName { get; init; } = "";

    /// <summary>
    /// Only what this gateway needs beyond the common set — a provider never re-declares the URLs
    /// and language every gateway takes. Not serialized; consumers read <see cref="Fields"/>.
    /// </summary>
    [JsonIgnore]
    public IReadOnlyList<PaymentSettingField> ProviderFields { get; init; } = [];

    /// <summary>
    /// The full schema: this provider's own fields, then <see cref="PaymentCommonSettings.Fields"/>.
    /// Everything keys off this one list — form rendering, secret masking, and the pruning of
    /// undeclared keys in <see cref="PaymentSettings.Merge"/> — so common settings are stored,
    /// rendered and validated exactly like a provider's own.
    /// </summary>
    public IReadOnlyList<PaymentSettingField> Fields =>
        [.. ProviderFields, .. PaymentCommonSettings.Fields];
}
