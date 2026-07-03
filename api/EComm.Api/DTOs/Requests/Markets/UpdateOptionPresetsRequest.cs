using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.DTOs.Requests.Markets;

public class UpdateOptionPresetsRequest
{
    public List<OptionPreset> Presets { get; set; } = new();
}
