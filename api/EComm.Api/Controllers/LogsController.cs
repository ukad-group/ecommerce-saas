using EComm.Api.Logging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EComm.Api.Controllers;

/// <summary>
/// Reads back what the API logged, for callers that can't see the process's console — a deployed
/// container, or a payment gateway integration being debugged from the Umbraco backoffice. Serves the
/// in-memory ring buffer filled by <see cref="MemoryLoggerProvider"/>; nothing is persisted, so a
/// restart empties it.
/// <para>
/// Authenticated with an API key or an admin JWT. Log lines are process-wide, <b>not</b> tenant
/// scoped, and they contain whatever the code logged — customer names and emails on order paths,
/// gateway request bodies on payment paths. Any valid API key therefore sees every tenant's log
/// lines: treat this as an operator tool and keep the keys that can reach it accordingly.
/// </para>
/// </summary>
[ApiController]
[Route("api/v1/admin/logs")]
[Authorize(Policy = "AdminOrApiKey")]
public class LogsController : ControllerBase
{
    private readonly MemoryLogStore _store;

    public LogsController(MemoryLogStore store) => _store = store;

    /// <summary>
    /// The captured log lines, oldest first, newest <paramref name="take"/> of them.
    /// </summary>
    /// <param name="level">Minimum level: Trace, Debug, Information, Warning, Error, Critical. Default Trace.</param>
    /// <param name="category">Substring of the logger category, e.g. <c>NetsEasy</c> or <c>PaymentsController</c>.</param>
    /// <param name="search">Substring of the message or exception text.</param>
    /// <param name="after">Only lines newer than this sequence number — poll with the previous response's <c>lastSequence</c> to tail the log.</param>
    /// <param name="take">How many lines to return (1..buffer capacity). Default 200.</param>
    [HttpGet]
    public ActionResult Get(
        [FromQuery] string? level,
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] long? after,
        [FromQuery] int take = 200)
    {
        if (!string.IsNullOrWhiteSpace(level) && !Enum.TryParse<LogLevel>(level, ignoreCase: true, out _))
            return BadRequest(new { message = $"Unknown log level '{level}'. Use Trace, Debug, Information, Warning, Error or Critical." });

        var minLevel = Enum.TryParse<LogLevel>(level, ignoreCase: true, out var parsed) ? parsed : LogLevel.Trace;
        var entries = _store.Read(minLevel, category, search, after, take);

        return Ok(new
        {
            // Echoed so a poller can pass it straight back as `after` — and so it can tell "nothing
            // new" from "the buffer wrapped past what I last saw".
            lastSequence = _store.LastSequence,
            capacity = _store.Capacity,
            count = entries.Count,
            entries
        });
    }
}
