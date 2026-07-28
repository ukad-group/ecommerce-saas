using EComm.Data;
using EComm.Data.Entities;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>
/// The webhook pipeline's two data-layer guarantees: an existing ecomm.db upgrades in place (repo
/// policy forbids resetting it), and recording an event twice is detected rather than duplicated.
/// </summary>
public class SchemaUpgraderTests
{
    [Fact]
    public void EnsurePaymentWebhookSchema_UpgradesAPreExistingOrdersTableInPlace()
    {
        using var connection = new SqliteConnection("Filename=:memory:");
        connection.Open();

        // An "old" database: Orders exists with a row, but none of the webhook schema does.
        Execute(connection, "CREATE TABLE Orders (Id TEXT NOT NULL PRIMARY KEY, PaymentReference TEXT NULL)");
        Execute(connection, "INSERT INTO Orders (Id, PaymentReference) VALUES ('o1', 'pay_1')");

        using var context = ContextOver(connection);
        SchemaUpgrader.EnsurePaymentWebhookSchema(context);

        Assert.Contains("PaymentWebhookSecret", OrderColumns(connection));
        Assert.Contains("PaymentError", OrderColumns(connection));
        Assert.Equal(1L, Scalar(connection, "SELECT COUNT(*) FROM Orders"));          // data preserved
        Assert.Equal(0L, Scalar(connection, "SELECT COUNT(*) FROM PaymentWebhookEvents"));

        // Runs on every startup, so it has to be repeatable.
        SchemaUpgrader.EnsurePaymentWebhookSchema(context);
        Assert.Equal(1L, Scalar(connection, "SELECT COUNT(*) FROM Orders"));
    }

    private static ECommDbContext ContextOver(SqliteConnection connection)
        => new(new DbContextOptionsBuilder<ECommDbContext>().UseSqlite(connection).Options);

    private static void Execute(SqliteConnection connection, string sql)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        cmd.ExecuteNonQuery();
    }

    private static long Scalar(SqliteConnection connection, string sql)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        return (long)cmd.ExecuteScalar()!;
    }

    private static List<string> OrderColumns(SqliteConnection connection)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "PRAGMA table_info(Orders)";
        using var reader = cmd.ExecuteReader();
        var names = new List<string>();
        while (reader.Read()) names.Add(reader.GetString(1));
        return names;
    }
}

[Collection("DataStore")]
public class WebhookEventStoreTests
{
    [Fact]
    public void TryRecordWebhookEvent_IsTrueOnceThenFalseForTheSameEvent()
    {
        using var connection = InitializeInMemoryDataStore();

        PaymentWebhookEvent Event() => new()
        {
            Id = "nets-easy:evt_1",
            Provider = "nets-easy",
            EventName = "payment.checkout.completed",
            PaymentReference = "pay_1",
            OrderId = "o1",
            ReceivedAt = DateTime.UtcNow
        };

        Assert.True(DataStore.Instance.TryRecordWebhookEvent(Event()));
        Assert.False(DataStore.Instance.TryRecordWebhookEvent(Event()));   // redelivery
        Assert.True(DataStore.Instance.TryRecordWebhookEvent(new PaymentWebhookEvent
        {
            Id = "nets-easy:evt_2",
            Provider = "nets-easy",
            EventName = "payment.charge.created.v2",
            PaymentReference = "pay_1",
            ReceivedAt = DateTime.UtcNow
        }));
    }

    [Fact]
    public void GetOrderByPaymentReference_FindsTheOrderTheWebhookRefersTo()
    {
        using var connection = InitializeInMemoryDataStore();
        DataStore.Instance.AddOrder(new Order
        {
            Id = "o1",
            TenantId = "tenant-a",
            MarketId = "market-1",
            OrderNumber = "ORD-1",
            PaymentReference = "pay_1",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        Assert.Equal("o1", DataStore.Instance.GetOrderByPaymentReference("pay_1")?.Id);
        Assert.Null(DataStore.Instance.GetOrderByPaymentReference("pay_unknown"));
    }

    private static SqliteConnection InitializeInMemoryDataStore()
    {
        var connection = new SqliteConnection("Filename=:memory:");
        connection.Open();
        var options = new DbContextOptionsBuilder<ECommDbContext>().UseSqlite(connection).Options;
        using (var context = new ECommDbContext(options))
        {
            context.Database.EnsureCreated();
        }
        DataStore.Instance.InitializeDatabase(options);
        return connection; // keep alive — closing it drops the in-memory db
    }
}
