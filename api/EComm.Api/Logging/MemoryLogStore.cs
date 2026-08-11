namespace EComm.Api.Logging;

/// <summary>One captured log line. <see cref="Sequence"/> is monotonic per process, so a client can
/// poll for "everything after what I already have" instead of re-reading the whole buffer.</summary>
public sealed record LogEntry(
    long Sequence,
    DateTime Timestamp,
    string Level,
    string Category,
    string Message,
    string? Exception);

/// <summary>
/// The most recent log lines, in memory. Exists so a deployed API can be asked what it logged
/// (<c>GET /api/v1/admin/logs</c>) without shell access to the container — the payment providers log
/// their outbound request bodies and gateway errors, and that is the only record of why a payment
/// failed once the process is out of reach.
/// <para>
/// A fixed-size ring: the oldest line is dropped when full, so a chatty startup or a retry storm
/// can't grow this without bound. Nothing is persisted — a restart starts an empty buffer.
/// </para>
/// </summary>
public sealed class MemoryLogStore
{
    public const int DefaultCapacity = 1000;

    private readonly Lock _gate = new();
    private readonly Queue<LogEntry> _entries = new();
    private long _sequence;

    public MemoryLogStore(int capacity = DefaultCapacity)
        => Capacity = Math.Clamp(capacity, 1, 20_000);

    /// <summary>How many lines are kept before the oldest is dropped.</summary>
    public int Capacity { get; }

    public void Add(DateTime timestamp, LogLevel level, string category, string message, Exception? exception)
    {
        lock (_gate)
        {
            _entries.Enqueue(new LogEntry(
                ++_sequence,
                timestamp,
                level.ToString(),
                category,
                message,
                exception?.ToString()));

            while (_entries.Count > Capacity)
                _entries.Dequeue();
        }
    }

    /// <summary>The sequence number of the newest line held, 0 when nothing has been logged.</summary>
    public long LastSequence
    {
        get { lock (_gate) return _sequence; }
    }

    /// <summary>
    /// Matching lines in the order they were logged, newest <paramref name="take"/> of them — so a
    /// caller polling with <paramref name="after"/> gets the tail in reading order, and a caller
    /// without one gets the end of the buffer rather than its start.
    /// </summary>
    /// <param name="minLevel">Drop anything below this level.</param>
    /// <param name="category">Case-insensitive substring of the logger category (e.g. "NetsEasy").</param>
    /// <param name="search">Case-insensitive substring of the message or exception text.</param>
    /// <param name="after">Only lines newer than this sequence number.</param>
    /// <param name="take">Cap on how many lines come back.</param>
    public IReadOnlyList<LogEntry> Read(
        LogLevel minLevel = LogLevel.Trace,
        string? category = null,
        string? search = null,
        long? after = null,
        int take = 200)
    {
        take = Math.Clamp(take, 1, Capacity);

        LogEntry[] snapshot;
        lock (_gate) snapshot = _entries.ToArray();

        var matched = snapshot.Where(entry =>
            Enum.TryParse<LogLevel>(entry.Level, out var level) && level >= minLevel
            && (after is not { } sequence || entry.Sequence > sequence)
            && (string.IsNullOrWhiteSpace(category) || Contains(entry.Category, category))
            && (string.IsNullOrWhiteSpace(search) || Contains(entry.Message, search) || Contains(entry.Exception, search)));

        return matched.TakeLast(take).ToList();
    }

    private static bool Contains(string? haystack, string needle)
        => haystack != null && haystack.Contains(needle, StringComparison.OrdinalIgnoreCase);
}
