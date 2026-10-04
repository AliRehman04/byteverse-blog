If **Excel's Get Data From PDF option is missing**, check your Excel platform and license before reinstalling Office. Having Power Query does not mean your edition includes every connector. Microsoft's published Windows comparison marks PDF as included for its Microsoft 365 columns, while its Mac connector list does not include PDF. A missing button, a component-installation error and a PDF that imports incorrectly need different solutions.

**Start here:** on Windows, look under **Data > Get Data > From File > From PDF**. If that entry is absent, identify the product and build first. On Mac, do not spend the afternoon looking for a hidden PDF toggle: the current Mac documentation does not list a native PDF import connector. Ask for the source spreadsheet or use an approved conversion workflow instead.

This is a documentation-based troubleshooting guide, checked on **October 3, 2026**, not a hands-on test of every Excel edition. Where Microsoft's public tables do not settle a version-specific question, that uncertainty is stated below. The goal is to get you to usable, checked data—not promise that one setting will restore a feature your installation may not support.

## Match your situation before trying a fix

The word “Excel” can mean a Windows desktop installation, a Mac subscription, a perpetual Office license or a workbook open in a browser. Start with that distinction rather than comparing your ribbon with the first screenshot you find.

| Your situation | What the documentation establishes | Appropriate next step |
| --- | --- | --- |
| Microsoft 365 desktop Excel on Windows | PDF is included in the Windows Microsoft 365 columns of Microsoft's connector matrix | Check the menu path, actual product/build and supported Office updates |
| Standalone Office 2016 or 2019 on Windows | Power Query is present, but PDF is not marked included in those columns | Use a source CSV/XLSX or another approved conversion method |
| Excel 2021, 2024 or an LTSC installation | The cited Windows matrix does not provide separate columns for these editions | Verify the exact SKU and build with Microsoft or your administrator; do not assume either outcome |
| Microsoft 365 Excel on Mac | Power Query exists; PDF is absent from the documented Mac source list | Import a supported intermediate format rather than search for a PDF-enabling add-in |
| Excel in a web browser | The web matrix lists PDF among SharePoint/OneDrive work-or-school files with organizational authentication | Check that specific web workflow; it is not the Windows local-file menu |
| From PDF exists but requests additional components | This is a runtime/import error, not an absent-menu symptom | Follow the Excel-specific component guidance and your organization's update policy |
| The PDF opens, but tables are empty or wrong | Availability has been established; extraction quality is now the issue | Inspect the document, selected tables and data types |

The [Microsoft connector availability matrix](https://support.microsoft.com/en-us/excel/power-query-data-sources-in-excel-versions) is the source for those distinctions. Its Windows table still uses older edition columns and plan labels. Treat it as evidence for what it actually lists, not a complete buying guide for every current license.

## 1. Identify the installation, not just the Excel icon

On Windows, open **File > Account** and read **Product Information**. Record the product name and then select **About Excel** for the full version/build and whether Office is 32-bit or 64-bit. On Mac, use **Excel > About Excel**. A workbook filename, the appearance of the ribbon or the fact that a Microsoft account is signed in does not identify the installed license by itself.

Microsoft's [version-identification instructions](https://support.microsoft.com/en-us/office/about-office-what-version-of-office-am-i-using-932788b8-a3ce-44bf-bb09-e334518b8b19) explain where the product information lives. Keep the edition and build together: “Office Professional Plus 2019 on Windows” is useful evidence; “the latest Excel” is not precise enough for support.

Also distinguish a missing command from a hidden ribbon. If the whole ribbon is collapsed on Windows, **Ctrl+F1** expands or collapses it. If the Data tab itself is missing, inspect the checked tabs under **Customize the Ribbon**. Do not reset all customizations as a first step; Microsoft notes that this also resets the Quick Access Toolbar. Restoring a visible tab does not install an unsupported connector.

Finally, confirm whether the workbook is open in desktop Excel or in a browser. A Microsoft 365 subscription does not make their interfaces and connector workflows identical. Record that distinction before comparing your setup with a coworker's working machine.

![Laptop with a blank screen beside a calculator and an open notebook on a wooden desk](https://images.pexels.com/photos/16139628/pexels-photo-16139628.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Identify the installed product before changing it. Photo: Jakub Zerdzicki / Pexels; illustrative workspace, not an Excel settings screenshot.")

## 2. If you use Microsoft 365 on Windows, check the supported path

Open a blank workbook and look for **Data > Get Data > From File > From PDF**. This is the route in Microsoft's [Excel import instructions](https://support.microsoft.com/en-us/office/import-data-from-data-sources-power-query-be4330b3-5356-486c-a168-b68e9e616f5a). Do not confuse it with inserting a PDF as an object or exporting the workbook to PDF; neither imports the document's tables.

If the connector should be available for your installation, save your work and use the supported update process: **File > Account > Update Options > Update Now**. Microsoft's [Windows Office update guide](https://support.microsoft.com/en-us/office/install-office-updates-2ab296f3-7f03-43a2-8e50-46de917611c5) notes that **Enable Updates** may appear first. Reopen Excel after an approved update and check the menu again.

If Update Options is missing, do not conclude that Office is damaged. Microsoft says a volume-license installation or organization-managed updates can produce that interface. Ask your help desk about the installed product and update mechanism instead of changing update channels, running registry scripts or downloading an unrelated connector package.

If the command remains missing, the useful next step is a support request containing the edition, build, platform and a screenshot of the expanded menu. If it worked before, include the last known working date and any installation or account changes. Those observations help investigate the cause; they do not prove that signing out, reinstalling Office or buying a different license will fix it.

## 3. Why Power Query on Mac does not imply PDF support

Microsoft's [Power Query guide for Excel on Mac](https://support.microsoft.com/en-us/excel/import-and-shape-data-in-excel-for-mac-power-query) documents sources such as Excel workbooks, Text/CSV, XML and JSON. Its Power Query Editor is generally available to Microsoft 365 subscribers on **version 16.69 (23010700) or later**. That version requirement is for the editor—not a statement that a From PDF connector was added.

This matters when a tutorial says “update Excel to get Power Query.” You may successfully update, open the editor and still not have the Windows PDF import option. The current Mac source list does not document it. Do not present installing a COM add-in, copying a Windows ribbon layout or pasting an M function into a blank query as a supported way around that difference.

A practical Mac workflow is to obtain CSV or XLSX from the sender, bank portal or business system, then import that supported format. Where only a PDF exists, use a conversion or OCR product that your organization approves, review the exported data and bring that result into Excel. The conversion takes place before the spreadsheet workflow; it does not add a native PDF connector to Mac Excel.

Opening a workbook that contains values previously imported on Windows is another separate case. Being able to read those cells does not establish that the original PDF query can refresh on the Mac. For collaboration, agree whether you are sharing a static data snapshot or a refreshable query, and identify which supported environment owns refreshes.

For what to do with a verified table afterward, our [Excel and Google Sheets workflow guide](/blog/how-to-use-ai-in-excel-google-sheets-2026) covers analysis and cleanup. Formula assistance comes after correct data import; it is not evidence that a missing connector has become available.

![Two colleagues working with laptops, paper documents and a calculator at an office table](https://images.pexels.com/photos/7654132/pexels-photo-7654132.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Agree whether a shared workbook contains a snapshot or a query that must refresh. Photo: Pavel Danilyuk / Pexels; stock illustration, not an author test.")

## 4. Be careful with Excel 2016, 2019, 2021 and 2024 advice

Windows Excel 2016 and later include the Power Query experience, but Microsoft's feature table shows differences between editions. In its Office 2016 and 2019 standalone columns, the PDF row is not marked included—even where other advanced connectors are. Seeing **Get Data**, **From Text/CSV** or **Blank Query** is therefore not proof that PDF import should appear.

For Excel 2021, Excel 2024 and LTSC licenses, the same table does not provide separate Windows columns that settle every case. Some third-party guides give confident yes/no answers for these editions. The reviewed primary sources do not justify turning those claims into a universal compatibility promise here.

Check the exact product and build with Microsoft or your administrator before paying for an upgrade specifically to obtain PDF import. Updating an installation and upgrading its license are different operations. Neither should be recommended blindly on the strength of a generic “Applies To” banner at the top of a support article.

The same caution applies to older Power Query add-in advice. An add-in instruction written for an older Excel generation is not automatically relevant to a version where Get & Transform is built in. No add-in workaround is needed for the documented Microsoft 365 Windows menu, and the sources above do not establish one that adds native PDF import to Mac Excel.

## 5. If From PDF exists but asks for additional components

An error that appears after selecting the PDF connector is a different branch. Microsoft's Excel import article explicitly discusses the message **“This connector requires one or more additional components to be installed before it can be used.”** In its PDF section, it specifies **.NET Framework 4.5 or higher**.

There is a documentation caveat worth knowing: the broader, newer [Power Query PDF connector reference](https://learn.microsoft.com/en-us/power-query/connectors/pdf) currently lists **“Prerequisites: None.”** The sources are not perfectly aligned. Follow the Excel-specific instructions for that exact error and have IT verify the appropriate supported components for your Windows installation. Do not download an obsolete framework installer just because a tutorial repeats “4.5.”

Most importantly, do not treat this component guidance as proof that .NET will create an absent PDF menu. The documented error is about using the connector. If the command is missing altogether, return to the platform and edition checks instead of applying an error-specific fix to a different symptom.

## 6. When import opens but the PDF data is wrong

Once **Navigator** opens and shows PDF tables, you have passed the availability question. Choose the relevant table and use **Transform Data** to inspect it before loading. An empty preview, misplaced columns or missing rows now needs document-level investigation, not another search for an enable-connector switch.

Try selecting text in the PDF and copying a small, non-sensitive value into a text editor. An image-only scan may have no searchable text layer; an existing OCR layer may contain recognition errors. Adobe's [OCR guidance](https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/recognize-text.html) explains how recognition adds searchable text. Do not rely on PDF import as an OCR workflow, and do not assume that successful OCR guarantees accurate rows or amounts.

Inspect the first, middle and last pages. Repeated headers can become data rows, a description can wrap onto another line, and the last page may use a different layout. Microsoft specifically discusses multiline-row cleanup with **Table.FillDown** or **Table.Group** where appropriate. Neither is a universal cleanup recipe: filling down every blank or deleting every error can change legitimate records.

For a large document in a **supported Power Query environment**, the PDF reference suggests inspecting smaller page ranges. This optional M example limits discovery to pages 1–2 and stops automatic combining of similar consecutive-page tables:

```powerquery
let
    Source = Pdf.Tables(
        File.Contents("C:\YourFolder\sample.pdf"),
        [StartPage = 1, EndPage = 2, MultiPageTables = false]
    )
in
    Source
```

Replace the example path with an authorized local PDF. This is a documentation-based example, **not runtime-tested in Excel**, and not a workaround for an unsupported Mac connector. It returns the outer navigation table, including nested **Data** tables; it does not automatically produce one clean row per invoice. Inspect the returned items and select the intended table before expanding anything. See the [Pdf.Tables reference](https://learn.microsoft.com/en-us/powerquery-m/pdf-tables) for the option definitions.

Keep page or source-file references while cleaning financial data. Compare row counts, identifiers, signs and totals with the original. A matching grand total alone cannot rule out swapped fields, missing descriptions or compensating errors. If several invoices have different layouts, do not assume a single folder-combine transformation will correctly map them all.

![Black-and-white close-up of printed accounting tables, charts and a business summary](https://images.pexels.com/photos/6779226/pexels-photo-6779226.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Readable columns on paper are not proof of correctly extracted spreadsheet cells. Photo: Artem Podrez / Pexels; illustrative printed report.")

## 7. Alternatives that solve the data task without restoring the button

**Ask for structured data first.** A source CSV or XLSX usually avoids reconstructing a visual PDF layout. Ask the sender whether the same report can be exported from the original system, including the date convention and currency. Keep the PDF as a reference for checking the result.

**Use an approved PDF converter when necessary.** Decide whether you need table extraction, OCR or just document search; these are not interchangeable. Our [PDF tools comparison](/blog/best-ai-pdf-tools-2026) discusses those broader categories. Check the product's supported document types, retention and processing location before uploading confidential invoices. A “free” label is not permission to share employer or client records.

**Treat Word conversion as an optional bridge, not a guaranteed table extractor.** Microsoft's [PDF-in-Word guide](https://support.microsoft.com/en-us/office/edit-a-pdf-b2d1d729-6b79-499a-bcdb-233379c2f63a) says conversion works best with mostly text documents and can change layout. Where your Word version supports opening that PDF, inspect the converted table before copying it. This is not a promise that every Word edition or Mac workflow supports PDF opening, or that complex invoice columns will survive intact.

**Use JSON only when it is the actual source format.** If your business application supplies an authorized JSON export rather than a PDF, our [JSON to CSV converter](/tools/json-to-csv) can help prepare a spreadsheet file. It does not read PDFs or restore Excel's PDF connector. Avoid sending confidential source records to a public tool unless the data-handling arrangement is approved.

## 8. Preserve identifiers and dates in the replacement file

A successful conversion is not the end of the check. Spreadsheet software can interpret text-looking numbers and dates automatically. Consider this **synthetic CSV**, where the sender defines dates as **day/month/year**:

```csv
InvoiceID,InvoiceDate,Amount
000123,03/10/2026,125.50
000124,04/10/2026,240.00
```

The first date means **3 October 2026**, not March 10. The invoice ID is **000123**, not 123. Import through Text/CSV and inspect the transformation steps rather than double-clicking the file and assuming Excel chose correctly.

Preserve the identifier column as **Text before numeric conversion**. If Power Query already added a **Changed Type** step that stripped zeros, remove or replace the relevant conversion and return to the original text—not simply change the damaged number back to Text. The missing digits cannot be recovered reliably from that converted value alone.

For dates, Microsoft's [data-type and locale guidance](https://learn.microsoft.com/en-us/power-query/data-types) documents **Change Type > Using Locale**. Remove or replace any earlier incorrect date conversion first, then apply this step to the original text. For this example, choose Date with **English (United Kingdom)** and verify **day 3, month 10**. Changing the locale of an already misinterpreted date does not recreate the original text. Choose the locale matching the real source, not the language of this article, and inspect amount separators too.

If you need to inspect textual changes between two sanitized exports, our [Diff Checker](/tools/diff-checker) can highlight line differences. It is not an accounting reconciliation tool and cannot certify that a conversion is correct. The final check remains comparison with the original authorized source.

![Printed green bar charts and line graphs beside a spiral notebook](https://images.pexels.com/photos/8062366/pexels-photo-8062366.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788 "Check the underlying values before using a converted report. Photo: Nataliya Vaitkevich / Pexels; illustrative charts, not measured Excel results.")

## What to send to your help desk

Keep the report short and specific. Include the platform, desktop versus web, exact Office product/build, whether all of Get Data is missing or only From PDF, and the exact error if one appears. Add a cropped menu screenshot with account identifiers removed and list the safe checks already attempted.

Use a small synthetic PDF if support needs a reproduction. Do not post a real bank statement, invoice, product key or account token in a public forum. A useful report lets the next person distinguish unsupported availability, a local installation problem and a troublesome document without guessing.

**Bottom line:** verify support before changing the installation. If the connector is unavailable in your environment, use a supported data format. If the connector opens, investigate the PDF and imported values. These are different jobs, and treating them separately saves unnecessary reinstalls.

## Frequently Asked Questions

### Why is Get Data From PDF missing in Excel?

Connector availability differs by platform and edition. Microsoft's published Windows matrix marks PDF included for its Microsoft 365 columns but not the displayed Office 2016/2019 standalone columns. Its Mac source list does not include PDF. Identify the exact product and build before treating the missing menu as a broken installation.

### Can Excel for Mac import a PDF through Power Query?

The current Microsoft Mac documentation lists Power Query but does not list a native PDF import connector. Version 16.69 or later is the documented Microsoft 365 Mac requirement for the Power Query Editor, not a PDF-support guarantee. A source CSV/XLSX or an approved conversion workflow is the practical alternative.

### Does Excel 2019 include the From PDF option?

The Office 2019 standalone columns in Microsoft's published connector matrix do not mark PDF as included. Having Get Data or other Power Query connectors does not establish PDF support. Verify whether the installed product is actually Office 2019 or a Microsoft 365 subscription before following edition-specific advice.

### Is PDF import available in every Excel 2021 or 2024 edition?

The cited Windows comparison does not separately document every Excel 2021, 2024 or LTSC edition. This guide therefore does not promise universal support or universal absence. Confirm the exact SKU and build with Microsoft or your administrator before purchasing or reinstalling software for this feature.

### Will installing .NET restore the missing From PDF menu?

That is not established by the cited guidance. Microsoft's Excel PDF-import article associates .NET Framework 4.5 or higher with an additional-components error when using the connector. A missing menu is a different symptom. Check platform and edition first; follow approved component guidance only when it matches the actual error.

### Why does the PDF import open but show empty or incorrect tables?

The command is available, so investigate the document and selected tables. Image-only scans, imperfect OCR, repeated headers, wrapped rows and changing page layouts can complicate extraction. Inspect smaller sections and compare the results with the original instead of assuming that loading without an error means accurate data.

### Can a Power Query M formula add PDF support to an unsupported environment?

A formula using Pdf.Tables calls that environment's existing PDF functionality; it does not install a missing connector. Use page-range options only where PDF import is supported. Copying a Windows query into a Mac workbook is not a documented way to add native Mac PDF import.

### How do I avoid losing leading zeros after converting PDF to CSV?

Import the CSV deliberately and keep identifier columns as Text before numeric conversion. Inspect or replace an automatic Changed Type step if necessary. Use the source's date locale as well. Turning an already-converted number back into text cannot reliably reconstruct its original leading zeros.

## Sources and Image Credits

Product documentation reviewed October 3, 2026: Microsoft [Power Query source availability by Excel version](https://support.microsoft.com/en-us/excel/power-query-data-sources-in-excel-versions), [Power Query on Mac](https://support.microsoft.com/en-us/excel/import-and-shape-data-in-excel-for-mac-power-query), [Excel import instructions](https://support.microsoft.com/en-us/office/import-data-from-data-sources-power-query-be4330b3-5356-486c-a168-b68e9e616f5a), [PDF connector reference](https://learn.microsoft.com/en-us/power-query/connectors/pdf), [Pdf.Tables options](https://learn.microsoft.com/en-us/powerquery-m/pdf-tables), [Office version identification](https://support.microsoft.com/en-us/office/about-office-what-version-of-office-am-i-using-932788b8-a3ce-44bf-bb09-e334518b8b19), [Mac Excel version menu](https://support.microsoft.com/en-us/office/collab-files/sharing-documents-with-other-versions-of-office-for-mac#bmxl), [Windows Office updates](https://support.microsoft.com/en-us/office/install-office-updates-2ab296f3-7f03-43a2-8e50-46de917611c5), [ribbon visibility](https://support.microsoft.com/en-us/office/show-or-hide-the-ribbon-in-office-d946b26e-0c8c-402d-a0f7-c6efa296b527), [ribbon customization](https://support.microsoft.com/en-us/office/customize-the-ribbon-in-office-00f24ca7-6021-48d3-9514-a31a460ecb31), [data types and locale](https://learn.microsoft.com/en-us/power-query/data-types), [leading zeros](https://support.microsoft.com/en-us/excel/keeping-leading-zeros-and-large-numbers), [PDF conversion in Word](https://support.microsoft.com/en-us/office/edit-a-pdf-b2d1d729-6b79-499a-bcdb-233379c2f63a), and Adobe [OCR guidance](https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/recognize-text.html). Platform features and documentation can change. No Windows/Mac compatibility or extraction benchmark was performed for this article.

Photos are licensed illustrations, not screenshots of the author's Excel installation: cover by [Mikhail Nilov](https://www.pexels.com/photo/a-person-holding-a-black-pen-8296983/); body images by [Jakub Zerdzicki](https://www.pexels.com/photo/computer-with-financial-calculator-16139628/), [Pavel Danilyuk](https://www.pexels.com/photo/people-working-at-the-office-7654132/), [Artem Podrez](https://www.pexels.com/photo/businessman-person-space-laptop-6779226/) and [Nataliya Vaitkevich](https://www.pexels.com/photo/white-printer-paper-on-brown-table-8062366/), used under the [Pexels license](https://www.pexels.com/license/).