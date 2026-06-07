"use client";

import { useState, useMemo, useCallback } from "react";
import { Copy, Check, Plus, Trash2 } from "lucide-react";

type SchemaType = "Article" | "FAQPage" | "HowTo" | "Product" | "LocalBusiness" | "BreadcrumbList" | "Person" | "Organization";

interface FaqItem { id: number; q: string; a: string }
interface HowToStep { id: number; name: string; text: string }
interface BreadcrumbItem { id: number; name: string; url: string }

let uid = 1;

export function SchemaMarkupGeneratorTool() {
  const [schemaType, setSchemaType] = useState<SchemaType>("Article");

  // Article
  const [artTitle, setArtTitle] = useState("");
  const [artDesc, setArtDesc] = useState("");
  const [artAuthor, setArtAuthor] = useState("");
  const [artPublished, setArtPublished] = useState("");
  const [artModified, setArtModified] = useState("");
  const [artImage, setArtImage] = useState("");
  const [artUrl, setArtUrl] = useState("");
  const [artPublisher, setArtPublisher] = useState("");

  // FAQ
  const [faqs, setFaqs] = useState<FaqItem[]>([{ id: uid++, q: "", a: "" }]);

  // HowTo
  const [howToName, setHowToName] = useState("");
  const [howToDesc, setHowToDesc] = useState("");
  const [howToSteps, setHowToSteps] = useState<HowToStep[]>([{ id: uid++, name: "", text: "" }]);

  // Product
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodImage, setProdImage] = useState("");
  const [prodBrand, setProdBrand] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCurrency, setProdCurrency] = useState("USD");
  const [prodAvail, setProdAvail] = useState("InStock");
  const [prodRating, setProdRating] = useState("");
  const [prodReviewCount, setProdReviewCount] = useState("");

  // LocalBusiness
  const [bizName, setBizName] = useState("");
  const [bizType, setBizType] = useState("LocalBusiness");
  const [bizAddress, setBizAddress] = useState("");
  const [bizCity, setBizCity] = useState("");
  const [bizState, setBizState] = useState("");
  const [bizZip, setBizZip] = useState("");
  const [bizCountry, setBizCountry] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizUrl, setBizUrl] = useState("");

  // Breadcrumb
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([
    { id: uid++, name: "Home", url: "" },
    { id: uid++, name: "", url: "" },
  ]);

  // Person
  const [personName, setPersonName] = useState("");
  const [personUrl, setPersonUrl] = useState("");
  const [personJob, setPersonJob] = useState("");
  const [personImage, setPersonImage] = useState("");

  // Organization
  const [orgName, setOrgName] = useState("");
  const [orgUrl, setOrgUrl] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [orgDesc, setOrgDesc] = useState("");

  const [copied, setCopied] = useState(false);

  const jsonLd = useMemo(() => {
    const schema: Record<string, unknown> = { "@context": "https://schema.org" };

    switch (schemaType) {
      case "Article":
        schema["@type"] = "Article";
        if (artTitle) schema.headline = artTitle;
        if (artDesc) schema.description = artDesc;
        if (artAuthor) schema.author = { "@type": "Person", name: artAuthor };
        if (artPublished) schema.datePublished = artPublished;
        if (artModified) schema.dateModified = artModified;
        if (artImage) schema.image = artImage;
        if (artUrl) schema.mainEntityOfPage = { "@type": "WebPage", "@id": artUrl };
        if (artPublisher) schema.publisher = { "@type": "Organization", name: artPublisher };
        break;
      case "FAQPage":
        schema["@type"] = "FAQPage";
        schema.mainEntity = faqs.filter(f => f.q && f.a).map(f => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        }));
        break;
      case "HowTo":
        schema["@type"] = "HowTo";
        if (howToName) schema.name = howToName;
        if (howToDesc) schema.description = howToDesc;
        schema.step = howToSteps.filter(s => s.name).map((s, i) => ({
          "@type": "HowToStep", position: i + 1, name: s.name, text: s.text || s.name,
        }));
        break;
      case "Product":
        schema["@type"] = "Product";
        if (prodName) schema.name = prodName;
        if (prodDesc) schema.description = prodDesc;
        if (prodImage) schema.image = prodImage;
        if (prodBrand) schema.brand = { "@type": "Brand", name: prodBrand };
        if (prodPrice) {
          schema.offers = {
            "@type": "Offer", price: prodPrice, priceCurrency: prodCurrency,
            availability: `https://schema.org/${prodAvail}`,
          };
        }
        if (prodRating) {
          schema.aggregateRating = {
            "@type": "AggregateRating", ratingValue: prodRating,
            reviewCount: prodReviewCount || "1",
          };
        }
        break;
      case "LocalBusiness":
        schema["@type"] = bizType;
        if (bizName) schema.name = bizName;
        if (bizPhone) schema.telephone = bizPhone;
        if (bizUrl) schema.url = bizUrl;
        if (bizAddress || bizCity) {
          schema.address = {
            "@type": "PostalAddress",
            ...(bizAddress ? { streetAddress: bizAddress } : {}),
            ...(bizCity ? { addressLocality: bizCity } : {}),
            ...(bizState ? { addressRegion: bizState } : {}),
            ...(bizZip ? { postalCode: bizZip } : {}),
            ...(bizCountry ? { addressCountry: bizCountry } : {}),
          };
        }
        break;
      case "BreadcrumbList":
        schema["@type"] = "BreadcrumbList";
        schema.itemListElement = crumbs.filter(c => c.name).map((c, i) => ({
          "@type": "ListItem", position: i + 1, name: c.name,
          ...(c.url ? { item: c.url } : {}),
        }));
        break;
      case "Person":
        schema["@type"] = "Person";
        if (personName) schema.name = personName;
        if (personUrl) schema.url = personUrl;
        if (personJob) schema.jobTitle = personJob;
        if (personImage) schema.image = personImage;
        break;
      case "Organization":
        schema["@type"] = "Organization";
        if (orgName) schema.name = orgName;
        if (orgUrl) schema.url = orgUrl;
        if (orgLogo) schema.logo = orgLogo;
        if (orgDesc) schema.description = orgDesc;
        break;
    }
    return JSON.stringify(schema, null, 2);
  }, [schemaType, artTitle, artDesc, artAuthor, artPublished, artModified, artImage, artUrl, artPublisher, faqs, howToName, howToDesc, howToSteps, prodName, prodDesc, prodImage, prodBrand, prodPrice, prodCurrency, prodAvail, prodRating, prodReviewCount, bizName, bizType, bizAddress, bizCity, bizState, bizZip, bizCountry, bizPhone, bizUrl, crumbs, personName, personUrl, personJob, personImage, orgName, orgUrl, orgLogo, orgDesc]);

  const scriptTag = `<script type="application/ld+json">\n${jsonLd}\n</script>`;

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [scriptTag]);

  const inp = "w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <div className="flex flex-wrap gap-2">
        {(["Article", "FAQPage", "HowTo", "Product", "LocalBusiness", "BreadcrumbList", "Person", "Organization"] as SchemaType[]).map((t) => (
          <button key={t} onClick={() => setSchemaType(t)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${schemaType === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border hover:bg-primary/10 hover:border-primary/50"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          {schemaType === "Article" && (
            <>
              <div><label className="text-xs font-medium mb-1 block">Headline</label><input value={artTitle} onChange={e => setArtTitle(e.target.value)} placeholder="Article Title" className={inp} /></div>
              <div><label className="text-xs font-medium mb-1 block">Description</label><textarea value={artDesc} onChange={e => setArtDesc(e.target.value)} rows={2} placeholder="Brief description" className={inp + " resize-none"} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block">Author</label><input value={artAuthor} onChange={e => setArtAuthor(e.target.value)} placeholder="John Doe" className={inp} /></div>
                <div><label className="text-xs font-medium mb-1 block">Publisher</label><input value={artPublisher} onChange={e => setArtPublisher(e.target.value)} placeholder="My Blog" className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block">Published Date</label><input type="date" value={artPublished} onChange={e => setArtPublished(e.target.value)} className={inp} /></div>
                <div><label className="text-xs font-medium mb-1 block">Modified Date</label><input type="date" value={artModified} onChange={e => setArtModified(e.target.value)} className={inp} /></div>
              </div>
              <div><label className="text-xs font-medium mb-1 block">Image URL</label><input value={artImage} onChange={e => setArtImage(e.target.value)} placeholder="https://..." className={inp} /></div>
              <div><label className="text-xs font-medium mb-1 block">Page URL</label><input value={artUrl} onChange={e => setArtUrl(e.target.value)} placeholder="https://..." className={inp} /></div>
            </>
          )}

          {schemaType === "FAQPage" && (
            <>
              {faqs.map((f, i) => (
                <div key={f.id} className="space-y-2 pb-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">Q{i + 1}</p>
                    {faqs.length > 1 && <button onClick={() => setFaqs(faqs.filter(x => x.id !== f.id))} className="text-muted-foreground hover:text-red-500"><Trash2 size={13} /></button>}
                  </div>
                  <input value={f.q} onChange={e => setFaqs(faqs.map(x => x.id === f.id ? { ...x, q: e.target.value } : x))} placeholder="Question" className={inp} />
                  <textarea value={f.a} onChange={e => setFaqs(faqs.map(x => x.id === f.id ? { ...x, a: e.target.value } : x))} rows={2} placeholder="Answer" className={inp + " resize-none"} />
                </div>
              ))}
              <button onClick={() => setFaqs([...faqs, { id: uid++, q: "", a: "" }])} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> Add Question</button>
            </>
          )}

          {schemaType === "HowTo" && (
            <>
              <div><label className="text-xs font-medium mb-1 block">Title</label><input value={howToName} onChange={e => setHowToName(e.target.value)} placeholder="How to..." className={inp} /></div>
              <div><label className="text-xs font-medium mb-1 block">Description</label><textarea value={howToDesc} onChange={e => setHowToDesc(e.target.value)} rows={2} placeholder="Brief description" className={inp + " resize-none"} /></div>
              {howToSteps.map((s, i) => (
                <div key={s.id} className="space-y-2 pb-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">Step {i + 1}</p>
                    {howToSteps.length > 1 && <button onClick={() => setHowToSteps(howToSteps.filter(x => x.id !== s.id))} className="text-muted-foreground hover:text-red-500"><Trash2 size={13} /></button>}
                  </div>
                  <input value={s.name} onChange={e => setHowToSteps(howToSteps.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))} placeholder="Step name" className={inp} />
                  <input value={s.text} onChange={e => setHowToSteps(howToSteps.map(x => x.id === s.id ? { ...x, text: e.target.value } : x))} placeholder="Step details" className={inp} />
                </div>
              ))}
              <button onClick={() => setHowToSteps([...howToSteps, { id: uid++, name: "", text: "" }])} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> Add Step</button>
            </>
          )}

          {schemaType === "Product" && (
            <>
              <div><label className="text-xs font-medium mb-1 block">Product Name</label><input value={prodName} onChange={e => setProdName(e.target.value)} placeholder="Product name" className={inp} /></div>
              <div><label className="text-xs font-medium mb-1 block">Description</label><textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} rows={2} placeholder="Product description" className={inp + " resize-none"} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block">Brand</label><input value={prodBrand} onChange={e => setProdBrand(e.target.value)} placeholder="Brand" className={inp} /></div>
                <div><label className="text-xs font-medium mb-1 block">Image URL</label><input value={prodImage} onChange={e => setProdImage(e.target.value)} placeholder="https://..." className={inp} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium mb-1 block">Price</label><input value={prodPrice} onChange={e => setProdPrice(e.target.value)} placeholder="29.99" className={inp} /></div>
                <div><label className="text-xs font-medium mb-1 block">Currency</label><select value={prodCurrency} onChange={e => setProdCurrency(e.target.value)} className={inp}><option>USD</option><option>EUR</option><option>GBP</option><option>PKR</option><option>INR</option></select></div>
                <div><label className="text-xs font-medium mb-1 block">Availability</label><select value={prodAvail} onChange={e => setProdAvail(e.target.value)} className={inp}><option value="InStock">In Stock</option><option value="OutOfStock">Out of Stock</option><option value="PreOrder">Pre-Order</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block">Rating (1-5)</label><input value={prodRating} onChange={e => setProdRating(e.target.value)} placeholder="4.5" className={inp} /></div>
                <div><label className="text-xs font-medium mb-1 block">Review Count</label><input value={prodReviewCount} onChange={e => setProdReviewCount(e.target.value)} placeholder="100" className={inp} /></div>
              </div>
            </>
          )}

          {schemaType === "LocalBusiness" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block">Business Name</label><input value={bizName} onChange={e => setBizName(e.target.value)} placeholder="My Business" className={inp} /></div>
                <div><label className="text-xs font-medium mb-1 block">Type</label><select value={bizType} onChange={e => setBizType(e.target.value)} className={inp}><option>LocalBusiness</option><option>Restaurant</option><option>Store</option><option>MedicalBusiness</option><option>FinancialService</option><option>LegalService</option></select></div>
              </div>
              <div><label className="text-xs font-medium mb-1 block">Street Address</label><input value={bizAddress} onChange={e => setBizAddress(e.target.value)} placeholder="123 Main St" className={inp} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block">City</label><input value={bizCity} onChange={e => setBizCity(e.target.value)} className={inp} /></div>
                <div><label className="text-xs font-medium mb-1 block">State/Region</label><input value={bizState} onChange={e => setBizState(e.target.value)} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block">ZIP/Postal Code</label><input value={bizZip} onChange={e => setBizZip(e.target.value)} className={inp} /></div>
                <div><label className="text-xs font-medium mb-1 block">Country</label><input value={bizCountry} onChange={e => setBizCountry(e.target.value)} placeholder="US" className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block">Phone</label><input value={bizPhone} onChange={e => setBizPhone(e.target.value)} placeholder="+1-234-567-8900" className={inp} /></div>
                <div><label className="text-xs font-medium mb-1 block">Website URL</label><input value={bizUrl} onChange={e => setBizUrl(e.target.value)} placeholder="https://..." className={inp} /></div>
              </div>
            </>
          )}

          {schemaType === "BreadcrumbList" && (
            <>
              {crumbs.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                  <input value={c.name} onChange={e => setCrumbs(crumbs.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} placeholder="Page Name" className={inp + " flex-1"} />
                  <input value={c.url} onChange={e => setCrumbs(crumbs.map(x => x.id === c.id ? { ...x, url: e.target.value } : x))} placeholder="URL (optional for last)" className={inp + " flex-1"} />
                  {crumbs.length > 2 && <button onClick={() => setCrumbs(crumbs.filter(x => x.id !== c.id))} className="text-muted-foreground hover:text-red-500"><Trash2 size={13} /></button>}
                </div>
              ))}
              <button onClick={() => setCrumbs([...crumbs, { id: uid++, name: "", url: "" }])} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> Add Level</button>
            </>
          )}

          {schemaType === "Person" && (
            <>
              <div><label className="text-xs font-medium mb-1 block">Full Name</label><input value={personName} onChange={e => setPersonName(e.target.value)} placeholder="John Doe" className={inp} /></div>
              <div><label className="text-xs font-medium mb-1 block">Job Title</label><input value={personJob} onChange={e => setPersonJob(e.target.value)} placeholder="Software Engineer" className={inp} /></div>
              <div><label className="text-xs font-medium mb-1 block">URL</label><input value={personUrl} onChange={e => setPersonUrl(e.target.value)} placeholder="https://..." className={inp} /></div>
              <div><label className="text-xs font-medium mb-1 block">Image URL</label><input value={personImage} onChange={e => setPersonImage(e.target.value)} placeholder="https://..." className={inp} /></div>
            </>
          )}

          {schemaType === "Organization" && (
            <>
              <div><label className="text-xs font-medium mb-1 block">Organization Name</label><input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="My Company" className={inp} /></div>
              <div><label className="text-xs font-medium mb-1 block">Website URL</label><input value={orgUrl} onChange={e => setOrgUrl(e.target.value)} placeholder="https://..." className={inp} /></div>
              <div><label className="text-xs font-medium mb-1 block">Logo URL</label><input value={orgLogo} onChange={e => setOrgLogo(e.target.value)} placeholder="https://..." className={inp} /></div>
              <div><label className="text-xs font-medium mb-1 block">Description</label><textarea value={orgDesc} onChange={e => setOrgDesc(e.target.value)} rows={2} placeholder="About your organization" className={inp + " resize-none"} /></div>
            </>
          )}
        </div>

        {/* Output */}
        <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-20 self-start">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-medium">JSON-LD Output</p>
            <button onClick={copyCode} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[70vh] overflow-y-auto">{scriptTag}</pre>
        </div>
      </div>
    </div>
  );
}
