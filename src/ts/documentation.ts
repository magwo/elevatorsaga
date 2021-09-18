const hljs = require('highlight.js/lib/core');
const javascript = require('highlight.js/lib/languages/javascript');

document.addEventListener("DOMContentLoaded", () => {
  hljs.registerLanguage("javascript", javascript);
  hljs.highlightAll();
});
