# Clintware Meet production verification

This file exists only to provide a harmless source change that can intentionally trigger the protected production book -> reschedule -> cancel workflow when the commit message includes `[meet-e2e]`.

The workflow is responsible for verifying that a live booking creates a Google Calendar event with a Google Meet URL before cleaning up the temporary booking.
Last consent verification trigger: 2026-09-26 06:49 America/Chicago.
