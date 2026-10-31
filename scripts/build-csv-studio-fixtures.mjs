/**
 * Writes the byte-exact CSV Studio fixtures. Run once after editing:
 *   node scripts/build-csv-studio-fixtures.mjs
 * Data is fictional (example.com, 555 numbers). The large-file fixture is
 * generated inside the test instead of being committed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../fixtures/csv-studio/", import.meta.url));
mkdirSync(root, { recursive: true });
const utf8 = (text) => Buffer.from(text, "utf8");
const bom = (text) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8(text)]);
const cp1252 = (text) => Buffer.from(Array.from(text, (char) => ({ "€": 0x80, "“": 0x93, "”": 0x94, "’": 0x92, "–": 0x96 })[char] ?? char.charCodeAt(0)));

const fixtures = {
  "01-standard-comma.csv": utf8("id,name,city\n1,Ava,Boston\n2,Liam,Denver\n3,Mia,Austin\n"),
  "02-semicolon.csv": utf8("id;product;price\n1;Widget;1,50\n2;Gadget;2,75\n3;Gizmo;10,00\n"),
  "03-tab-delimited.tsv": utf8("sku\tname\tqty\n001\tBolt, small\t10\n002\tNut\t25\n"),
  "04-utf8-bom.csv": bom("name,email\nAva,ava@example.com\nLiam,liam@example.com\n"),
  "05-unicode-names.csv": utf8("name,city,note\nSofía Ramírez,Bogotá,café ☕\n李雷,北京,你好\nZoë Ørsted,København,emoji 👩‍💻\nمحمد,دبي,مرحبا\n"),
  "06-quoted-commas.csv": utf8("id,address,city\n1,\"123 Main St, Apt 4\",Boston\n2,\"9 Elm Rd, Unit B\",Denver\n"),
  "07-quoted-multiline.csv": utf8("id,notes\r\n1,\"First line\r\nSecond line\"\r\n2,\"One\nTwo\nThree\"\r\n3,plain\r\n"),
  "08-escaped-quotes.csv": utf8("id,quote\n1,\"She said \"\"hello\"\"\"\n2,\"12\"\" ruler\"\n3,\"\"\"\"\n"),
  "09-empty-cells-rows.csv": utf8("a,b,c\n1,,3\n\n,,\n4,5,\n"),
  "10-duplicate-blank-headers.csv": utf8("name,,name,email\nAva,x,Ava2,ava@example.com\n"),
  "11-inconsistent-rows.csv": utf8("a,b,c\n1,2,3\n4,5\n6,7,8,9,10\n11,12,13\n"),
  "12-leading-zero-ids.csv": utf8("customer_id,account\n001234,0000789\n000001,0012\n12345,98765\n"),
  "13-phone-zip.csv": utf8("name,phone,zip,zip4\nAva,(617) 555-0142,02115,02139-4307\nLiam,617-555-0199,07030,10001-0001\nMia,6175550123,2115,30301\n"),
  "14-long-ids.csv": utf8("account_16,account_20\n4111111111111111,12345678901234567890\n9999999999999999,00000000000000000001\n"),
  "15-ambiguous-dates.csv": utf8("label,date\nA,3/4/26\nB,04/03/2026\nC,2026-03-04\nD,Jan-24\nE,12-2024\n"),
  "16-formula-like.csv": utf8("id,value\n1,=1+1\n2,+1234\n3,@SUM(1)\n4,\t=cmd|' /C calc'!A0\n5,-5\n6,＝HYPERLINK(\"x\")\n"),
  "17-empty.csv": Buffer.alloc(0),
  "17b-header-only.csv": utf8("id,name,email\n"),
  "18-malformed-quotes.csv": utf8("id,name,comment\n1,\"Alpha\",ok\n2,\"Beta\"x,text after quote\n3,\"Gamma,never closed\n4,Delta,swallowed\n"),
  "18b-truncated.csv": utf8("id,name,email\n1,Ava,ava@example.com\n2,Liam"),
  "20-windows-1252.csv": cp1252("name,quote,price\nCafé,“smart quotes” – dash,€ 5\nRenée,it’s fine,€ 12\n"),
  "21-mixed-line-endings.csv": utf8("a,b\r\n1,2\n3,4\r\n5,6\r7,8\n"),
  "22-scientific-ids.csv": utf8("id,amount\n4.12E+16,10\n1.23457E+15,20\n"),
  "23-ragged-extra.csv": utf8("id,name\n1,Ava\n2,Liam,unexpected,values\n3,Mia\n"),
  "24-delimiter-trap.csv": utf8("Notes\nCall back tomorrow, after 3pm\nNo answer\nLeft voicemail, will retry, maybe Friday\nAll good\n"),
};

for (const [name, bytes] of Object.entries(fixtures)) writeFileSync(path.join(root, name), bytes);
console.log(`Wrote ${Object.keys(fixtures).length} fixtures to ${root}`);
