React Component Stubs

Files generated under `frontend/src/components/`:
- ui/Button.tsx
- ui/Card.tsx
- ui/Table.tsx
- ui/Modal.tsx
- layouts/Sidebar.tsx
- layouts/Topbar.tsx
- RoleMatrix/RoleMatrix.tsx
- index.ts

Usage

Import components where needed:

```tsx
import { Button, Card, Table, Modal, Sidebar, Topbar, RoleMatrix } from '../components';
```

Tokens
- The design tokens are available in `frontend/src/styles/designTokens.ts`.
- Use `colors` and `typography` to keep styles consistent with the Figma tokens.

Next steps
- Convert the components into framework-styled versions (Tailwind, CSS modules, or styled-components).
- Add Storybook stories for each component for visual testing.
- Wire `RoleMatrix` to back-end role/permission endpoints and integrate optimistic UI updates.
