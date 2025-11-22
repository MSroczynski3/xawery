# Flag Stub Server

A simple Express server that provides feature flag overrides for e2e testing. This allows deterministic testing without requiring a real LaunchDarkly connection.

## Usage

### Start the server

```bash
cd packages/flag-stubs
pnpm install
pnpm start
```

The server will run on `http://localhost:4000` (configurable via `FLAG_STUB_PORT`).

### Configure flag overrides

Set flags via environment variable:

```bash
FLAG_OVERRIDES='{"product-variants":true,"new-checkout":false}' pnpm start
```

Or modify the default overrides in `src/index.ts`.

### Endpoints

- `GET /features` - Returns feature flags as JSON object
- `GET /health` - Health check endpoint

### Example Response

```json
{
  "product-variants": true,
  "new-checkout": false
}
```

## Integration with E2E Tests

In your e2e tests, you can:

1. Start the flag stub server before running tests
2. Point your application to use `http://localhost:4000/features` instead of LaunchDarkly
3. Set flags deterministically for each test scenario

## Environment Variables

- `FLAG_STUB_PORT` - Port to run the server on (default: 4000)
- `FLAG_OVERRIDES` - JSON string of flag overrides
