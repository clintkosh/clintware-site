# AgentBridge safe sample

This Markdown file contains a machine-readable AgentBridge manifest.  AgentBridge ignores surrounding prose and reads the fenced manifest.

```agentbridge
{
  "agentbridge": "1.0",
  "title": "AgentBridge Markdown sample",
  "workspace": ".",
  "permissions": ["file.write"],
  "steps": [
    {"type": "write_file", "path": "agentbridge-markdown.txt", "content": "Markdown handoff works.\n"}
  ],
  "definition_of_done": [
    {"type": "file_contains", "path": "agentbridge-markdown.txt", "text": "Markdown handoff works"}
  ]
}
```
