## 0.8.0 (2026-04-08)

* feat: 🎸 extract s.coerce into standalone opt-in module ([20329ad](https://github.com/mjancarik/esmj-schema/commit/20329ad))

### BREAKING CHANGE

* 🧨 Move the coerce implementation from src/index.ts into a new
src/coerce.ts side-effect module, matching the pattern ofstring.ts /
number.ts / array.ts. s.coerce is an empty object by default — methods
are only availableafter importing the coerce module:  import
'@esmj/schema/coerce';        // side-effect only  import { s } from
'@esmj/schema/coerce'; // re-exports index.ts  import { s } from
'@esmj/schema/full';   // includes all modulesWithout this import,
calling any s.coerce method throws at runtime.TypeScript enforces this
through the empty CoerceInterface./
## <small>0.7.4 (2026-04-07)</small>

* feat: 🎸 extract schema factories as tree-shakeable named export ([eae8c8c](https://github.com/mjancarik/esmj-schema/commit/eae8c8c))
* refactor: 💡 not craete new object for every single parse call ([2e0dbf1](https://github.com/mjancarik/esmj-schema/commit/2e0dbf1))
* chore: 🤖 add ajv framework ([ca6c136](https://github.com/mjancarik/esmj-schema/commit/ca6c136))
* chore: 🤖 fix sideEffects in package.json ([0beb50c](https://github.com/mjancarik/esmj-schema/commit/0beb50c))
## <small>0.7.3 (2026-03-27)</small>

* chore: 🤖 fix TS types for typescript@6 ([dfe63df](https://github.com/mjancarik/esmj-schema/commit/dfe63df))
* chore: 🤖 update dependencies ([37b8be9](https://github.com/mjancarik/esmj-schema/commit/37b8be9))
* ci: 🎡 return back npm install ([2fb75d6](https://github.com/mjancarik/esmj-schema/commit/2fb75d6))
* ci: 🎡 update versions ([8e6321c](https://github.com/mjancarik/esmj-schema/commit/8e6321c))
* ci: 🎡 use package-lock files ([9d0d43d](https://github.com/mjancarik/esmj-schema/commit/9d0d43d))
* feat: 🎸 add function type to schema ([768d97e](https://github.com/mjancarik/esmj-schema/commit/768d97e))
## <small>0.7.2 (2026-03-13)</small>

* feat: 🎸 add s.cast namespace for programmer-friendly coercion ([f2a984b](https://github.com/mjancarik/esmj-schema/commit/f2a984b))
* feat: 🎸 add s.coerce namespace for type coercion ([98bb3a5](https://github.com/mjancarik/esmj-schema/commit/98bb3a5))
* docs: ✏️ update library size ([c8381d3](https://github.com/mjancarik/esmj-schema/commit/c8381d3))



## <small>0.7.1 (2026-03-13)</small>

* feat: 🎸 add catch() method for fallback on parse failure ([9c58f06](https://github.com/mjancarik/esmj-schema/commit/9c58f06))



## 0.7.0 (2026-02-12)

* feat: 🎸 added support for literals ([4a1f1d9](https://github.com/mjancarik/esmj-schema/commit/4a1f1d9))
* chore: 🤖 update documentation ([f2c5907](https://github.com/mjancarik/esmj-schema/commit/f2c5907))



## 0.6.0 (2025-10-23)

* chore: 🤖 remove type module from package.json ([22d5187](https://github.com/mjancarik/esmj-schema/commit/22d5187))
* docs: ✏️ update package size ([d8e33eb](https://github.com/mjancarik/esmj-schema/commit/d8e33eb))



## <small>0.5.1 (2025-10-17)</small>

* chore: 🤖 add examples to npmignore ([4d86e27](https://github.com/mjancarik/esmj-schema/commit/4d86e27))
* chore: 🤖 add tsconfig to npmignore ([89c4353](https://github.com/mjancarik/esmj-schema/commit/89c4353))
* chore: 🤖 fix build and entry points ([885ab2f](https://github.com/mjancarik/esmj-schema/commit/885ab2f))



## 0.5.0 (2025-10-17)

* feat: 🎸 add new extended methods for string,number,arrays ([9ffc561](https://github.com/mjancarik/esmj-schema/commit/9ffc561))
* docs: ✏️ update module size ([e18755b](https://github.com/mjancarik/esmj-schema/commit/e18755b))
* chore: 🤖 remove comments ([7295587](https://github.com/mjancarik/esmj-schema/commit/7295587))
* chore: 🤖 update dev dependencies ([73c6767](https://github.com/mjancarik/esmj-schema/commit/73c6767))


### BREAKING CHANGE

* 🧨 The types were changed. The optional and nullable change behaviour to be
more like zod methods. The optional in chain not allow invalid values to
be transformed to undefined. The nullable in chain allow only valid type
or null.


## 0.4.0 (2025-09-16)

* feat: 🎸 add abortEarly parseOption ([fc4843b](https://github.com/mjancarik/esmj-schema/commit/fc4843b))



## <small>0.3.6 (2025-08-08)</small>

* chore: 🤖 add more keywords ([9003cda](https://github.com/mjancarik/esmj-schema/commit/9003cda))



## <small>0.3.5 (2025-08-07)</small>

* docs: ✏️ add other popular library for comparison section ([e223827](https://github.com/mjancarik/esmj-schema/commit/e223827))



## <small>0.3.4 (2025-08-01)</small>

* fix: 🐛 options.message can be always string or function ([8a6f471](https://github.com/mjancarik/esmj-schema/commit/8a6f471))



## <small>0.3.3 (2025-07-20)</small>

* fix: 🐛 typescript types ([1410a7f](https://github.com/mjancarik/esmj-schema/commit/1410a7f))



## <small>0.3.2 (2025-06-27)</small>

* docs: ✏️ update documentation ([5dfa1ce](https://github.com/mjancarik/esmj-schema/commit/5dfa1ce))
* docs: ✏️ update library size ([1128d0f](https://github.com/mjancarik/esmj-schema/commit/1128d0f))



## <small>0.3.1 (2025-06-26)</small>

* feat: 🎸 allow define custom erro message ([d4f8fe8](https://github.com/mjancarik/esmj-schema/commit/d4f8fe8))



## 0.3.0 (2025-06-13)

* feat: 🎸 add union method and fix types ([d1dd21b](https://github.com/mjancarik/esmj-schema/commit/d1dd21b))


### BREAKING CHANGE

* 🧨 Fixed types.


## <small>0.2.3 (2025-06-08)</small>

* docs: ✏️ fix typo ([fdc63a2](https://github.com/mjancarik/esmj-schema/commit/fdc63a2))



## <small>0.2.2 (2025-06-05)</small>

* docs: ✏️ add arkType to comparison ([3c1ca97](https://github.com/mjancarik/esmj-schema/commit/3c1ca97))



## <small>0.2.1 (2025-06-05)</small>

* docs: ✏️ mark winner in comparison ([f8e0117](https://github.com/mjancarik/esmj-schema/commit/f8e0117))
* chore: 🤖 remove  benchmark from npm module ([03d532f](https://github.com/mjancarik/esmj-schema/commit/03d532f))
* chore: 🤖 update commands ([9188c10](https://github.com/mjancarik/esmj-schema/commit/9188c10))



## 0.2.0 (2025-06-01)

* docs: ✏️ add zod/4 ([b4a8107](https://github.com/mjancarik/esmj-schema/commit/b4a8107))
* feat: 🎸 improve performance for safeParse and parse methods ([2e1ffba](https://github.com/mjancarik/esmj-schema/commit/2e1ffba))


### BREAKING CHANGE

* 🧨 The error from safeParse is not native Error instance.


## <small>0.1.1 (2025-05-13)</small>

* chore: 🤖 add biome file to ignore list ([9794d74](https://github.com/mjancarik/esmj-schema/commit/9794d74))
* chore: 🤖 remove deprectecated parts ([f6637dc](https://github.com/mjancarik/esmj-schema/commit/f6637dc))
* chore: 🤖 update dependencies ([1f003ff](https://github.com/mjancarik/esmj-schema/commit/1f003ff))
* feat: 🎸 add enum type ([a89d399](https://github.com/mjancarik/esmj-schema/commit/a89d399))



## 0.1.0 (2025-04-23)

* feat: 🎸 add refine,pipe,transform,preprocess fns and date type ([2034b20](https://github.com/mjancarik/esmj-schema/commit/2034b20))



## <small>0.0.2 (2025-02-14)</small>

* first commit ([c964e35](https://github.com/mjancarik/esmj-schema/commit/c964e35))




