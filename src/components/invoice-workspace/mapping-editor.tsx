import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, Download, FileJson, RotateCcw, Upload } from "lucide-react";
import { parseMappingProfile } from "../../lib/invoice/parser";
import { FIELD_LABELS, INVOICE_FIELDS, INVOICE_LIMITS } from "../../lib/invoice/types";
import type { InvoiceField, MappingProfile } from "../../lib/invoice/types";

const DEFAULT_ALIASES: Record<InvoiceField, string> = {
  vendor: "supplier name, vendor name, seller name, issued by, supplier, vendor, seller, from",
  invoiceNumber: "invoice number, invoice no., invoice no, invoice #, invoice id, inv. no., inv no., inv no, inv #",
  invoiceDate: "invoice date, date of invoice, date issued, issue date, issued on, date",
  currency: "invoice currency, currency code, currency",
  subtotal: "subtotal, sub total, sub-total, net subtotal, total before tax, total excluding tax, total excl. tax, total excl tax, net amount",
  tax: "total tax, tax total, tax amount, sales tax amount, vat amount, gst amount, hst amount, sales tax, vat total, gst total, cgst, sgst, igst, pst, hst, vat, gst, tax",
  discount: "total discount, discount amount, discount",
  shipping: "shipping and handling, shipping & handling, shipping charge, delivery charge, freight charge, shipping, freight",
  total: "invoice total, grand total, total including tax, total inclusive of tax, total incl. tax, total incl tax, total (incl. tax), total with tax, total amount, total",
};

const PLACEHOLDERS: Record<InvoiceField, string> = {
  vendor: "e.g. Issued by",
  invoiceNumber: "e.g. Invoice ID",
  invoiceDate: "e.g. Date issued",
  currency: "e.g. Currency code",
  subtotal: "e.g. Net amount",
  tax: "e.g. Total tax",
  discount: "e.g. Discount amount",
  shipping: "e.g. Delivery charge",
  total: "e.g. Amount payable",
};

interface MappingEditorProps {
  profile?: MappingProfile;
  disabled: boolean;
  onChange: (profile: MappingProfile | undefined) => void;
  onBusyChange: (busy: boolean) => void;
  onDownload: (blob: Blob, name: string) => void;
}

export function MappingEditor({ profile, disabled, onChange, onBusyChange, onDownload }: MappingEditorProps) {
  const id = useId();
  const [name, setName] = useState(profile?.name ?? "My invoice template");
  const [labels, setLabels] = useState<MappingProfile["labels"]>(() => ({ ...profile?.labels }));
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const reader = useRef<FileReader | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);

  const disposeImport = useCallback(() => {
    mounted.current = false;
    generation.current++;
    reader.current?.abort();
    reader.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return disposeImport;
  }, [disposeImport]);

  const nonempty: MappingProfile["labels"] = {};
  for (const field of INVOICE_FIELDS) {
    if (labels[field]?.trim()) nonempty[field] = labels[field]!.trim();
  }
  const candidate = parseMappingProfile({ version: 1, name: name.trim(), labels: nonempty });
  const selected = Boolean(candidate && profile && candidate.name === profile.name &&
    INVOICE_FIELDS.every(field => candidate.labels[field] === profile.labels[field]));
  const locked = disabled || importing;

  function importTemplate(file: File) {
    if (locked) return;
    setError("");
    setMessage("");
    if (!/\.json$/i.test(file.name) || !file.size || file.size > INVOICE_LIMITS.profileBytes) {
      setError("Choose a non-empty JSON template up to 16 KB (16,000 bytes).");
      return;
    }
    const token = ++generation.current;
    const current = new FileReader();
    reader.current = current;
    setImporting(true);
    onBusyChange(true);
    const active = () => mounted.current && generation.current === token;
    const finish = () => {
      if (!active()) return;
      reader.current = null;
      setImporting(false);
      onBusyChange(false);
    };
    current.onload = () => {
      if (!active()) return;
      try {
        const parsed = parseMappingProfile(JSON.parse(typeof current.result === "string" ? current.result : ""));
        if (!parsed) {
          setError("Invalid template. Only version 1, a 1–60 character name, and supported literal field labels are accepted. Unknown keys and control characters are not allowed.");
        } else {
          setName(parsed.name);
          setLabels(parsed.labels);
          setMessage("Imported into the editor only. Select this template to use it for new files; existing fields are not changed.");
        }
      } catch {
        setError("This file is not a valid invoice mapping JSON template. No settings were changed.");
      } finally {
        finish();
      }
    };
    current.onerror = () => {
      if (active()) setError("The template could not be read locally. Try selecting it again.");
      finish();
    };
    current.onabort = finish;
    try {
      current.readAsText(file);
    } catch {
      if (active()) setError("The template could not be opened. No settings were changed.");
      finish();
    }
  }

  function saveTemplate() {
    if (locked || !candidate) return;
    setError("");
    try {
      onDownload(new Blob([JSON.stringify(candidate, null, 2)], { type: "application/json" }), "byteverse-invoice-template.json");
      setMessage("Template download requested. It contains only the template name and label mappings, not invoice values.");
    } catch {
      setError("The template download could not be started. Your editor has not changed.");
    }
  }

  return (
    <section className="iw-mapping" aria-labelledby={`${id}-heading`}>
      <div className="iw-section-heading">
        <div>
          <h4 id={`${id}-heading`}><FileJson aria-hidden="true" size={18} /> Reusable label template</h4>
          <p>Optional. One literal label per field, not a regular expression. A custom label replaces that field’s built-in aliases; an empty label keeps the defaults.</p>
        </div>
        <span className="iw-pill iw-pill-neutral">Memory only</span>
      </div>
      <p className="iw-note">Selected: <strong>{profile?.name ?? "Default labels"}</strong>. Selecting a template keeps existing fields intact and clears their included reviews. Re-extract only when you are ready to replace those fields.</p>
      <fieldset disabled={locked} className="iw-fieldset">
        <legend className="iw-sr-only">Template editor</legend>
        <div className="iw-field iw-template-name">
          <label htmlFor={`${id}-name`}>Template name <span className="iw-required">*</span></label>
          <input id={`${id}-name`} type="text" autoComplete="off" spellCheck={false} maxLength={60} value={name}
            aria-describedby={`${id}-name-help`} aria-invalid={!name.trim() || name.length > 60}
            onChange={event => { setName(event.target.value); setMessage(""); }} />
          <span id={`${id}-name-help`} className="iw-field-hint">1–60 characters. Use labels, never invoice values, in the fields below.</span>
        </div>
        <div className="iw-field-grid iw-alias-grid">
          {INVOICE_FIELDS.map(field => (
            <div key={field} className="iw-field">
              <label htmlFor={`${id}-${field}`}>{FIELD_LABELS[field]} label</label>
              <input id={`${id}-${field}`} type="text" autoComplete="off" spellCheck={false} maxLength={60}
                placeholder={PLACEHOLDERS[field]} value={labels[field] ?? ""}
                onChange={event => {
                  const value = event.target.value;
                  setLabels(previous => ({ ...previous, [field]: value }));
                  setMessage("");
                }} />
              {!labels[field]?.trim() && (
                <details className="iw-default-aliases">
                  <summary>Using default aliases</summary>
                  <p>{DEFAULT_ALIASES[field]}</p>
                </details>
              )}
            </div>
          ))}
        </div>
      </fieldset>
      {!candidate && <p className="iw-inline-error">Enter a valid 1–60 character name and labels without control characters.</p>}
      <div className="iw-button-row">
        <button type="button" className="iw-button iw-button-primary" disabled={locked || !candidate || selected}
          onClick={() => {
            if (locked || !candidate) return;
            onChange(candidate);
            setError("");
            setMessage("Template selected for new files. Existing fields remain unchanged until you confirm re-extraction.");
          }}>
          <Check aria-hidden="true" size={16} /> {selected ? "Template selected" : "Use template for new files"}
        </button>
        <button type="button" className="iw-button" disabled={locked || !candidate} onClick={saveTemplate}>
          <Download aria-hidden="true" size={16} /> Save template JSON
        </button>
        <button type="button" className="iw-button" disabled={locked} onClick={() => input.current?.click()}>
          <Upload aria-hidden="true" size={16} /> {importing ? "Reading template…" : "Import template"}
        </button>
        <button type="button" className="iw-button iw-button-quiet" disabled={locked}
          onClick={() => {
            if (locked) return;
            setName("My invoice template");
            setLabels({});
            onChange(undefined);
            setError("");
            setMessage("Default labels selected. Existing fields have not been overwritten.");
          }}>
          <RotateCcw aria-hidden="true" size={16} /> Use default labels
        </button>
      </div>
      <input ref={input} className="iw-sr-only" type="file" accept=".json,application/json" tabIndex={-1}
        aria-label="Import invoice mapping template" disabled={locked}
        onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) importTemplate(file);
        }} />
      {error && <p className="iw-inline-error" role="alert">{error}</p>}
      <p className="iw-feedback" role="status" aria-live="polite">{message}</p>
    </section>
  );
}