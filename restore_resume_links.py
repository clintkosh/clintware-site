from pathlib import Path

html_path = Path("public/work/index.html")
resume_path = Path("public/work/Clinton_Kosh_Resume.pdf")

if not resume_path.is_file() or resume_path.stat().st_size < 1000:
    raise SystemExit(f"Missing or invalid public resume: {resume_path}")

text = html_path.read_text(encoding="utf-8")

button = '<span class="button button-cyan" aria-disabled="true">Résumé temporarily unavailable</span>'
button_link = '<a class="button button-cyan" href="/work/Clinton_Kosh_Resume.pdf">View résumé</a>'
footer = '<span>Résumé unavailable</span>'
footer_link = '<a href="/work/Clinton_Kosh_Resume.pdf">Résumé</a>'

text = text.replace(button, button_link).replace(footer, footer_link)

button_link_count = text.count(button_link)
footer_link_count = text.count(footer_link)
if button_link_count != 2 or footer_link_count != 1:
    raise SystemExit(
        f"Unexpected resume link counts after restore: buttons={button_link_count}, footer={footer_link_count}"
    )

html_path.write_text(text, encoding="utf-8")
print(f"Verified public resume and restored links ({resume_path.stat().st_size} bytes).")
