using System.Text.Json;
using CvForge.Api.Domain;
using Microsoft.Playwright;

namespace CvForge.Api.Services;

/// <summary>
/// Renders a CV to PDF (or a thumbnail image) by driving the same Angular /print route used on
/// screen, so the output is pixel-identical to the live preview (same HTML, same CSS).
/// </summary>
public class PdfService : IAsyncDisposable
{
    private readonly string _frontendOrigin;
    private IPlaywright? _playwright;
    private IBrowser? _browser;
    private readonly SemaphoreSlim _initLock = new(1, 1);

    public PdfService(IConfiguration configuration)
    {
        _frontendOrigin = configuration["FrontendOrigin"] ?? "http://localhost:4200";
    }

    public async Task<byte[]> RenderCvPdfAsync(Cv cv, CancellationToken cancellationToken = default)
    {
        var page = await OpenPrintPageAsync(cv);
        try
        {
            return await page.PdfAsync(new PagePdfOptions
            {
                Format = "A4",
                PrintBackground = true,
                PreferCSSPageSize = true,
            });
        }
        finally
        {
            await page.CloseAsync();
        }
    }

    /// <summary>Self-contained HTML export: same rendered markup as the PDF, with the applied CSS
    /// inlined into a &lt;style&gt; tag so the file opens correctly without the Angular app running.</summary>
    public async Task<string> RenderCvHtmlAsync(Cv cv, CancellationToken cancellationToken = default)
    {
        var page = await OpenPrintPageAsync(cv);
        try
        {
            var css = await page.EvaluateAsync<string>(
                "() => [...document.styleSheets].map(sheet => { try { return [...sheet.cssRules].map(r => r.cssText).join('\\n'); } catch { return ''; } }).join('\\n')");
            var pageHtml = await page.EvalOnSelectorAsync<string>(".cv-page", "el => el.outerHTML");
            var title = System.Net.WebUtility.HtmlEncode(cv.Name);
            return $"<!doctype html><html><head><meta charset=\"utf-8\"><title>{title}</title><style>{css}</style></head><body>{pageHtml}</body></html>";
        }
        finally
        {
            await page.CloseAsync();
        }
    }

    public async Task<byte[]> RenderThumbnailAsync(Cv cv, CancellationToken cancellationToken = default)
    {
        var page = await OpenPrintPageAsync(cv, viewportWidth: 420, viewportHeight: 594);
        try
        {
            var cvPage = page.Locator(".cv-page");
            return await cvPage.ScreenshotAsync(new LocatorScreenshotOptions { Type = ScreenshotType.Jpeg, Quality = 70 });
        }
        finally
        {
            await page.CloseAsync();
        }
    }

    private async Task<IPage> OpenPrintPageAsync(Cv cv, int viewportWidth = 1240, int viewportHeight = 1754)
    {
        var browser = await GetBrowserAsync();
        var page = await browser.NewPageAsync(new BrowserNewPageOptions
        {
            ViewportSize = new ViewportSize { Width = viewportWidth, Height = viewportHeight },
        });

        var json = JsonSerializer.Serialize(cv.Document, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });
        await page.AddInitScriptAsync($"window.__cv = {json};");
        await page.GotoAsync($"{_frontendOrigin}/print/{cv.Id}", new PageGotoOptions
        {
            WaitUntil = WaitUntilState.NetworkIdle,
        });
        await page.WaitForFunctionAsync("window.__cvReady === true", new PageWaitForFunctionOptions
        {
            Timeout = 15000,
        });

        return page;
    }

    private async Task<IBrowser> GetBrowserAsync()
    {
        if (_browser is not null) return _browser;

        await _initLock.WaitAsync();
        try
        {
            if (_browser is not null) return _browser;

            _playwright = await Playwright.CreateAsync();
            _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions { Headless = true });
            return _browser;
        }
        finally
        {
            _initLock.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_browser is not null) await _browser.DisposeAsync();
        _playwright?.Dispose();
    }
}
