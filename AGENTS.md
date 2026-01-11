# AGENTS.md

This file provides guidance to AI coding assistants when working with code in this repository.

## Commit Strategy

**Make small, incremental commits as you work.** Do not batch large changes into a single commit.

- Create commits after completing each logical unit of work
- Multiple commits per task is encouraged when doing substantial work
- Each commit should be atomic and represent a single change
- Write clear, descriptive commit messages

## Key Patterns

### Vue & Component Patterns

- **Vue file formatting:** Indent content inside `<script>` and `<style>` tags (configured via `vueIndentScriptAndStyle: true` in `.prettierrc`)
- **Vue 3 Composition API** with `<script setup>` syntax
- **Atomic Design:** atoms → molecules → layouts → organisms for reusable components
- **Domain components:** Feature-specific components live in `domain/<feature>/components/`
- **D3 integration:** Imperative DOM manipulation within Vue lifecycle hooks, separate from Vue reactivity

### Class Design

- **Private fields with underscore prefix** (`_fieldName`) with getter-only access:

  ```typescript
  // Correct
  class Example {
    private _value: number;

    constructor(value: number) {
      this._value = value;
    }

    get value(): number {
      return this._value;
    }
  }

  // Incorrect
  class Example {
    private value: number; // Missing underscore prefix
  }
  ```

- **Array copying** via `.slice(0)` to prevent external mutations

## Testing

Vitest with globals enabled. Test files colocated with source (`*.test.ts`).

```typescript
describe("ClassName", () => {
  let instance: ClassName;
  beforeEach(() => {
    instance = new ClassName();
  });

  describe("method_name", () => {
    it("should behave as expected", () => {
      /* arrange, act, assert */
    });
  });
});
```
