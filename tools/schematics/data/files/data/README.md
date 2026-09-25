# <%= classify(domain) %> Data

This library contains data access services and signal stores for the <%= domain %> domain.

## Usage

Import the service in your feature components:

```typescript
import { <%= classify(domain) %>Service } from '@<%= app %>/<%= domain %>/data';
```

## Structure

- `src/lib/<%= domain %>.service.ts` - Main data service
- `src/lib/<%= domain %>.service.spec.ts` - Service tests
- `src/public-api.ts` - Public API exports
