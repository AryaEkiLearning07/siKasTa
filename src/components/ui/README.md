# UI Component System

This folder is the shared interface layer for SPENSAKAS. Components here are intentionally small, typed, accessible, and compatible with the existing Tailwind token set in `tailwind.config.js`.

## Architecture

Use three layers:

1. **Primitives**: `Button`, `Input`, `Select`, `Card`, `Modal`, `Tabs`, `Toast`, `Spinner`, `Skeleton`.
2. **Composition helpers**: `PageHeader`, `DataState`, `DataTable`, `EmptyState`.
3. **Domain components**: class, student, payment, and report components in `src/components/class`, `src/components/domain`, and `src/components/admin`.

New product surfaces should import primitives from `@/components/ui` when possible:

```tsx
import { Button, DataState, DataTable, PageHeader } from '@/components/ui'
```

Direct imports such as `@/components/ui/Button` still work for existing screens.

## Component API

### Button

```tsx
<Button
  variant="primary"
  size="md"
  isLoading={isSubmitting}
  loadingText="Menyimpan"
  fullWidth
>
  Simpan
</Button>
```

Props:

- `variant`: `primary | secondary | danger | ghost | outline`
- `size`: `sm | md | lg`
- `isLoading`: disables the button and announces work in progress
- `loadingText`: replaces the label while loading
- `fullWidth`: stretches to the parent width
- `leftIcon` / `rightIcon`: decorative or semantic icon nodes

### Form Controls

`Input` and `Select` generate a stable ID when `id` is omitted. They wire `label`, `hint`, and `error` into accessible relationships.

```tsx
<Input
  label="Username"
  required
  hint="Gunakan username yang dibuat admin atau wali kelas."
  error={errors.username}
  value={username}
  onChange={(event) => setUsername(event.target.value)}
/>
```

```tsx
<Select
  label="Tingkat"
  placeholder="Pilih tingkat"
  value={level}
  onChange={(event) => setLevel(event.target.value)}
  options={[
    { value: '7', label: 'Kelas 7' },
    { value: '8', label: 'Kelas 8' },
    { value: '9', label: 'Kelas 9' },
  ]}
/>
```

### DataState

Use `DataState` to keep loading, error, empty, and success branches consistent.

```tsx
<DataState
  isLoading={isLoading}
  error={error}
  isEmpty={students.length === 0}
  emptyTitle="Belum Ada Siswa"
  emptyDescription="Tambahkan siswa untuk mulai mencatat kas."
>
  <StudentList students={students} />
</DataState>
```

### DataTable

Use `DataTable` for read-heavy admin and report screens. Cells own their rendering, so badges and actions stay flexible.

```tsx
type UserRow = {
  id: string
  name: string
  username: string
  role: string
}

const columns: DataTableColumn<UserRow>[] = [
  {
    id: 'name',
    header: 'Nama',
    cell: (user) => <span className="font-semibold text-brand-ink">{user.name}</span>,
  },
  {
    id: 'username',
    header: 'Username',
    cell: (user) => user.username,
    hideBelow: 'md',
  },
  {
    id: 'actions',
    header: 'Aksi',
    align: 'right',
    cell: (user) => (
      <Button variant="ghost" size="sm" className="text-danger">
        Hapus
      </Button>
    ),
  },
]

<DataTable
  caption="Daftar pengguna"
  rows={users}
  columns={columns}
  rowKey="id"
  isLoading={isLoading}
  emptyTitle="Belum Ada Akun"
  emptyDescription="Akun bendahara akan muncul di sini."
/>
```

### Modal

`Modal` locks page scroll, restores focus, supports Escape/overlay close behavior, and traps Tab focus.

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Tambah Kelas"
  description="Lengkapi detail kelas baru."
  footer={
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>Batal</Button>
      <Button isLoading={isSubmitting}>Simpan</Button>
    </div>
  }
>
  <ClassForm />
</Modal>
```

### Tabs

`Tabs` are controlled and keyboard accessible. Use `idPrefix` with `TabPanel` when you need explicit `aria-controls` linkage.

```tsx
const idPrefix = 'admin-tabs'

<Tabs
  idPrefix={idPrefix}
  activeTab={tab}
  onChange={setTab}
  tabs={[
    { id: 'classes', label: 'Kelas' },
    { id: 'users', label: 'Akun', badge: users.length },
  ]}
/>

<TabPanel idPrefix={idPrefix} tabId="classes" isActive={tab === 'classes'}>
  <ClassesGrid classes={classes} />
</TabPanel>
```

## Best Practices

- Keep data fetching and mutation state in feature/domain components, then pass plain props into UI primitives.
- Prefer `DataState` over custom `if (isLoading)` branches when a screen has loading, empty, and error branches.
- Give every table a `caption`; it is visually hidden but useful for assistive technology.
- Use `Button isLoading` for submit actions and keep optimistic UI rollback close to the mutation.
- Keep destructive actions behind `ConfirmDialog` or a modal confirmation.
- Use `EmptyState` for zero-results and permission states; keep copy specific and actionable.
- Avoid putting page sections inside cards. Use cards for repeated records, modal panels, and compact dashboard summaries.
- Do not encode business meaning in color alone. Pair status colors with text such as `Lunas`, `Belum Bayar`, or `Bebas Kas`.
- Prefer domain components for school-specific behavior. Shared UI components should not know about classes, students, roles, or payments.
