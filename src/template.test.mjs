import {
  resolveJSONPathTemplates
} from './template.mjs';

describe('Template Utilities', () => {
  describe('resolveJSONPathTemplates', () => {
    describe('basic template resolution', () => {
      test('should resolve single template string with json path syntax', () => {
        const input = 'Hello {$.name}';
        const jobContext = { name: 'world' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Hello world');
        expect(errors).toHaveLength(0);
      });

      test('should resolve single template string with complex attribute', () => {
        const input = 'Hello {$.name.first}';
        const jobContext = { name: { first: 'world' } };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Hello world');
        expect(errors).toHaveLength(0);
      });

      test('should resolve multiple template strings', () => {
        const input = '{$.greeting} {$.name}';
        const jobContext = { greeting: 'Hello', name: 'world' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Hello world');
        expect(errors).toHaveLength(0);
      });

      test('should resolve multiple template strings with same placeholder', () => {
        const input = '{$.greeting} {$.name}-{$.name}';
        const jobContext = { greeting: 'Hello', name: 'world' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Hello world-world');
        expect(errors).toHaveLength(0);
      });

      test('should not modify string without templates', () => {
        const input = 'Hello world';
        const jobContext = { greeting: 'Hello', name: 'world' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Hello world');
        expect(errors).toHaveLength(0);
      });

      test('should convert int value to string', () => {
        const input = 'Hello {$.name}';
        const jobContext = { greeting: 'Hello', name: 10 };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Hello 10');
        expect(errors).toHaveLength(0);
      });

      test('should handle nested braces', () => {
        const input = '{"text": "User access revoked (id: {$.user.id})"}';
        const jobContext = { user: { id: 1 } };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('{"text": "User access revoked (id: 1)"}');
        expect(errors).toHaveLength(0);
      });

      test('should handle deeply nested braces', () => {
        const input = '{{{{{$.greeting} world}}}}';
        const jobContext = { greeting: 'Hello' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('{{{{Hello world}}}}');
        expect(errors).toHaveLength(0);
      });

      test('should not match non-jsonpath syntax {name}', () => {
        const input = 'Hello {name}';
        const jobContext = { name: 'world' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Hello {name}');
        expect(errors).toHaveLength(0);
      });
    });

    describe('missing values', () => {
      test('should replace missing field with {No Value} and report error', () => {
        const input = 'Hello {$.name} {$.name2}';
        const jobContext = { greeting: 'Hello' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Hello {No Value} {No Value}');
        expect(errors).toHaveLength(2);
        expect(errors[0]).toContain("failed to extract field '$.name'");
        expect(errors[1]).toContain("failed to extract field '$.name2'");
      });

      test('should handle empty field', () => {
        const input = 'Hello {$.name}';
        const jobContext = { greeting: 'Hello', name: '' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Hello ');
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('field is empty');
      });
    });

    describe('omitNoValueForExactTemplates option', () => {
      test('should still show {No Value} for non-exact templates', () => {
        const input = 'Hello {$.name}';
        const jobContext = { greeting: 'Hello' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, {
          omitNoValueForExactTemplates: true,
          injectSGNLNamespace: false
        });

        expect(result).toBe('Hello {No Value}');
        expect(errors).toHaveLength(1);
      });

      test('should return empty string for exact template', () => {
        const input = '{$.name}';
        const jobContext = { greeting: 'Hello' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, {
          omitNoValueForExactTemplates: true,
          injectSGNLNamespace: false
        });

        expect(result).toBe('');
        expect(errors).toHaveLength(1);
      });

      test('should omit keys with exact templates in objects', () => {
        const input = {
          exact_template_1: '{$.missing1}',
          exact_template_2: '{$.missing2}',
          valid_field: '{$.a}',
          non_template: 'static text'
        };
        const jobContext = { a: '1' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, {
          omitNoValueForExactTemplates: true,
          injectSGNLNamespace: false
        });

        expect(result).toEqual({
          valid_field: '1',
          non_template: 'static text'
        });
        expect(errors).toHaveLength(2);
      });

      test('should filter array items that are exact templates with missing values', () => {
        const input = {
          items: ['{$.missing}', 'static', '{$.valid}']
        };
        const jobContext = { valid: 'value' };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, {
          omitNoValueForExactTemplates: true,
          injectSGNLNamespace: false
        });

        expect(result.items).toEqual(['static', 'value']);
        expect(errors).toHaveLength(1);
      });
    });

    describe('object and map resolution', () => {
      test('should resolve templates in object values', () => {
        const input = {
          string_no_template: 'Test no template',
          string_template: 'Test replace template {$.b.c}',
          int: 1,
          float: 1.23,
          boolean: true
        };
        const jobContext = { a: '1', b: { c: '3' } };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toEqual({
          string_no_template: 'Test no template',
          string_template: 'Test replace template 3',
          int: 1,
          float: 1.23,
          boolean: true
        });
        expect(errors).toHaveLength(0);
      });

      test('should handle multiple missing values in object', () => {
        const input = {
          missing_template_1: 'Test replace template {$.missing1}',
          missing_template_2: 'Test replace template {$.missing2}',
          missing_template_3: 'Test replace template {$.missing3}'
        };
        const jobContext = { a: '1', b: { c: '3' } };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toEqual({
          missing_template_1: 'Test replace template {No Value}',
          missing_template_2: 'Test replace template {No Value}',
          missing_template_3: 'Test replace template {No Value}'
        });
        expect(errors).toHaveLength(3);
      });
    });

    describe('type handling', () => {
      test('should handle boolean values', () => {
        const input = 'Enabled: {$.enabled}';
        const jobContext = { enabled: true };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Enabled: true');
      });

      test('should handle false boolean', () => {
        const input = 'Enabled: {$.enabled}';
        const jobContext = { enabled: false };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Enabled: false');
      });

      test('should handle float values', () => {
        const input = 'Rate: {$.rate}';
        const jobContext = { rate: 16.44 };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Rate: 16.44');
      });

      test('should handle zero int', () => {
        const input = 'Count: {$.count}';
        const jobContext = { count: 0 };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Count: 0');
      });

      test('should handle zero float', () => {
        const input = 'Rate: {$.rate}';
        const jobContext = { rate: 0.0 };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Rate: 0');
      });

      test('should handle array values', () => {
        const input = 'Items: {$.items}';
        const jobContext = { items: [1, 2, 3] };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Items: [1,2,3]');
      });

      test('should handle array element access', () => {
        const input = 'First: {$.items[0]}';
        const jobContext = { items: [1, 2, 3] };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('First: 1');
      });

      test('should handle complex array element access', () => {
        const input = 'Third ID: {$.items[2].id}';
        const jobContext = {
          items: [
            { id: 1 },
            { id: 2 },
            { id: 3 }
          ]
        };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Third ID: 3');
      });

      test('should handle deeply nested path', () => {
        const input = 'Theme: {$.user.profile.settings.theme}';
        const jobContext = {
          user: {
            profile: {
              settings: {
                theme: 'dark'
              }
            }
          }
        };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Theme: dark');
      });

      test('should handle bracket notation with string keys (single quotes)', () => {
        const input = "Title: {$.store['book']['title']}";
        const jobContext = {
          store: {
            book: {
              title: 'The Great Gatsby'
            }
          }
        };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Title: The Great Gatsby');
      });

      test('should handle bracket notation with string keys (double quotes)', () => {
        const input = 'Author: {$.store["book"]["author"]}';
        const jobContext = {
          store: {
            book: {
              author: 'F. Scott Fitzgerald'
            }
          }
        };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Author: F. Scott Fitzgerald');
      });

      test('should handle mixed bracket and dot notation', () => {
        const input = "Value: {$.x['store'].book[0]['title']}";
        const jobContext = {
          x: {
            store: {
              book: [
                { title: 'First Book' },
                { title: 'Second Book' }
              ]
            }
          }
        };

        const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Value: First Book');
      });
    });

    // TODO: Wildcard support requires advanced JSONPath features not yet implemented.
    // These tests are commented out until we add support for wildcards [*], filters [?()],
    // recursive descent (..), and other advanced features.
    //
    // describe('wildcard support', () => {
    //   test('should handle wildcard returning array', () => {
    //     const input = 'Names: {$.items[*].name}';
    //     const jobContext = {
    //       items: [
    //         { name: 'item1' },
    //         { name: 'item2' },
    //         { name: 'item3' }
    //       ]
    //     };
    //
    //     const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });
    //
    //     expect(result).toBe('Names: ["item1","item2","item3"]');
    //   });
    //
    //   test('should handle wildcard with single element', () => {
    //     const input = 'Names: {$.items[*].name}';
    //     const jobContext = {
    //       items: [{ name: 'only' }]
    //     };
    //
    //     const { result } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });
    //
    //     expect(result).toBe('Names: ["only"]');
    //   });
    //
    //   test('should handle wildcard with empty array', () => {
    //     const input = 'Names: {$.items[*].name}';
    //     const jobContext = { items: [] };
    //
    //     const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });
    //
    //     // JSONPath returns no results for empty array wildcard - this is expected behavior
    //     expect(result).toBe('Names: {No Value}');
    //     expect(errors).toHaveLength(1);
    //   });
    // });

    describe('SGNL namespace injection', () => {
      test('should inject sgnl.time.now in RFC3339 format (no milliseconds)', () => {
        const input = { timestamp: '{$.sgnl.time.now}' };
        const jobContext = {};

        const { result, errors } = resolveJSONPathTemplates(input, jobContext);

        // RFC3339 format without milliseconds: "2025-12-04T17:30:00Z"
        // This matches Go's time.RFC3339 format
        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
        expect(errors).toHaveLength(0);
      });

      test('should inject sgnl.random.uuid', () => {
        const input = { requestId: '{$.sgnl.random.uuid}' };
        const jobContext = {};

        const { result, errors } = resolveJSONPathTemplates(input, jobContext);

        // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        expect(result.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(errors).toHaveLength(0);
      });

      test('should not inject sgnl namespace when disabled', () => {
        const input = { timestamp: '{$.sgnl.time.now}' };
        const jobContext = {};

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result.timestamp).toBe('{No Value}');
        expect(errors).toHaveLength(1);
      });

      test('should preserve existing sgnl values in jobContext', () => {
        const input = { custom: '{$.sgnl.custom.value}' };
        const jobContext = {
          sgnl: {
            custom: { value: 'my-custom-value' }
          }
        };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext);

        expect(result.custom).toBe('my-custom-value');
        expect(errors).toHaveLength(0);
      });
    });

    describe('null and undefined handling', () => {
      test('should handle null jobContext', () => {
        const input = { name: '{$.user.name}' };

        const { result, errors } = resolveJSONPathTemplates(input, null);

        expect(result.name).toBe('{No Value}');
        expect(errors).toHaveLength(1);
      });

      test('should handle undefined jobContext', () => {
        const input = { name: '{$.user.name}' };

        const { result, errors } = resolveJSONPathTemplates(input, undefined);

        expect(result.name).toBe('{No Value}');
        expect(errors).toHaveLength(1);
      });

      test('should handle null field value', () => {
        const input = 'Value: {$.value}';
        const jobContext = { value: null };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toBe('Value: {No Value}');
        expect(errors).toHaveLength(1);
      });
    });

    describe('nested arrays in input', () => {
      test('should resolve templates in nested arrays', () => {
        const input = {
          users: [
            { name: '{$.user1.name}' },
            { name: '{$.user2.name}' }
          ]
        };
        const jobContext = {
          user1: { name: 'Alice' },
          user2: { name: 'Bob' }
        };

        const { result, errors } = resolveJSONPathTemplates(input, jobContext, { injectSGNLNamespace: false });

        expect(result).toEqual({
          users: [
            { name: 'Alice' },
            { name: 'Bob' }
          ]
        });
        expect(errors).toHaveLength(0);
      });
    });
  });
});
