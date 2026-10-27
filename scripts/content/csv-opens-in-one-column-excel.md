If your CSV opens in Excel with the entire row squeezed into column A, **import the original file through Data → From Text/CSV and choose the delimiter that actually separates its fields**. Check the preview before loading. A comma in the file needs Comma; a semicolon needs Semicolon. Changing the font, widening column A or saving as UTF-8 will not choose the separator for you.

Start with an untouched copy of the export. If Excel has already changed identifiers or dates, splitting the cells later will not necessarily restore the original values.

## Identify the problem before changing settings

| What you see | Likely issue | Best next check |
| --- | --- | --- |
| Readable values separated by commas or semicolons, all in column A | The import delimiter does not match the file | Import again and select the actual delimiter |
| Correct columns, but names contain strange characters | Character encoding | Check File Origin separately from Delimiter |
| Names or addresses break into extra columns | Incorrect quote handling or malformed source data | Inspect quoted fields in the original file |
| IDs lose zeros or long numbers change | Automatic type conversion | Import identifier columns as Text |
| Each entire row is enclosed in one pair of quotes | The source may contain one quoted field per record | Check whether the exporter produced the intended columns |

These are different problems. A CSV can have the correct encoding but the wrong delimiter, or correctly separated columns with incorrectly converted numbers. The goal is to fix the specific layer that failed.

## 1. Check the separator in the original file

Open a copy of the CSV in Notepad or another plain-text editor. Look at the header and several records, not just the first comma you find inside a name.

A comma-delimited example:

```csv
id,name,amount
00123,"Acme, Ltd",19.95
00456,Northwind,24.50
```

This contains **three columns**, not four. The comma inside `"Acme, Ltd"` is part of the name because the field is quoted.

A semicolon-delimited example:

```text
id;name;amount
00123;"Acme, Ltd";19,95
00456;Northwind;24,50
```

Here, the separator is `;`. The commas in the amounts are decimal separators, not field boundaries. Selecting Comma would split the wrong parts of the data.

If the boundaries look like wide spaces, the file may use tabs. Select Tab in the importer and check the preview. The filename extension alone does not establish which separator is present.

Do not replace every semicolon with a comma to make the file “more CSV.” That can turn decimal commas into extra boundaries and alter separators that belong inside quoted text. Reimporting with the right setting is safer than editing every record.

## 2. Import through From Text/CSV instead of opening directly

For desktop Excel versions with this command:

1. Open a blank workbook rather than double-clicking the CSV.
2. Select **Data → From Text/CSV**. Depending on the ribbon, it may sit under **Get Data → From File**.
3. Choose the original export and select **Import**.
4. Set **Delimiter** to Comma, Semicolon, Tab or the appropriate custom separator.
5. Inspect the preview. Confirm that the headers and several records occupy the expected columns.
6. Check **File Origin** if characters are wrong. This is separate from the delimiter.
7. Review data types, then choose **Load** or **Transform Data** as appropriate.

Microsoft's [import and export guide](https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files) explicitly describes changing the delimiter in this preview. It also explains that opening a CSV directly uses Excel's current default data-format settings.

### Protect identifiers before loading

Getting three columns is not enough if `00123` becomes `123`. Where the import dialog offers **Data Type Detection**, select the option not to detect types automatically when you need the initial columns to remain Text. The [Power Query Text/CSV documentation](https://learn.microsoft.com/en-us/power-query/connectors/text-csv) explains this control and warns that inference can be incorrect.

If your version requires the editor, choose **Transform Data** and inspect the applied steps. Remove an unwanted automatic type-conversion step before setting ID columns to **Text**. Set amounts or dates to their intended types separately; use the correct locale for decimal-comma amounts.

The detailed [guide to preserving CSV leading zeros in Excel](/blog/excel-csv-leading-zeros-2026) covers the conversion issue. A delimiter change cannot recreate digits that were already lost in a previously saved file.

![Person reviewing a printed graph alongside a laptop and office paperwork](https://www.byteverse.fyi/blog/csv-utf8/photo-cover.jpg "Check a few known records before accepting an import. Illustrative data-review photograph, not an Excel screenshot. Photo: Artem Podrez / Pexels.")

## 3. Use Text to Columns when the data is already in column A

**Text to Columns** is useful when each CSV record is still intact in one cell and you need a quick worksheet repair. It is not a replacement for returning to the original file when characters, digits or record boundaries have already changed.

1. Make a copy of the worksheet and ensure there is enough empty space for the output.
2. Select the affected cells in column A.
3. Choose **Data → Text to Columns**.
4. Select **Delimited**, then **Next**.
5. Select the actual separator. Clear unrelated delimiters; selecting Space can split names unnecessarily.
6. If fields use double quotes, keep the matching **Text qualifier** and check the preview.
7. Review column formats, choosing **Text** for identifiers that need it.
8. Set an empty **Destination** range before selecting **Finish**.

The destination matters: the resulting columns occupy worksheet cells. Do not send them into existing data you need to keep. Microsoft's [Text to Columns instructions](https://support.microsoft.com/en-us/excel/get-started/split-text-into-different-columns-with-the-convert-text-to-columns-wizard) include choosing that destination before finishing.

For ordinary CSV, leave **Treat consecutive delimiters as one** off. In `00123,,19.95`, the two commas represent an empty middle field. Collapsing them changes the structure. Microsoft documents this option and text qualifiers in the [Text Import Wizard guide](https://support.microsoft.com/en-us/excel/text-import-wizard).

## 4. Check quotes if choosing the delimiter still looks wrong

Quotation marks are part of the file format, not decoration. [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180) describes enclosing fields that contain commas or line breaks in double quotes, and escaping a quote inside a quoted field by doubling it.

For example:

```csv
id,company,note
00123,"Acme, Ltd","Said ""ready"""
```

The expected row is three cells: `00123`, `Acme, Ltd`, and `Said "ready"`.

By contrast, this line contains **one quoted field** under ordinary CSV rules:

```csv
"00123,Acme,19.95"
```

An importer honoring quotes can correctly keep that entire string together. If the exporter meant to produce three fields, repair its export settings or obtain a clean export. Removing every quote is not safe: it would also damage legitimate names containing commas and values containing line breaks.

If the preview looks right initially but records later drift across rows, inspect quoted line breaks and malformed quotes. Power Query's source settings include options for how quoted line breaks are handled; the exact controls depend on the host and version. Do not assume every physical line in the text editor must be a new record.

## 5. Avoid changing Windows settings for a single file

Regional list separators help explain why a CSV can open differently on two computers. However, changing a system-wide list separator just to open one export affects other applications and workflows too. Microsoft explicitly cautions about that global effect.

Prefer selecting the separator during import. It changes how this file is read without altering the computer's defaults.

Also avoid treating Excel's **Use system separators** option as a simple CSV-repair switch. That setting concerns decimal and thousands separators; changing it can affect number display and the delimiter Excel uses when saving. It is a broader change than this import normally needs.

If your team exchanges exports regularly, agree on the delimiter, encoding, identifier columns and expected numeric formats. A short import instruction often prevents repeated repairs on every recipient's computer.

## When the menus differ

This guide's main path is desktop Excel with **From Text/CSV**. Excel for Mac, Excel for the web and older desktop editions do not necessarily expose identical ribbon commands or Power Query options.

On Windows versions that offer the legacy importer, Microsoft's documented route is **File → Options → Data → Show legacy data import wizards → From Text (Legacy)**. Once enabled, use **Data → Get Data → Legacy Wizards → From Text (Legacy)**, choose Delimited, set the separator and qualifier, then assign identifier columns as Text.

If the command is missing, verify your Excel edition and available import options rather than applying a Windows Control Panel fix to a Mac or browser session. Do not install an extension or upload private exports elsewhere just to obtain a delimiter selector.

## Verify the result before saving

For the comma sample above, check all of these:

- Exactly three headers: `id`, `name`, `amount`.
- `Acme, Ltd` remains one name cell.
- `00123` and `00456` retain their leading zeros if imported as Text.
- Both records are present, including any intentionally blank fields.
- Accents and other known characters are still readable.

If only the last check fails, use the separate [CSV UTF-8 troubleshooting guide](/blog/excel-csv-special-characters-utf8). Choosing a different delimiter will not repair garbled characters.

Keep the original export and save a verified workbook copy as **XLSX** when you need Excel to retain column types and workbook formatting. Saving or reopening a CSV does not preserve those workbook settings.

If you control the upstream JSON export, the [JSON to CSV converter](/tools/json-to-csv) lets you choose a delimiter and inspect the output before importing. It does not repair digits or characters already damaged in the source.

## Frequently Asked Questions

### Why does my CSV open in one column in Excel?

The separator Excel used may not match the file, or the source may quote each entire record as one field. Inspect the original text, then import through From Text/CSV and select the actual delimiter. Confirm the preview before loading.

### How do I split a CSV that is already in column A?

Select the intact records, choose Data → Text to Columns → Delimited, and select the actual separator. Check the preview, protect identifier columns as Text, and choose an empty destination. Reimport the original if values or record boundaries were already damaged.

### Should I change my Windows list separator?

Usually not for one file. Selecting a delimiter during import is more targeted. Changing the Windows list separator affects other applications too, so make that broader change only when it is an intentional requirement for your workflow.

### Does saving as UTF-8 fix the column problem?

Not by itself. Encoding controls how bytes become characters; the delimiter controls where fields split. You can have correctly decoded text in one column, or correctly separated columns with garbled names. Check the two settings independently.

### Why does a comma inside a company name create another column?

That field needs correct quoting, and the importer must honor the quote character. With a comma delimiter and double quotes as the qualifier, a quoted company name containing a comma should remain in one cell. Inspect the original before removing or replacing quotes.

## Verification Notes

- Microsoft documentation was checked on October 27, 2026. Ribbon placement and available controls vary by Excel edition and platform.
- The example records were checked with Papa Parse for separators, quoted commas, escaped quotes, empty fields and whole-record quoting. This validates the sample CSV structure, not every Excel build.
- No hands-on Excel installation test or customer file was used for this article. Follow the preview and verify known values before saving over an original.

## Sources and Further Reading

- Microsoft Support: [Import or export text and CSV files](https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files)
- Microsoft Learn: [Power Query Text/CSV connector](https://learn.microsoft.com/en-us/power-query/connectors/text-csv)
- Microsoft Support: [Split text with the Text to Columns Wizard](https://support.microsoft.com/en-us/excel/get-started/split-text-into-different-columns-with-the-convert-text-to-columns-wizard)
- Microsoft Support: [Text Import Wizard](https://support.microsoft.com/en-us/excel/text-import-wizard)
- RFC Editor: [RFC 4180 CSV conventions](https://www.rfc-editor.org/rfc/rfc4180)
- Photos: cover by [Wolf Art](https://www.pexels.com/@wolfart/), inline by [Artem Podrez](https://www.pexels.com/@artempodrez/), via Pexels. Reused licensed data-review photographs; not Excel interface screenshots.