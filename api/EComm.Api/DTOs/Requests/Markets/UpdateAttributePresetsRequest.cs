using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.DTOs.Requests.Markets;

public class UpdateAttributePresetsRequest
{
    public List<ProductAttributePreset> Presets { get; set; } = new();
}
