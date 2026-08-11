namespace EComm.Api.Logging;

/// <summary>
/// Feeds every log line the framework hands out into <see cref="MemoryLogStore"/>, alongside the
/// console provider rather than instead of it.
/// <para>
/// The <c>Memory</c> alias makes this provider configurable on its own: a
/// <c>Logging:Memory:LogLevel</c> section decides what reaches the buffer, independently of what the
/// console prints. That is how the payment providers' Debug-level request bodies can be captured for
/// the diagnostics endpoint without also filling the container log.
/// </para>
/// </summary>
[ProviderAlias("Memory")]
public sealed class MemoryLoggerProvider : ILoggerProvider
{
    private readonly MemoryLogStore _store;

    public MemoryLoggerProvider(MemoryLogStore store) => _store = store;

    public ILogger CreateLogger(string categoryName) => new MemoryLogger(_store, categoryName);

    public void Dispose() { }

    private sealed class MemoryLogger : ILogger
    {
        private readonly MemoryLogStore _store;
        private readonly string _category;

        public MemoryLogger(MemoryLogStore store, string category)
        {
            _store = store;
            _category = category;
        }

        // Scopes aren't captured: the entries carry a category and a message, which is what the
        // diagnostics endpoint shows.
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        // Level filtering has already happened in the logger factory, per the Memory alias config.
        public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel)) return;

            _store.Add(DateTime.UtcNow, logLevel, _category, formatter(state, exception), exception);
        }
    }
}

public static class MemoryLoggerExtensions
{
    /// <summary>
    /// Registers the in-memory log buffer and the provider that fills it. The store is created here
    /// and shared as a singleton, so the provider and the controller that reads it are looking at the
    /// same buffer.
    /// </summary>
    /// <param name="builder">The logging builder being configured.</param>
    /// <param name="settings">
    /// The <c>Logging:Memory</c> section: <c>Capacity</c> sizes the buffer, <c>LogLevel</c> decides
    /// what reaches it. Omit it (or leave the section out of config) to take the defaults.
    /// </param>
    public static ILoggingBuilder AddMemoryLogger(this ILoggingBuilder builder, IConfiguration? settings = null)
    {
        var store = new MemoryLogStore(settings?.GetValue("Capacity", MemoryLogStore.DefaultCapacity)
                                       ?? MemoryLogStore.DefaultCapacity);
        builder.Services.AddSingleton(store);
        builder.Services.AddSingleton<ILoggerProvider>(new MemoryLoggerProvider(store));

        // With no levels configured for this provider it would inherit the console's — typically
        // Information, which hides exactly the Debug diagnostics this buffer exists to serve. So an
        // unconfigured buffer captures Debug and above. A provider-specific rule outranks every rule
        // that names no provider, so this also lifts the general Microsoft.* dampers: pin them back
        // under Logging:Memory:LogLevel (as appsettings.json does) if the framework's own Debug
        // chatter starts crowding the buffer.
        if (settings?.GetSection("LogLevel").Exists() != true)
            builder.AddFilter<MemoryLoggerProvider>(category: null, level: LogLevel.Debug);

        return builder;
    }
}
