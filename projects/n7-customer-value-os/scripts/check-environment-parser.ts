import { demoProvider } from "../src/lib/n7/environment-provider";

const cases = [
  { input: "one server running windows 98", nodes: 1, edge: false, detail: "Windows 98" },
  { input: "laptop connects through vpn to salesforce", nodes: 3, edge: true },
  { input: "two linux servers behind a firewall talking to postgres", nodes: 4, edge: true, detail: "Linux" },
  { input: "okta authenticates users into servicenow", nodes: 3, edge: true },
  { input: "we have FredServer and a thing called BlueBox that syncs nightly", nodes: 2, edge: true },
  { input: "AWS EC2 hosts an API that writes to RDS", nodes: 3, edge: true },
] as const;

for (const item of cases) {
  const result = await demoProvider.generate({
    customerId: "parser-check",
    freeText: item.input,
    approvedSourceTitles: [],
  });
  if (result.nodes.length < item.nodes) {
    throw new Error(`Expected at least ${item.nodes} nodes for: ${item.input}`);
  }
  if (item.edge && result.edges.length === 0) {
    throw new Error(`Expected at least one relationship for: ${item.input}`);
  }
  if (item.detail && !result.nodes.some((node) => node.detail.includes(item.detail))) {
    throw new Error(`Expected node detail to include ${item.detail} for: ${item.input}`);
  }
}

console.log(`Environment parser checks passed: ${cases.length}`);