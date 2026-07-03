using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;
using UmbConstants = Umbraco.Cms.Core.Constants;

namespace EComm.Umbraco.Commerce.Migrations;

public class AddCommerceSectionToAdminGroupMigration : AsyncMigrationBase
{
    public const string MigrationKey = "ecomm-commerce-add-section-to-admin-v1";
    public const string SectionAlias = "ecomm.section.commerce";

    private readonly IUserGroupService _userGroupService;

    public AddCommerceSectionToAdminGroupMigration(
        IMigrationContext context,
        IUserGroupService userGroupService)
        : base(context)
    {
        _userGroupService = userGroupService;
    }

    protected override async Task MigrateAsync()
    {
        var adminGroup = await _userGroupService.GetAsync(UmbConstants.Security.AdminGroupAlias);

        if (adminGroup is null || adminGroup.AllowedSections.Contains(SectionAlias))
            return;

        adminGroup.AddAllowedSection(SectionAlias);
        await _userGroupService.UpdateAsync(adminGroup, UmbConstants.Security.SuperUserKey);
    }
}
