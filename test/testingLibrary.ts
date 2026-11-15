import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, expect } from 'bun:test';

const MAX_TEXT = 100;

/** Shortens text to a fixed length with an ellipsis. */
const clip = (text: string) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text);

/** Describes a received value in one short line: an element as its own tag and start of its text, anything else as a string. Never formats the element's object graph, which is slow with happy-dom. */
function describeReceived(received: unknown): string {
  if (received instanceof Element) {
    return `${(received.cloneNode(false) as Element).outerHTML} with text "${clip(received.textContent ?? '')}"`;
  }
  return clip(String(received));
}

/** The jest-dom matchers with the same checks but a one-line failure message. Their own messages print the received element, and a happy-dom element takes long enough to format that every failed check inside `waitFor` holds up the timers the test is waiting on. */
const shortMessageMatchers = Object.fromEntries(
  Object.entries(matchers).map(([name, matcher]) => [
    name,
    function (this: unknown, received: unknown, ...expected: unknown[]) {
      const result = (matcher as (this: unknown, ...args: unknown[]) => { pass: boolean }).call(this, received, ...expected);
      return {
        pass: result.pass,
        message: () => `expected ${describeReceived(received)} ${result.pass ? 'not ' : ''}${name}(${expected.map(value => clip(String(value))).join(', ')})`,
      };
    },
  ]),
);

expect.extend(shortMessageMatchers);

configure({
  asyncUtilTimeout: 4000,
  /** Errors from failed queries (getBy*, findBy*) carry the message only, without a printout of the document. */
  getElementError: message => {
    const error = new Error(message ?? 'Element not found');
    error.name = 'TestingLibraryElementError';
    return error;
  },
});

afterEach(() => {
  cleanup();
});
