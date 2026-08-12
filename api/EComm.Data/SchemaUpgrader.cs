using System.Data;
using Microsoft.EntityFrameworkCore;

namespace EComm.Data;

/// <summary>
/// EnsureCreated() only creates a brand-new database file; for an already-existing ecomm.db it's a
/// no-op even when the model gains plain columns. Project policy forbids deleting a dev/prod
/// ecomm.db to pick up schema changes, so additive column changes need this instead of standing up
/// a full EF Core Migrations project (overkill for occasional single/double-column additions on
/// SQLite). Call once at startup, right after EnsureCreated().
/// ponytail: hand-rolled additive-only column check (SQLite ALTER TABLE ADD COLUMN); move to real EF
/// Core Migrations if this ever needs down-migrations, column renames, or a non-SQLite provider.
/// </summary>
public static class SchemaUpgrader
{
    public static void EnsureOrderPaymentFeeColumns(ECommDbContext context)
        => WithConnection(context, connection =>
        {
            AddColumns(connection, "Orders", "decimal(18,2) NOT NULL DEFAULT 0", "PaymentFee", "PaymentFeeTax");
        });

    /// <summary>
    /// Schema the webhook pipeline needs: the idempotency ledger, plus the two order columns that
    /// carry a payment's webhook secret and its last gateway error.
    /// </summary>
    public static void EnsurePaymentWebhookSchema(ECommDbContext context)
        => WithConnection(context, connection =>
        {
            AddColumns(connection, "Orders", "TEXT NULL", "PaymentWebhookSecret", "PaymentError");

            Execute(connection, """
                CREATE TABLE IF NOT EXISTS PaymentWebhookEvents (
                    Id TEXT NOT NULL CONSTRAINT PK_PaymentWebhookEvents PRIMARY KEY,
                    Provider TEXT NOT NULL,
                    EventName TEXT NOT NULL,
                    PaymentReference TEXT NOT NULL,
                    OrderId TEXT NULL,
                    ReceivedAt TEXT NOT NULL
                )
                """);
            Execute(connection, "CREATE INDEX IF NOT EXISTS IX_PaymentWebhookEvents_PaymentReference ON PaymentWebhookEvents (PaymentReference)");
            Execute(connection, "CREATE INDEX IF NOT EXISTS IX_Orders_PaymentReference ON Orders (PaymentReference)");
        });

    /// <summary>
    /// The Carts table. Carts used to live in an in-memory dictionary on <see cref="DataStore"/>;
    /// persisting them is what lets the backoffice Carts list survive an API restart.
    /// </summary>
    public static void EnsureCartSchema(ECommDbContext context)
        => WithConnection(context, connection =>
        {
            Execute(connection, """
                CREATE TABLE IF NOT EXISTS Carts (
                    Id TEXT NOT NULL CONSTRAINT PK_Carts PRIMARY KEY,
                    SessionId TEXT NOT NULL,
                    TenantId TEXT NOT NULL,
                    MarketId TEXT NOT NULL,
                    Items TEXT NOT NULL,
                    Subtotal decimal(18,2) NOT NULL,
                    Tax decimal(18,2) NOT NULL,
                    Total decimal(18,2) NOT NULL,
                    CreatedAt TEXT NOT NULL,
                    UpdatedAt TEXT NOT NULL
                )
                """);
            Execute(connection, "CREATE UNIQUE INDEX IF NOT EXISTS IX_Carts_SessionId ON Carts (SessionId)");
            Execute(connection, "CREATE INDEX IF NOT EXISTS IX_Carts_TenantId_MarketId ON Carts (TenantId, MarketId)");
        });

    /// <summary>
    /// Order statuses moved from tenant-wide to per-market: the new column, and the uniqueness rule
    /// that goes with it (a code is unique within a store, not within the tenant — every store has its
    /// own "paid"). Rows are re-pointed at their markets by
    /// <c>DatabaseSeeder.MigrateOrderStatusesToMarkets</c>, which must run before the unique index is
    /// created, or the copies would collide on the old (TenantId, Code) rule.
    /// </summary>
    public static void EnsureOrderStatusMarketColumn(ECommDbContext context)
        => WithConnection(context, connection =>
        {
            AddColumns(connection, "OrderStatuses", "TEXT NOT NULL DEFAULT ''", "MarketId");
            Execute(connection, "DROP INDEX IF EXISTS IX_OrderStatuses_TenantId_Code");
            Execute(connection, "DROP INDEX IF EXISTS IX_OrderStatuses_TenantId");
            Execute(connection, "CREATE INDEX IF NOT EXISTS IX_OrderStatuses_TenantId_MarketId ON OrderStatuses (TenantId, MarketId)");
        });

    /// <summary>
    /// The per-market uniqueness rule, created after the migration has re-pointed every row (an index
    /// built while rows still share a blank MarketId would reject the second store's copy).
    /// </summary>
    public static void EnsureOrderStatusUniqueIndex(ECommDbContext context)
        => WithConnection(context, connection =>
        {
            Execute(connection, "CREATE UNIQUE INDEX IF NOT EXISTS IX_OrderStatuses_TenantId_MarketId_Code ON OrderStatuses (TenantId, MarketId, Code)");
        });

    private static void WithConnection(ECommDbContext context, Action<System.Data.Common.DbConnection> work)
    {
        var connection = context.Database.GetDbConnection();
        var wasClosed = connection.State != ConnectionState.Open;
        if (wasClosed) connection.Open();
        try
        {
            work(connection);
        }
        finally
        {
            if (wasClosed) connection.Close();
        }
    }

    private static void AddColumns(System.Data.Common.DbConnection connection, string table, string columnDefinition, params string[] columns)
    {
        var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        using (var cmd = connection.CreateCommand())
        {
            cmd.CommandText = $"PRAGMA table_info({table})";
            using var reader = cmd.ExecuteReader();
            while (reader.Read()) existing.Add(reader.GetString(1)); // column 1 = name
        }

        foreach (var column in columns)
        {
            if (existing.Contains(column)) continue;
            Execute(connection, $"ALTER TABLE {table} ADD COLUMN {column} {columnDefinition}");
        }
    }

    private static void Execute(System.Data.Common.DbConnection connection, string sql)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        cmd.ExecuteNonQuery();
    }
}
