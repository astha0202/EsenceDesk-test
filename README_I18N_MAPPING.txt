eSenceDesk FIRST-PARTY I18N MAPPING

All HTML pages have been mapped with data-i18n attributes for visible user-facing text.

Pages:
- index.html
- services.html
- aboutus.html
- contact.html
- reviews.html
- privacy-policy.html

Current mapping contains 522 translation keys.

Each locale JSON now contains every mapped key. Existing translations were preserved;
new keys were added with English fallback text so they can be translated one locale at a time.

Do NOT add Google Translate. The existing script.js loads locales/<language>.json and applies
[data-i18n] mappings.

MAPPING_REFERENCE.json contains the complete key -> English source-text dictionary.

Important: Brand names (eSenceDesk), email addresses, phone numbers, and operational identifiers
are intentionally not translated.
