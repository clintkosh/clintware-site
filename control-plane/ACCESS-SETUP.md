# Clintware Control Plane Access Setup

This is the canonical credential setup for `mcp.clintware.com` and the `clintware-control-plane` Worker.

The control plane is the only component that receives infrastructure credentials. Individual products and external AI clients receive scoped control-plane credentials instead.

## Cloudflare

Create a custom API token named `Clintware MCP Control Plane`.

Scope it to the Clintware Cloudflare account and the `clintware.com` zone rather than all Cloudflare accounts/zones.

### Account permissions

- Account Settings: Read
- Workers Scripts: Write
- Workers KV Storage: Write
- Workers R2 Storage: Write
- Workers CI: Write
- D1: Write
- Pages: Write
- Queues: Write
- Workers AI: Write
- Vectorize: Write
- Email Routing Addresses: Write

### Zone permissions

For `clintware.com` only:

- Zone: Read
- DNS: Write
- Workers Routes: Write
- Zone Settings: Write
- Email Routing Rules: Write
- Cache Purge

Do **not** grant Billing, Account API Tokens Write, User API Tokens Write, membership administration, or unrestricted account administration. Those permissions are not needed for normal Clintware builds and would allow unnecessary privilege escalation.

Store the value as:

- Cloudflare Worker secret: `CLOUDFLARE_CONTROL_PLANE_TOKEN`
- GitHub Actions secret used by deployment workflows: `CLOUDFLARE_API_TOKEN`

The same high-coverage token can initially be used for both names. For stronger isolation later, issue separate deployment and runtime tokens with the same resource boundary and narrower permissions.

## GitHub

Create a **fine-grained personal access token** named `Clintware MCP Control Plane`.

- Resource owner: `clintkosh`
- Repository access: `All repositories`
- Prefer a defined expiration and rotate it before expiry.

### Repository permissions

- Actions: Read and write
- Contents: Read and write
- Workflows: Read and write
- Deployments: Read and write
- Pull requests: Read and write
- Issues: Read and write
- Pages: Read and write
- Commit statuses: Read and write
- Variables: Read and write, if the control plane needs to maintain Actions variables
- Environments: Read and write, only if the control plane needs environment configuration
- Metadata: Read (GitHub includes this automatically)

Do **not** grant repository Administration write merely for convenience. It includes destructive repository-management capabilities that the Clintware control plane does not need for normal source, branch, workflow, Pages, and deployment operations.

Store this token only as the Cloudflare Worker secret:

- `GITHUB_CONTROL_PLANE_TOKEN`

For a longer-lived integration, migrate this credential to a GitHub App later. A GitHub App can mint short-lived installation tokens while retaining the same control-plane policy layer.

## Control-plane client secrets

The Worker also uses:

- `CONTROL_PLANE_ADMIN_TOKEN` — administrative control-plane calls
- `CONTROL_PLANE_MCP_TOKEN` — trusted MCP clients

Do not give clients the Cloudflare or GitHub infrastructure credentials. Register each product/client through the control plane and let the product manifest constrain its available capabilities.

## Credential flow

`product / AI client -> scoped MCP token -> mcp.clintware.com -> policy + manifest -> Cloudflare/GitHub credential -> action -> audit`

This preserves one reusable Clintware integration point without exposing a literal global master key to every project.
