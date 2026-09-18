# vidCRM Knowledge Folder Agent

Local-first ingestion agent for the **Vanish Fluid System**. Point it at a central folder and it recursively scans supported files, extracts text on the local machine, hashes each source, and sends only normalized content and metadata into the approval-gated knowledge pipeline.

## Supported files

- TXT, Markdown, logs, CSV, JSON, XML, HTML
- DOCX
- PPTX
- XLSX
- PDF when `pypdf` is installed

Microsoft Office formats are parsed locally from their Open XML containers. The source binary is not uploaded by this agent.

## Run

```powershell
$env:VIDCRM_INGEST_TOKEN = "<your vidCRM ingest token>"
py .\vidcrm-agent\vidcrm_folder_agent.py "C:\Clintware\CustomerKnowledge" --watch
```

One-shot scan:

```powershell
py .\vidcrm-agent\vidcrm_folder_agent.py "C:\Clintware\CustomerKnowledge"
```

Optional PDF support:

```powershell
py -m pip install pypdf
```

The local `.vidcrm-agent-state.json` records hashes so unchanged files are not retransmitted.

## Knowledge flow

`FILE → LOCAL EXTRACTION → HASH/DEDUPE → AI STRUCTURE → KB/CONTEXT CANDIDATES → HUMAN REVIEW → SHARED KNOWLEDGE → PRE-CALL/TECHNICAL RAMP`

Nothing is silently promoted into durable account truth. Knowledge candidates retain their source path and confidence and require approval in **Knowledge Intake**.
