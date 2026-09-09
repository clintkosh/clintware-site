from pathlib import Path

path = Path("public/work/index.html")
text = path.read_text(encoding="utf-8")

button = '<span class="button button-cyan" aria-disabled="true">Résumé temporarily unavailable</span>'
button_link = '<a class="button button-cyan" href="/work/Clinton_Kosh_Resume.pdf">View résumé</a>'
footer = '<span>Résumé unavailable</span>'
footer_link = '<a href="/work/Clinton_Kosh_Resume.pdf">Résumé</a>'

button_count = text.count(button)
footer_count = text.count(footer)
if button_count != 2 or footer_count != 1:
    raise SystemExit(f"Unexpected resume placeholder counts: buttons={button_count}, footer={footer_count}")

text = text.replace(button, button_link).replace(footer, footer_link)
path.write_text(text, encoding="utf-8")
print("Restored public resume links to sanitized local PDF.")
