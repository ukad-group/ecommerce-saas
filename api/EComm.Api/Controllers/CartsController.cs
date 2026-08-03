using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EComm.Data;

namespace EComm.Api.Controllers;

/// <summary>
/// Backoffice cart list. Separate from the anonymous, session-scoped <see cref="CartController"/> that
/// storefronts call: this one is authenticated and reads every cart in a market. Uses the default
/// policy (JWT or API key) rather than "AdminOnly", so the Umbraco plugin's API key reaches it — the
/// same choice <see cref="OrdersController.GetOrders"/> makes.
/// </summary>
[ApiController]
[Route("api/v1/carts")]
[Authorize]
public class CartsController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

    [HttpGet]
    public ActionResult GetCarts(
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        // Already sorted by UpdatedAt DESC — most recent activity first.
        var carts = _store.GetCarts(tenantId, marketId).AsEnumerable();

        if (!string.IsNullOrEmpty(search))
        {
            // A cart has no customer or order number, so the only things worth matching are its
            // session id and the products in it.
            var term = search.ToLowerInvariant();
            carts = carts.Where(c =>
                c.SessionId.ToLowerInvariant().Contains(term) ||
                c.Items.Any(i => i.ProductName.ToLowerInvariant().Contains(term)));
        }

        var filtered = carts.ToList();
        return Ok(new
        {
            carts = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList(),
            totalCount = filtered.Count,
            page,
            pageSize
        });
    }
}
