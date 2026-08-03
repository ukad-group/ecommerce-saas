using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Order;

namespace EComm.Api.Services;

/// <summary>
/// The single place an order's status transition happens: stock validation, the status write, the
/// tracking number, and the stock reserve/release that goes with it.
/// <para>
/// Both callers route through here — <c>PUT /orders/{id}/status</c> and the payment webhook. Before
/// this existed the webhook wrote <c>Order.Status</c> directly and silently skipped every side
/// effect, so a genuinely paid order never decremented stock while the fake-payment demo paths did.
/// </para>
/// Mutates the order and writes stock; persisting the order itself is the caller's job (they have
/// other fields to save in the same write).
/// </summary>
public static class OrderStatusService
{
    private static DataStore Store => DataStore.Instance;

    /// <summary>
    /// Applies <paramref name="newStatus"/> to <paramref name="order"/>. Returns null on success, or
    /// a message explaining why the transition was refused (only ever insufficient/unknown stock).
    /// </summary>
    public static string? ApplyStatus(Order order, string newStatus, Market? market)
    {
        var settledStatus = market?.Settings?.OrderStatusAfterPayment;
        var wasSettled = IsSettled(order.Status, settledStatus);
        var becomesSettled = IsSettled(newStatus, settledStatus);

        // CRITICAL: validate stock availability before settling a payment. Prevents overselling when
        // stock changed between cart creation and payment.
        if (becomesSettled && !wasSettled)
        {
            foreach (var item in order.Items)
            {
                var error = CheckStock(item);
                if (error != null) return error;
            }
        }

        order.Status = newStatus;

        if (becomesSettled && string.IsNullOrEmpty(order.TrackingNumber))
            order.TrackingNumber = $"TRACK-{order.Id[..Math.Min(8, order.Id.Length)].ToUpper()}";

        if (becomesSettled && !wasSettled)
        {
            AdjustStock(order, decrease: true); // inventory reserved
        }
        else if (wasSettled && newStatus.Equals("cancelled", StringComparison.OrdinalIgnoreCase))
        {
            // Inventory released. Refunds deliberately do NOT restore stock — the goods may be
            // damaged or lost.
            AdjustStock(order, decrease: false);
        }

        return null;
    }

    /// <summary>
    /// "Payment settled" means the literal <c>paid</c> status, or whatever this market configured as
    /// its <c>OrderStatusAfterPayment</c>. Honouring the market's own setting is what makes stock
    /// move for a market that calls the state something else (e.g. "processing"); the previous
    /// hardcoded <c>"paid"</c> comparison silently skipped those.
    /// </summary>
    public static bool IsSettled(string? status, string? settledStatus)
        => !string.IsNullOrWhiteSpace(status)
           && (status.Equals("paid", StringComparison.OrdinalIgnoreCase)
               || (!string.IsNullOrWhiteSpace(settledStatus)
                   && status.Equals(settledStatus, StringComparison.OrdinalIgnoreCase)));

    private static string? CheckStock(OrderItem item)
    {
        var product = Store.GetProducts().FirstOrDefault(p => p.Id == item.ProductId && p.IsCurrentVersion);
        if (product == null)
            return $"Product '{item.ProductName}' not found";

        int availableStock;
        string itemIdentifier;

        if (!string.IsNullOrEmpty(item.VariantId))
        {
            var variant = product.Variants?.FirstOrDefault(v => v.Id == item.VariantId);
            if (variant == null)
                return $"Variant for product '{item.ProductName}' not found";
            availableStock = variant.StockQuantity;
            itemIdentifier = $"{item.ProductName} (SKU: {variant.Sku})";
        }
        else
        {
            if (!product.StockQuantity.HasValue)
                return $"Product '{item.ProductName}' has no stock information";
            availableStock = product.StockQuantity.Value;
            itemIdentifier = $"{item.ProductName} (SKU: {product.Sku})";
        }

        return item.Quantity > availableStock
            ? $"Insufficient stock for {itemIdentifier}. Requested: {item.Quantity}, Available: {availableStock}. Please return to cart to adjust quantities."
            : null;
    }

    private static void AdjustStock(Order order, bool decrease)
    {
        foreach (var item in order.Items)
        {
            var product = Store.GetProducts().FirstOrDefault(p => p.Id == item.ProductId && p.IsCurrentVersion);
            if (product == null) continue;

            if (!string.IsNullOrEmpty(item.VariantId))
            {
                Store.UpdateVariantStock(item.ProductId, item.VariantId, item.Quantity, decrease);
            }
            else if (product.StockQuantity.HasValue)
            {
                Store.UpdateProductStock(item.ProductId, decrease
                    ? Math.Max(0, product.StockQuantity.Value - item.Quantity)
                    : product.StockQuantity.Value + item.Quantity);
            }
        }
    }
}
