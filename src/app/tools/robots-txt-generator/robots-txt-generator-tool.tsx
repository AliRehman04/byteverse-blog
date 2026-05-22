"use client";

import { useState, useMemo, useCallback } from "react";
import { Copy, Check, Plus, Trash2, RotateCcw } from "lucide-react";

interface Rule {
  id: number;
  type: "allow" | "disallow";
  path: string;
}

interface DirectiveGroup {
  id: number;
  userAgent: string;
  rules: Rule[];
  crawlDelay: string;
}

let nextId = 1;

function createGroup(): DirectiveGroup {
  return {
    id: nextId++,
    userAgent: "*",
    rules: [{ id: nextId++, type: "disallow", path: "" }],
    crawlDelay: "",
  };
}

const presets: Record<string, () => { groups: DirectiveGroup[]; sitemaps: string[]; host: string }> = {
  "Allow All": () => ({
    groups: [{ id: nextId++, userAgent: "*", rules: [{ id: nextId++, type: "allow", path: "/" }], crawlDelay: "" }],
    sitemaps: [],
    host: "",
  }),
  "Block All": () => ({
    groups: [{ id: nextId++, userAgent: "*", rules: [{ id: nextId++, type: "disallow", path: "/" }], crawlDelay: "" }],
    sitemaps: [],
    host: "",
  }),
  "Block AI Bots": () => ({
    groups: [
      { id: nextId++, userAgent: "*", rules: [{ id: nextId++, type: "allow", path: "/" }], crawlDelay: "" },
      { id: nextId++, userAgent: "GPTBot", rules: [{ id: nextId++, type: "disallow", path: "/" }], crawlDelay: "" },
      { id: nextId++, userAgent: "ChatGPT-User", rules: [{ id: nextId++, type: "disallow", path: "/" }], crawlDelay: "" },
      { id: nextId++, userAgent: "CCBot", rules: [{ id: nextId++, type: "disallow", path: "/" }], crawlDelay: "" },
      { id: nextId++, userAgent: "anthropic-ai", rules: [{ id: nextId++, type: "disallow", path: "/" }], crawlDelay: "" },
    ],
    sitemaps: [],
    host: "",
  }),
  WordPress: () => ({
    groups: [{
      id: nextId++,
      userAgent: "*",
      rules: [
        { id: nextId++, type: "disallow", path: "/wp-admin/" },
        { id: nextId++, type: "allow", path: "/wp-admin/admin-ajax.php" },
        { id: nextId++, type: "disallow", path: "/wp-includes/" },
      ],
      crawlDelay: "",
    }],
    sitemaps: ["/sitemap.xml"],
    host: "",
  }),
};

export function RobotsTxtGeneratorTool() {
  const [groups, setGroups] = useState<DirectiveGroup[]>([createGroup()]);
  const [sitemaps, setSitemaps] = useState<string[]>([""]);
  const [host, setHost] = useState("");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const lines: string[] = [];
    for (const g of groups) {
      lines.push(`User-agent: ${g.userAgent || "*"}`);
      for (const r of g.rules) {
        if (r.path || r.type === "disallow") {
          lines.push(`${r.type === "allow" ? "Allow" : "Disallow"}: ${r.path}`);
        }
      }
      if (g.crawlDelay) lines.push(`Crawl-delay: ${g.crawlDelay}`);
      lines.push("");
    }
    for (const s of sitemaps) {
      if (s.trim()) lines.push(`Sitemap: ${s.trim()}`);
    }
    if (host.trim()) lines.push(`Host: ${host.trim()}`);
    return lines.join("\n").trim();
  }, [groups, sitemaps, host]);

  const copyOutput = useCallback(async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const applyPreset = (name: string) => {
    const preset = presets[name]();
    setGroups(preset.groups);
    setSitemaps(preset.sitemaps.length ? preset.sitemaps : [""]);
    setHost(preset.host);
  };

  const addGroup = () => setGroups((g) => [...g, createGroup()]);
  const removeGroup = (id: number) => setGroups((g) => g.filter((x) => x.id !== id));

  const updateGroup = (id: number, field: string, value: string) => {
    setGroups((g) => g.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const addRule = (gid: number) => {
    setGroups((g) =>
      g.map((x) =>
        x.id === gid ? { ...x, rules: [...x.rules, { id: nextId++, type: "disallow", path: "" }] } : x
      )
    );
  };

  const removeRule = (gid: number, rid: number) => {
    setGroups((g) =>
      g.map((x) =>
        x.id === gid ? { ...x, rules: x.rules.filter((r) => r.id !== rid) } : x
      )
    );
  };

  const updateRule = (gid: number, rid: number, field: string, value: string) => {
    setGroups((g) =>
      g.map((x) =>
        x.id === gid
          ? { ...x, rules: x.rules.map((r) => (r.id === rid ? { ...r, [field]: value } : r)) }
          : x
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(presets).map((name) => (
          <button key={name} onClick={() => applyPreset(name)} className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-primary/10 hover:border-primary/50 transition-colors">
            {name}
          </button>
        ))}
        <button onClick={() => { setGroups([createGroup()]); setSitemaps([""]); setHost(""); }} className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-red-500/10 hover:border-red-500/50 transition-colors flex items-center gap-1 ml-auto">
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          {groups.map((g, gi) => (
            <div key={g.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group {gi + 1}</p>
                {groups.length > 1 && (
                  <button onClick={() => removeGroup(g.id)} className="text-xs text-muted-foreground hover:text-red-500"><Trash2 size={13} /></button>
                )}
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">User-agent</label>
                <input value={g.userAgent} onChange={(e) => updateGroup(g.id, "userAgent", e.target.value)} placeholder="*" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              {g.rules.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <select value={r.type} onChange={(e) => updateRule(g.id, r.id, "type", e.target.value)} className="bg-muted/50 border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="allow">Allow</option>
                    <option value="disallow">Disallow</option>
                  </select>
                  <input value={r.path} onChange={(e) => updateRule(g.id, r.id, "path", e.target.value)} placeholder="/path/" className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  {g.rules.length > 1 && (
                    <button onClick={() => removeRule(g.id, r.id)} className="text-muted-foreground hover:text-red-500 p-1"><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
              <button onClick={() => addRule(g.id)} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> Add rule</button>
              <div>
                <label className="text-xs font-medium mb-1 block">Crawl-delay <span className="text-muted-foreground">(optional, seconds)</span></label>
                <input value={g.crawlDelay} onChange={(e) => updateGroup(g.id, "crawlDelay", e.target.value)} placeholder="10" type="number" min="0" className="w-24 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
          ))}
          <button onClick={addGroup} className="w-full py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5">
            <Plus size={14} /> Add User-agent Group
          </button>

          {/* Sitemap */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sitemaps</p>
            {sitemaps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={s} onChange={(e) => { const n = [...sitemaps]; n[i] = e.target.value; setSitemaps(n); }} placeholder="https://example.com/sitemap.xml" className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                {sitemaps.length > 1 && (
                  <button onClick={() => setSitemaps(sitemaps.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500 p-1"><Trash2 size={13} /></button>
                )}
              </div>
            ))}
            <button onClick={() => setSitemaps([...sitemaps, ""])} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> Add sitemap</button>
          </div>

          {/* Host */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-xs font-medium mb-1 block">Host <span className="text-muted-foreground">(optional)</span></label>
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="https://example.com" className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>

        {/* Output */}
        <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-20 self-start">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-medium">robots.txt Output</p>
            <button onClick={copyOutput} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed min-h-[200px]">{output || "# Your robots.txt will appear here"}</pre>
        </div>
      </div>
    </div>
  );
}
