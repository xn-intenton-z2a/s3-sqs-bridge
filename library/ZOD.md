# ZOD

## Crawl Summary
Zod provides schema constructors: string, number, boolean, date, any, literal, null, undefined. Composition: object(shape), array(itemSchema), union, discriminatedUnion, intersection. Validation methods: parse, safeParse, parseAsync. Schema refinements: refine, preprocess, transform. Error handling: ZodError.issues with path, message, code; global errorMap; abortEarly disabled. Type inference via Zod.infer. CLI: zod-to-ts for TS types generation.

## Normalised Extract
Table of Contents:
1  Basic Schema Constructors
2  Schema Composition
3  Refinements and Transforms
4  Async Validation
5  Error Handling
6  Type Inference

1  Basic Schema Constructors
   Zod.string()
     Methods: min(length: number, message?: string), max(length: number, message?), email(), url(), uuid(), regex(pattern, message?)
   Zod.number()
     Methods: int(message?), positive(message?), nonnegative(), min(value, message?), max(value, message?), finite()
   Zod.boolean(), Zod.date(), Zod.any(), Zod.unknown(), Zod.literal(value)

2  Schema Composition
   Zod.array(itemSchema)
     Methods: nonempty(message?), min(length, message?), max(length, message?)
   Zod.object(shape)
     Methods: strict(), partial(), deepPartial(), pick(keys), omit(keys), merge(other)
   Zod.union([schemas]), Zod.discriminatedUnion(key, options[]), Zod.intersection(left, right)

3  Refinements and Transforms
   refine(check: val=>boolean, messageOrOptions?)
   transform(transformer: val=>U)
   preprocess(mapper: input=>any, schema)

4  Async Validation
   parseAsync(data): Promise<T>
   Supports async refinements returning Promise<boolean>

5  Error Handling
   safeParse(data)
     Returns success flag and data or ZodError
   ZodError.issues: list of { path, message, code }
   Zod.setErrorMap((issue, ctx)=>{ return { message: custom } })

6  Type Inference
   type T = Zod.infer<typeof schema>

Detailed technical definitions and methods above enable immediate implementation of runtime schemas, validation flows, error formatting, async checks, and TS type generation.

## Supplementary Details
Default parser configuration: abortEarly = false (collect all errors).  errorMap parameter type: (issue: ZodIssue, ctx: { data: any; defaultError: string }) => { message: string }.  Global override: Zod.setErrorMap(errorMap).  Schema merging merges shapes recursively; strict() strips unknown keys.  partial() makes all keys optional.  deepPartial() applies partial to nested objects.  pick([...]) and omit([...]) select or exclude keys at compile & runtime.  preprocess before validation on input.  refine must be last in chain.  transform changes output type.  parseAsync allows await for async refinements.  CLI zod-to-ts: install globally, run npx zod-to-ts <file> --output <dir>, generates .d.ts interfaces.  Integration: use safeParse in API endpoints to avoid thrown exceptions.  Use .safeParseAsync in async handlers.  Always handle both success and error branches.

## Reference Details
ZodStatic interface
 string(): ZodString
 number(): ZodNumber
 boolean(): ZodBoolean
 date(): ZodDate
 literal<T extends string | number | boolean>(value: T): ZodLiteral<T>
 array<T extends ZodTypeAny>(schema: T): ZodArray<T>
 object<T extends ZodRawShape>(shape: T): ZodObject<T>
 union<T extends ZodTypeAny[]>(schemas: [...T]): ZodUnion<T>
 discriminatedUnion<K extends string, T extends ZodDiscriminatedUnionOption[]>(key: K, options: [...T]): ZodDiscriminatedUnion<K, T>
 intersection<A extends ZodTypeAny, B extends ZodTypeAny>(left: A, right: B): ZodIntersection<A, B>
 any(): ZodAny
 unknown(): ZodUnknown
 null(): ZodNull
 undefined(): ZodUndefined

type ZodSafeParseReturn<T> = { success: true; data: T } | { success: false; error: ZodError }
parse<T>(data: unknown): T throws ZodError
safeParse<T>(data: unknown): ZodSafeParseReturn<T>
parseAsync<T>(data: unknown): Promise<T>

ZodString methods:
 min(length: number, message?: string): ZodString
 max(length: number, message?: string): ZodString
 email(message?: string): ZodString
 url(message?: string): ZodString
 uuid(message?: string): ZodString
 regex(pattern: RegExp, message?: string): ZodString

ZodNumber methods:
 int(message?: string)
 positive(message?: string)
 nonnegative(message?: string)
 min(value: number, message?: string)
 max(value: number, message?: string)
 finite(message?: string)

ZodObject methods:
 strict(): ZodObject
 partial(): ZodObject
 deepPartial(): ZodObject
 pick(keys: string[]): ZodObject
 omit(keys: string[]): ZodObject
 merge(other: ZodObject): ZodObject

Validation Examples:
 const UserSchema = Zod.object({ id: Zod.number().int(), name: Zod.string().min(3) })
 const result = UserSchema.safeParse(input)
 if (result.success) console.log(result.data)
 else console.error(result.error.issues)

Best Practices:
 Use safeParse in endpoints to avoid exceptions
 Compose small reusable schemas and merge
 Use strict() to remove extra properties
 Define custom error messages on refinement

Troubleshooting:
 Command: npx ts-node src/index.ts
 Error: ZodError: [ { code: 'invalid_type', expected: 'string', received: 'number', path: ['name'], message: 'Expected string' } ]
 Solution: ensure input types match schema or use preprocess to coerce

## Information Dense Extract
string(): ZodString methods min, max, email, url, uuid, regex; number(): ZodNumber methods int, positive, nonnegative, min, max, finite; boolean(), date(), any(), unknown(), literal(), null(), undefined(); object(shape): ZodObject methods strict, partial, deepPartial, pick, omit, merge; array(item): ZodArray methods nonempty, min, max; union, discriminatedUnion, intersection, record; refine(check, message), transform(fn), preprocess(fn, schema); parse(data): T throws ZodError; safeParse(data): { success, data } | { success, error }; parseAsync(data): Promise<T>; ZodError.issues array of { path, message, code }; errorMap(issue, ctx) => { message }; Zod.setErrorMap; type inference via Zod.infer; CLI zod-to-ts file --output dir; default abortEarly false.

## Sanitised Extract
Table of Contents:
1  Basic Schema Constructors
2  Schema Composition
3  Refinements and Transforms
4  Async Validation
5  Error Handling
6  Type Inference

1  Basic Schema Constructors
   Zod.string()
     Methods: min(length: number, message?: string), max(length: number, message?), email(), url(), uuid(), regex(pattern, message?)
   Zod.number()
     Methods: int(message?), positive(message?), nonnegative(), min(value, message?), max(value, message?), finite()
   Zod.boolean(), Zod.date(), Zod.any(), Zod.unknown(), Zod.literal(value)

2  Schema Composition
   Zod.array(itemSchema)
     Methods: nonempty(message?), min(length, message?), max(length, message?)
   Zod.object(shape)
     Methods: strict(), partial(), deepPartial(), pick(keys), omit(keys), merge(other)
   Zod.union([schemas]), Zod.discriminatedUnion(key, options[]), Zod.intersection(left, right)

3  Refinements and Transforms
   refine(check: val=>boolean, messageOrOptions?)
   transform(transformer: val=>U)
   preprocess(mapper: input=>any, schema)

4  Async Validation
   parseAsync(data): Promise<T>
   Supports async refinements returning Promise<boolean>

5  Error Handling
   safeParse(data)
     Returns success flag and data or ZodError
   ZodError.issues: list of { path, message, code }
   Zod.setErrorMap((issue, ctx)=>{ return { message: custom } })

6  Type Inference
   type T = Zod.infer<typeof schema>

Detailed technical definitions and methods above enable immediate implementation of runtime schemas, validation flows, error formatting, async checks, and TS type generation.

## Original Source
Zod Schema Validation Library
https://zod.dev

## Digest of ZOD

# Zod Schema Validation Library Documentation (Retrieved on 2024-07-15)

# Basic Schemas
Zod.string(): constructs string schema. Methods: min(length: number, message?: string): ZodString; max(length: number, message?): ZodString; email(), url(), uuid(), regex(pattern: RegExp, message?): ZodString.
Zod.number(): constructs number schema. Methods: int(message?), positive(message?), nonnegative(), min(value: number, message?), max(value: number, message?), finite().
Zod.boolean(), Zod.date(), Zod.any(), Zod.unknown(), Zod.literal(value: Literal), Zod.null(), Zod.undefined().

# Schema Composition
Zod.array(schema: ZodType): ZodArray; methods: nonempty(message?), min(length, message?), max(length, message?).
Zod.object(shape: { [key: string]: ZodType }): ZodObject; methods: strict(), partial(), deepPartial(), pick(keys[]), omit(keys[]), merge(other: ZodObject).
Zod.union([schemas]): ZodUnion; Zod.discriminatedUnion(key, options[]): ZodDiscriminatedUnion.
Zod.intersection(left: ZodType, right: ZodType): ZodIntersection.

# Refinements and Transforms
refine(check: (val) => boolean, messageOrOptions?): ZodType. filter on schema.
transform<U>(transformer: (val: T) => U): ZodType<U>.
preprocess(transform: (input) => any, schema: ZodType): ZodType.

# Async Validation
parseAsync(data: unknown): Promise<T>. supports async refinements returning Promise<boolean>.

# Error Handling
safeParse(data: unknown): { success: true; data: T } | { success: false; error: ZodError }. ZodError.issues: array of { path: (string|number)[]; message: string; code: string }.
Set global error map: Zod.setErrorMap((issue, ctx) => { return { message: ctx.defaultError }; }).

# Type Inference
Zod.infer<typeof schema> yields TypeScript type for runtime schema.

# CLI
npx zod-to-ts schema.ts: generate TS interfaces from Zod schemas.


## Attribution
- Source: Zod Schema Validation Library
- URL: https://zod.dev
- License: License: MIT
- Crawl Date: 2025-05-08T04:29:35.154Z
- Data Size: 0 bytes
- Links Found: 0

## Retrieved
2025-05-08
