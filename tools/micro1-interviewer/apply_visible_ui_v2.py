from pathlib import Path

p = Path(__file__).with_name('micro1_interviewer.py')
s = p.read_text(encoding='utf-8')

repls = [
('VERSION = "2026.09.21-live1"','VERSION = "2026.09.21-live2-visible"'),
('self.geometry("1240x780")','self.geometry("1280x820")'),
('self.minsize(1000, 650)','self.minsize(980, 650)'),
('''        self.title(APP_NAME)
        self.geometry("1280x820")''','''        self.title(APP_NAME)
        self.geometry("1280x820")
        self.answer_font_size = 18'''),
('''        controls = ttk.Frame(self); controls.pack(fill="x", padx=18, pady=(4,10))
        ttk.Label(controls, text="Audio source:").pack(side="left")
        self.source_var = tk.StringVar(value="System audio (WASAPI loopback)")
        self.source_box = ttk.Combobox(controls, textvariable=self.source_var, state="readonly", width=34,
                                       values=["System audio (WASAPI loopback)", "Microphone"])
        self.source_box.pack(side="left", padx=(6,12))
        ttk.Label(controls, text="Whisper:").pack(side="left")
        self.model_var = tk.StringVar(value="base.en")
        ttk.Combobox(controls, textvariable=self.model_var, state="readonly", width=10,
                     values=["tiny.en", "base.en", "small.en"]).pack(side="left", padx=(6,12))
        self.listen_btn = ttk.Button(controls, text="START LISTENING", style="Accent.TButton", command=self.toggle_listen)
        self.listen_btn.pack(side="left", padx=(0,8))
        ttk.Button(controls, text="PASTE QUESTION", command=self.paste_question).pack(side="left", padx=(0,8))
        ttk.Button(controls, text="EXPORT", command=self.export_session).pack(side="left")
        self.status_var = tk.StringVar(value="Ready. Use System audio for Teams/Zoom/Meet interviewer audio.")
        ttk.Label(controls, textvariable=self.status_var).pack(side="right")
''','''        controls = ttk.Frame(self); controls.pack(fill="x", padx=18, pady=(4,4))
        ttk.Label(controls, text="Audio:").pack(side="left")
        self.source_var = tk.StringVar(value="System audio (WASAPI loopback)")
        self.source_box = ttk.Combobox(controls, textvariable=self.source_var, state="readonly", width=30,
                                       values=["System audio (WASAPI loopback)", "Microphone"])
        self.source_box.pack(side="left", padx=(6,10))
        ttk.Label(controls, text="Whisper:").pack(side="left")
        self.model_var = tk.StringVar(value="base.en")
        ttk.Combobox(controls, textvariable=self.model_var, state="readonly", width=9,
                     values=["tiny.en", "base.en", "small.en"]).pack(side="left", padx=(6,10))
        self.listen_btn = ttk.Button(controls, text="START LISTENING", style="Accent.TButton", command=self.toggle_listen)
        self.listen_btn.pack(side="left", padx=(0,6))
        ttk.Button(controls, text="PASTE QUESTION", command=self.paste_question).pack(side="left", padx=(0,6))
        ttk.Button(controls, text="TEST CARD", command=self.test_card).pack(side="left", padx=(0,6))
        ttk.Button(controls, text="A−", width=3, command=lambda:self.change_answer_font(-2)).pack(side="left", padx=(0,3))
        ttk.Button(controls, text="A+", width=3, command=lambda:self.change_answer_font(2)).pack(side="left", padx=(0,6))
        ttk.Button(controls, text="EXPORT", command=self.export_session).pack(side="left")
        self.status_var = tk.StringVar(value="READY · System audio listens to Teams / Zoom / Meet output")
        status_row = ttk.Frame(self); status_row.pack(fill="x", padx=18, pady=(0,8))
        ttk.Label(status_row, textvariable=self.status_var, foreground="#79e2b8", font=("Segoe UI Semibold", 10)).pack(anchor="w")
'''),
('''        right.columnconfigure(0, weight=1); right.rowconfigure(8, weight=1)''','''        right.columnconfigure(0, weight=1); right.rowconfigure(2, weight=1)'''),
('''        self.answer_var = tk.StringVar(value="Start listening. When a question is detected, the best prepared Micro1 answer will appear here.")
        ttk.Label(right, textvariable=self.answer_var, style="Answer.TLabel").grid(row=2,column=0,sticky="ew")
        ttk.Label(right, text="PROOF TO LAND", style="PanelTitle.TLabel").grid(row=3,column=0,sticky="w",pady=(16,4))
''','''        self.answer_var = tk.StringVar(value="READY. The detected interview answer will appear here in large text. Press TEST CARD to verify visibility before the call.")
        answer_box = ttk.Frame(right, style="Panel.TFrame")
        answer_box.grid(row=2,column=0,sticky="nsew")
        answer_box.columnconfigure(0, weight=1); answer_box.rowconfigure(0, weight=1)
        self.answer_text = tk.Text(answer_box, bg="#020407", fg="#ffffff", insertbackground="#ffffff", relief="solid", bd=1,
                                   highlightthickness=1, highlightbackground="#63d9ff", wrap="word", padx=16, pady=14,
                                   font=("Segoe UI", self.answer_font_size), spacing1=2, spacing3=7)
        self.answer_text.grid(row=0,column=0,sticky="nsew")
        ans_scroll = ttk.Scrollbar(answer_box, orient="vertical", command=self.answer_text.yview)
        ans_scroll.grid(row=0,column=1,sticky="ns")
        self.answer_text.configure(yscrollcommand=ans_scroll.set, state="disabled")
        self._render_answer(self.answer_var.get())
        ttk.Label(right, text="PROOF TO LAND", style="PanelTitle.TLabel").grid(row=3,column=0,sticky="w",pady=(12,4))
'''),
('''        self.answer_var.set(card.answer)
        self.proof_var.set''','''        self.answer_var.set(card.answer)
        self._render_answer(card.answer)
        self.proof_var.set'''),
('''    def next_match(self, delta):
''','''    def _render_answer(self, text):
        if not hasattr(self, "answer_text"):
            return
        self.answer_text.configure(state="normal")
        self.answer_text.delete("1.0", "end")
        self.answer_text.insert("1.0", text)
        self.answer_text.see("1.0")
        self.answer_text.configure(state="disabled")

    def change_answer_font(self, delta):
        self.answer_font_size = max(14, min(30, self.answer_font_size + delta))
        self.answer_text.configure(font=("Segoe UI", self.answer_font_size))
        self.status_var.set(f"Answer text size: {self.answer_font_size} pt")

    def test_card(self):
        self.route_question("How would you handle a duplicate customer account when CRM, billing, and support history disagree?")
        self.status_var.set("TEST CARD VISIBLE · live routing surface is working")

    def next_match(self, delta):
'''),
]

for old, new in repls:
    if old not in s:
        raise SystemExit('Patch anchor missing: ' + old[:80].replace('\n','\\n'))
    s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('Applied visible-answer v2 UI patch')
