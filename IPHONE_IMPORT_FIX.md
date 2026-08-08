# iPhone / Safari import improvements

This version is optimized for large Product Database imports on iPhone/Safari.

- Product imports are written to IndexedDB in batches of 250 using `bulkPut`.
- The UI yields between batches so Safari can repaint and remain responsive.
- Import progress is shown on the Product Database page.
- The Product Database page only renders the first 100 products instead of all rows.
- Product descriptions on Home are fetched only for barcodes used by expiration records, rather than loading the entire product database.
- Product data uses a canonical `matchKey` index for fast barcode matching.
- Blank-barcode rows are skipped and reported.
- Existing product data is upgraded with the new `matchKey` index when the database opens.
