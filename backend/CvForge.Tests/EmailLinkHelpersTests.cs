using System.Text.Encodings.Web;
using CvForge.Api.Services;

namespace CvForge.Tests;

/// <summary>
/// MapIdentityApi hands IEmailSender an HTML-*encoded* link (HtmlEncoder.Default.Encode(url)),
/// so "&" between query params arrives as "&amp;". A previous version of ExtractCode parsed
/// the raw query string without decoding first, silently folding "code" into a bogus
/// "amp;code" key — the email would arrive with the intro text but no code. This test
/// replicates the exact encoding MapIdentityApi applies, so a regression fails loudly.
/// </summary>
public class EmailLinkHelpersTests
{
    [Fact]
    public void ExtractCode_FromHtmlEncodedLink_ReturnsTheRawCode()
    {
        var rawLink = "https://localhost:5145/api/auth/confirmEmail?userId=abc-123&code=SGVsbG8tV29ybGQ&changedEmail=x%40y.com";
        var htmlEncodedLink = HtmlEncoder.Default.Encode(rawLink);

        var code = EmailLinkHelpers.ExtractCode(htmlEncodedLink);

        Assert.Equal("SGVsbG8tV29ybGQ", code);
    }
}
