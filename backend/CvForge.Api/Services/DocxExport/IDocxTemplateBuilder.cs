using CvForge.Api.Domain;
using DocumentFormat.OpenXml.Wordprocessing;

namespace CvForge.Api.Services.DocxExport;

public interface IDocxTemplateBuilder
{
    void Build(Body body, CvDocument document);
}
