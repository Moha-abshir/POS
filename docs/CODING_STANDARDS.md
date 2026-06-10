# Coding Standards

These standards apply across both the backend and frontend. The goal is consistency — any file in the codebase should look like it was written by the same person.

---

## TypeScript

- `"strict": true` is mandatory. No implicit `any`.
- Never use `as any`. If you need to escape the type system, use `as unknown as T` and leave a comment explaining why.
- Prefer `interface` for object shapes that may be extended. Use `type` for unions, intersections, and aliases.
- All function parameters and return types are explicitly typed.
- Never use `Object`, `Function`, or `{}` as a type. Use specific types.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `product-service.ts`, `auth-controller.ts` |
| Variables | `camelCase` | `totalAmount`, `isActive` |
| Functions | `camelCase` | `createSale()`, `findProductById()` |
| Classes | `PascalCase` | `AppError`, `EmailService` |
| Interfaces | `PascalCase` | `CreateSaleDto`, `SaleResponse` |
| Types | `PascalCase` | `PaymentMethod`, `MovementType` |
| Enums | `PascalCase` (members: `UPPER_SNAKE`) | `PaymentMethod.CASH` |
| Constants | `UPPER_SNAKE_CASE` | `OTP_EXPIRY_MINUTES`, `MAX_OTP_ATTEMPTS` |
| DB tables | `snake_case`, plural | `stock_movements`, `sale_items` |
| DB columns | `snake_case` | `created_at`, `unit_price` |
| React components | `PascalCase` | `ProductForm`, `CartItem` |
| React hooks | `camelCase`, prefix `use` | `useCart`, `useProducts` |
| TanStack Query keys | `camelCase` arrays | `['products', { page }]` |
| Zod schemas | `camelCase`, suffix `Schema` | `createProductSchema` |

---

## Backend Patterns

### Controller
Controllers only handle HTTP. They parse the request, call one service method, and send the response. No business logic, no database calls.

```typescript
// catalog.controller.ts
export const createProduct = async (req: Request, res: Response) => {
  const dto = createProductSchema.parse(req.body);
  const product = await catalogService.createProduct(dto, req.user.id);
  sendSuccess(res, product, 'Product created', 201);
};
```

### Service
Services contain all business rules and orchestration. They call repositories and other services. They throw `AppError` for business rule violations.

```typescript
// catalog.service.ts
export const createProduct = async (dto: CreateProductDto, userId: string) => {
  const existing = await catalogRepository.findByName(dto.name);
  if (existing) throw new AppError('CONFLICT', 'A product with this name already exists');

  const product = await catalogRepository.create({ ...dto, createdBy: userId });
  await auditService.log({ userId, action: 'CREATE', entityType: 'PRODUCT', entityId: product.id, newValues: product });
  return product;
};
```

### Repository
Repositories contain all Drizzle queries. They are pure data access — no business logic. They return raw data or throw if the query fails.

```typescript
// catalog.repository.ts
export const findById = async (id: string) => {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: { units: true, category: true }
  });
};
```

### Error Handling
All errors extend `AppError`. The global error handler middleware catches everything.

```typescript
// core/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}
```

Throw errors up. Never catch and swallow in services.

### Validation
All request bodies are validated via Zod before reaching the controller. Use a `validate` middleware or call `.parse()` at the top of the controller.

```typescript
const dto = createSaleSchema.parse(req.body); // throws ZodError on failure
```

---

## Frontend Patterns

### API Queries (TanStack Query)
All server interactions go through TanStack Query hooks. Never call axios directly in a component.

```typescript
// features/catalog/api/catalog.queries.ts
export const useProducts = (params: ProductQueryParams) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => api.get('/products', { params }).then(r => r.data),
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProductDto) => api.post('/products', dto).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
};
```

### Component Rules
- One component per file.
- No component file exceeds ~150 lines. If it does, extract sub-components.
- Props interfaces are defined directly above the component.
- No inline `style` props. Use Tailwind classes.
- Use `cn()` (clsx/tailwind-merge) for conditional class names.

### Form Handling
Use React Hook Form + Zod resolver. Never manage form state manually.

```typescript
const form = useForm<CreateProductDto>({
  resolver: zodResolver(createProductSchema),
});
```

### State Management
- **Server state:** TanStack Query handles all data from the API.
- **Local UI state:** `useState` within the component.
- **Feature state (e.g., cart):** Zustand store in `features/*/stores/`.
- **Global app state (auth):** Zustand store in `features/auth/stores/`.
- Do not use Redux. Do not use React Context for anything that changes frequently.

---

## General Rules

- No `console.log` in committed code. Use the Pino logger on the backend.
- No magic numbers. Put them in `constants.ts`.
- No commented-out code. Use git history instead.
- Functions do one thing. If you need to describe what a function does with the word "and", it should be two functions.
- Prefer early returns over deeply nested `if/else`.
- Every async function has try/catch or lets errors bubble to the global handler intentionally.
