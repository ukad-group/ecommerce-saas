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
    {
        var connection = context.Database.GetDbConnection();
        var wasClosed = connection.State != ConnectionState.Open;
        if (wasClosed) connection.Open();
        try
        {
            var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "PRAGMA table_info(Orders)";
                using var reader = cmd.ExecuteReader();
                while (reader.Read()) existing.Add(reader.GetString(1)); // column 1 = name
            }

            foreach (var column in new[] { "PaymentFee", "PaymentFeeTax" })
            {
                if (existing.Contains(column)) continue;
                using var cmd = connection.CreateCommand();
                cmd.CommandText = $"ALTER TABLE Orders ADD COLUMN {column} decimal(18,2) NOT NULL DEFAULT 0";
                cmd.ExecuteNonQuery();
            }
        }
        finally
        {
            if (wasClosed) connection.Close();
        }
    }
}
