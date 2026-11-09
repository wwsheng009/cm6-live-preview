// CodeMirror measures DOM ranges in jsdom; empty layout values are enough for
// these tests because we assert structure and text, not pixel output.
if (typeof Range.prototype.getClientRects !== 'function') {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => [],
  });
}
if (typeof Range.prototype.getBoundingClientRect !== 'function') {
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: () => ({}),
    }),
  });
}
const textPrototype = Text.prototype as unknown as {
  getClientRects?: () => DOMRectList;
};
if (typeof textPrototype.getClientRects !== 'function') {
  Object.defineProperty(Text.prototype, 'getClientRects', {
    configurable: true,
    value: () => [],
  });
}
