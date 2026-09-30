import os
import tempfile
import unittest
from unittest import mock

from agentbridge_node import prompt_ticket as tickets

class PromptTicketTests(unittest.TestCase):
    def test_ticket_lifecycle_and_open_reconciliation(self):
        with tempfile.TemporaryDirectory() as td:
            with mock.patch.dict(os.environ, {"QUILLGEIST_HOME": td}, clear=False):
                first = tickets.open_ticket("finish the health repair")
                self.assertEqual(first.status, "in_progress")
                self.assertEqual([x.ticket_id for x in tickets.open_tickets()], [first.ticket_id])
                closed = tickets.set_status(first.ticket_id, "verified_done", "tests passed")
                self.assertEqual(closed.status, "verified_done")
                self.assertEqual(tickets.open_tickets(), [])

    def test_contract_requires_explicit_terminal_state(self):
        contract = tickets.ticket_contract()
        self.assertTrue(contract["no_silent_stop"])
        self.assertIn("blocked", contract["terminal_states"])
        self.assertIn("carried_forward", contract["terminal_states"])
        self.assertIn("verified_done", contract["terminal_states"])

if __name__ == "__main__":
    unittest.main()
