using System.Net;
using Microsoft.AspNetCore.WebUtilities;

namespace CvForge.Api.Services;

/// <summary>
/// MapIdentityApi's built-in registration flow always builds a clickable confirmation
/// *link*, never just a code. Plain-text emails with that long, multi-parameter URL got
/// mangled by Gmail (the "code" query param was dropped), so instead of emailing the link
/// we extract its "code" value and use the code-based confirm flow (AuthEndpoints.ConfirmEmailCode)
/// — same underlying token, just delivered and typed back in differently.
/// </summary>
public static class EmailLinkHelpers
{
    public static string ExtractCode(string confirmationLink)
    {
        // MapIdentityApi HTML-encodes the link before handing it to IEmailSender (it's meant
        // to go straight into an href), so "&" between query params arrives as "&amp;" —
        // must decode first or QueryHelpers folds "code" into a bogus "amp;code" key.
        var decoded = WebUtility.HtmlDecode(confirmationLink);
        return QueryHelpers.ParseQuery(new Uri(decoded).Query).TryGetValue("code", out var value)
            ? value.ToString()
            : string.Empty;
    }
}
