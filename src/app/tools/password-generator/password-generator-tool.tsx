"use client";

import { useState, useCallback, useEffect } from "react";
import { Copy, Check, RefreshCw, Shield, ShieldAlert, ShieldCheck } from "lucide-react";

function generatePassword(length: number, options: { upper: boolean; lower: boolean; numbers: boolean; symbols: boolean }): string {
  let chars = "";
  if (options.upper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (options.lower) chars += "abcdefghijklmnopqrstuvwxyz";
  if (options.numbers) chars += "0123456789";
  if (options.symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";
  if (!chars) chars = "abcdefghijklmnopqrstuvwxyz";

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => chars[n % chars.length]).join("");
}

function getStrength(password: string): { label: string; score: number; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { label: "Weak", score, color: "text-red-500" };
  if (score <= 4) return { label: "Good", score, color: "text-yellow-500" };
  return { label: "Strong", score, color: "text-green-500" };
}

export function PasswordGeneratorTool() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState(1);

  const generate = useCallback(() => {
    const pw = generatePassword(length, { upper, lower, numbers, symbols });
    setPassword(pw);
    setCopied(false);
  }, [length, upper, lower, numbers, symbols]);

  useEffect(() => {
    generate();
  }, [generate]);

  const copyPassword = useCallback(async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [password]);

  const generateMultiple = useCallback(() => {
    const passwords: string[] = [];
    for (let i = 0; i < count; i++) {
      passwords.push(generatePassword(length, { upper, lower, numbers, symbols }));
    }
    setPassword(passwords.join("\n"));
    setCopied(false);
  }, [length, upper, lower, numbers, symbols, count]);

  const strength = getStrength(password.split("\n")[0] || "");
  const StrengthIcon = strength.score <= 2 ? ShieldAlert : strength.score <= 4 ? Shield : ShieldCheck;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Password display */}
      <div className="relative p-4 bg-muted/50 border border-border rounded-lg">
        <pre className="font-mono text-lg break-all whitespace-pre-wrap pr-20 min-h-[2rem]">
          {password}
        </pre>
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={copyPassword}
            className="p-2 rounded-lg bg-background border border-border hover:bg-muted transition-colors"
            title="Copy"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>
          <button
            onClick={count > 1 ? generateMultiple : generate}
            className="p-2 rounded-lg bg-background border border-border hover:bg-muted transition-colors"
            title="Regenerate"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Strength meter */}
      <div className="flex items-center gap-3">
        <StrengthIcon size={18} className={strength.color} />
        <span className={`text-sm font-medium ${strength.color}`}>
          {strength.label}
        </span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              strength.score <= 2 ? "bg-red-500" : strength.score <= 4 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${(strength.score / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Options */}
      <div className="grid sm:grid-cols-2 gap-6 p-6 bg-card border border-border rounded-lg">
        {/* Length slider */}
        <div className="sm:col-span-2">
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium">Length</label>
            <span className="text-sm font-mono text-muted-foreground">{length}</span>
          </div>
          <input
            type="range"
            min={4}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>4</span>
            <span>64</span>
          </div>
        </div>

        {/* Checkboxes */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={upper}
            onChange={(e) => setUpper(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">Uppercase (A-Z)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={lower}
            onChange={(e) => setLower(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">Lowercase (a-z)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={numbers}
            onChange={(e) => setNumbers(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">Numbers (0-9)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={symbols}
            onChange={(e) => setSymbols(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">Symbols (!@#$...)</span>
        </label>

        {/* Multiple passwords */}
        <div className="sm:col-span-2 flex items-center gap-3">
          <label className="text-sm font-medium">Generate multiple:</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-border rounded-lg bg-background"
          >
            <option value={1}>1 password</option>
            <option value={3}>3 passwords</option>
            <option value={5}>5 passwords</option>
            <option value={10}>10 passwords</option>
          </select>
          {count > 1 && (
            <button
              onClick={generateMultiple}
              className="px-4 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors"
            >
              Generate {count}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
