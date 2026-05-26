# Next Portal FE Coding Style

## File Organization

Use this structure for new or refactored frontend work:

- `app/<route>/page.tsx`: route entry point, data/session boundary, route-level composition.
- `app/<route>/components/*`: components only used by that route or route group.
- `components/<feature>/*`: reusable feature components used across routes.
- `components/forms/*`: reusable React Hook Form field wrappers and form shells.
- `components/ui/*`: shadcn/Radix primitives only. Keep them generic and app-wide.
- `lib/api.ts` or `lib/api/<feature>.ts`: typed API functions and DTOs.
- `stores/<feature>-store.ts`: Zustand stores for shared client state.
- `hooks/*`: reusable client hooks without feature-specific UI.

Prefer splitting by responsibility instead of file size alone. Move a component out of a page when it is reused, has its own stateful behavior, or makes the page hard to scan.

## Component Splitting

Keep page components mostly declarative:

```tsx
export default function ProductsPage() {
  return (
    <PortalShell>
      <ProductsToolbar />
      <ProductsTable />
    </PortalShell>
  );
}
```

Use named exports for shared components. Default exports are acceptable for Next route files and route-local page clients when the app already follows that pattern.

Use these naming conventions:

- Components: `ProductForm`, `ProductsTable`, `DeleteProductDialog`.
- Hooks: `useProductFilters`, `useWorkspaceAuth`.
- Stores: `useProductStore`, `useApiWorkspaceStore`.
- Schemas: `productFormSchema`.
- Types: `ProductFormValues`, `ProductFormInput`.

## shadcn UI

Before creating a primitive, check `components/ui/*`. Add missing shadcn components with the local CLI/config where practical, then adjust them to match existing style. Keep primitives generic:

- `components/ui/button.tsx`: button variants, sizes, and `asChild`.
- `components/ui/input.tsx`, `textarea.tsx`, `select.tsx`: raw controls.
- `components/ui/form.tsx` or `form-message.tsx`: primitive form integration.
- `components/forms/*`: app-specific field wrappers with labels, validation messages, and common behavior.

Do not put feature API calls, route navigation, or business-specific copy inside `components/ui/*`.

Use `lucide-react` icons for buttons and controls when an icon exists. Keep icon sizing stable with classes such as `h-4 w-4`.

## Forms

For new forms, create or reuse a reusable wrapper in `components/forms/form.tsx` and field components in `components/forms/*`. Pages and feature components should compose those wrappers:

```tsx
const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  price: z.coerce.number().positive("Price must be greater than 0"),
});

type ProductFormInput = z.input<typeof productSchema>;
type ProductFormValues = z.output<typeof productSchema>;
```

Use `z.input` for `useForm` default values when the form accepts strings that Zod coerces. Use `z.output` for submit handlers after validation:

```tsx
const form = useForm<ProductFormInput, undefined, ProductFormValues>({
  resolver: zodResolver(productSchema),
  defaultValues: {
    name: "",
    price: "0",
  },
});

const onSubmit = form.handleSubmit(async (values) => {
  await createProduct(values);
});
```

If the app has a `Form` provider wrapper like `fe/components/forms/form.tsx`, prefer:

```tsx
<Form<ProductFormValues>
  schema={productSchema}
  defaultValues={{ name: "", price: 0 }}
  onSubmit={createProduct}
>
  <InputField name="name" label="Name" required />
  <InputField name="price" type="number" label="Price" required />
  <Button type="submit">Save</Button>
</Form>
```

Field component rules:

- Accept `name`, optional `label`, optional `description`, and control-specific props.
- Read `control` with `useFormContext`.
- Render `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, and `FormMessage` when that primitive exists.
- Normalize empty values with `field.value ?? ""` for text inputs.
- Keep submit disabling tied to `formState.isSubmitting` or the wrapper's fieldset.
- Show async submit errors with the app's existing alert/toast pattern.

## TanStack React Query

Use React Query for server state in client components. Follow `/fe` examples such as `components/app-layout.tsx`, `hooks/use-select-options.ts`, `hooks/use-form-submission.ts`, `components/report/report-dialog.tsx`, `app/profile/ProfileImagesCard.tsx`, and `app/kyc-verify/page.tsx`.

Provider rules:

- Ensure a single app-level `QueryClientProvider` wraps client UI, usually inside the app shell/layout client component.
- Create the `QueryClient` with `useState(() => new QueryClient())` so it is stable across renders.
- Keep React Query Devtools behind the provider when the app already includes it.

Query rules:

- Use `useQuery` for remote reads and server-derived data. Prefer it over `useEffect` plus `useState` for fetch/loading/error state.
- Use stable, scoped query keys: `['profile']`, `['profileImages', userId]`, `['kycImages', userId]`, `['report-reasons']`.
- Use `enabled` for auth, dialog, route param, or search guards: `enabled: status === 'authenticated'`, `enabled: open`, or `enabled: !!userId`.
- Set `staleTime` for data that can be reused without immediate refetch; `/fe` commonly uses `5 * 60 * 1000` for select options and reasons.
- Disable focus refetch only when the UX should stay stable, as in select-option helpers.
- Expose and render query state from the hook: `isLoading`, `isFetching`, `isError`, `error`, `data`, and `refetch`.
- Render a clear loading state, empty state, and error state. Include a retry/refetch control when the user can recover without leaving the view.
- Use `select` or a small custom hook when multiple components need the same response transformation.

Query example:

```tsx
const {
  data: reasons = [],
  isLoading,
  isError,
  error,
  refetch,
} = useQuery({
  queryKey: ['report-reasons'],
  queryFn: getReportReasons,
  enabled: open,
  staleTime: 5 * 60 * 1000,
});

if (isLoading) return <ReasonSelectSkeleton />;

if (isError) {
  return (
    <InlineError
      message={error instanceof Error ? error.message : 'Failed to load reasons'}
      onRetry={() => refetch()}
    />
  );
}
```

Mutation rules:

- Use `useMutation` for creates, updates, deletes, uploads, and form submits.
- Drive submit buttons and destructive controls from `mutation.isPending`; avoid separate `isSubmitting` state unless the action includes non-query local work.
- Put success and error toasts in `onSuccess`/`onError`, not after every call site.
- Invalidate affected query keys in `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['profileImages', userId] })`.
- Use `mutate` for event handlers that do not need to await the result. Use `mutateAsync` when the caller must sequence UI work such as closing a dialog after completion.
- Use `onMutate` context for optimistic updates and rollback in `onError`, as shown by profile image reordering.
- Surface mutation errors inline when the form or workflow needs persistent feedback, as in KYC submission.

Mutation example:

```tsx
const queryClient = useQueryClient();

const uploadMutation = useMutation({
  mutationFn: ({ sequence, file }: { sequence: number; file: File }) =>
    uploadUserImage(sequence, file),
  onSuccess: (_data, variables) => {
    toast.success(`Uploaded image for slot ${variables.sequence}`);
    queryClient.invalidateQueries({ queryKey: ['profileImages', userId] });
  },
  onError: (error: Error) => {
    toast.error(error.message || 'Failed to upload image');
  },
});

<Button disabled={uploadMutation.isPending}>
  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
</Button>
```

React Query versus Zustand:

- React Query owns server state: fetched data, request status, retry/refetch, mutations, and cache invalidation.
- Zustand owns client/workspace state: selected IDs, drag state, dialogs, filters that are not URL/query params, temporary form wizard state, and cross-component UI coordination.
- Do not duplicate query `data`, `isLoading`, or `error` in Zustand unless a legacy component needs a local copy. If local synchronization is necessary, keep it narrow and update it from one query.

## Zustand

Use Zustand when state is shared across non-parent/child components, persists across route sections, coordinates async API actions, or represents a feature workspace. Keep simple visual state local.

Preferred store shape:

```ts
type ProductState = {
  products: ProductResponseVo[];
  loading: boolean;
  feedback: { kind: "success" | "error"; message: string } | null;
  loadProducts: (accessToken?: string) => Promise<void>;
  createProduct: (payload: ProductFormValues, accessToken?: string) => Promise<void>;
};

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  feedback: null,
  loadProducts: async (accessToken) => {
    set({ loading: true, feedback: null });
    try {
      const products = await fetchProducts(accessToken);
      set({ products });
    } catch (error) {
      set({ feedback: { kind: "error", message: error instanceof Error ? error.message : "Unable to load products" } });
    } finally {
      set({ loading: false });
    }
  },
  createProduct: async (payload, accessToken) => {
    await apiCreateProduct(payload, accessToken);
    await get().loadProducts(accessToken);
  },
}));
```

Store rules:

- Type the full state and every action.
- Keep API calls inside store actions only for client workflows already owned by the store. Prefer React Query for remote reads and mutations in client components.
- Use `finally` to reset loading/saving flags.
- Use `get()` for actions that compose other actions.
- Avoid storing derived data that can be calculated cheaply in selectors or render code.
- Split large stores into `*-slice.ts` or `*-handlers.ts` when actions form separate domains, following `fe/stores/matching-store.ts` and conversation store patterns.
- Keep browser-only reads guarded with `typeof window !== "undefined"` when stores initialize from local storage.

## API And Pages

Create typed API functions in the local API layer. Alias imports when an API function name would collide with a store action:

```ts
export async function createProduct(payload: ProductFormValues, accessToken?: string) {
  const response = await api.post<ProductResponseVo>("/products", payload, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return response.data;
}
```

Pages should pass session/access-token context into stores or API functions; they should not duplicate request construction.

Client components should call API functions through React Query for remote reads and mutations. Server components or route handlers can call API functions directly when no client-side cache or retry state is needed.

## Validation

Run validation from the frontend root that changed:

```bash
npm run lint
```

Run `npm run build` when changing routing, server/client boundaries, Next config, auth wiring, or metadata. If environment variables are missing, report the attempted command and the missing variable.
