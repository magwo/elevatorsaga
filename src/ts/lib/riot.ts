/* Riot 1.0.2, @license MIT, (c) 2014 Muut Inc + contributors */
"use strict";

let FN: { [key: string]: string } = {}; // Precompiled templates (JavaScript functions)
const template_escape = {"\\": "\\\\", "\n": "\\n", "\r": "\\r", "'": "\\'"};
const render_escape = {'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'};

type EscapeFunc = (str: string | null, key: string) => string;

function default_escape_fn(str: string | null, key: string) {
  return str === null ? '' : (str+'').replace(/[&\"<>]/g, function(char) {
    return render_escape[char];
  });
}

interface IObservable {
  on(events, fn): this;
  off(events, fn): this;
  one(name, fn): this;
  trigger(name, ...args): this;
}

export type Observable<T> = T & IObservable;

type RiotApi = {
  observable<T>(el: T): Observable<T>;
  render(tmpl: string, data: { [key: string]: string }, escape_fn: EscapeFunc | boolean): string;
  route?(to): void;
}

export let riot = {} as RiotApi

riot.observable = (el) => {
  let callbacks = {}, slice = [].slice;
  let obs = {} as IObservable;

  obs.on = function(events, fn) {
    if (typeof fn === "function") {
      events.replace(/[^\s]+/g, function(name, pos) {
        (callbacks[name] = callbacks[name] || []).push(fn);
        fn.typed = pos > 0;
      });
    }
    return this;
  };

  obs.off = function(events, fn) {
    if (events === "*") callbacks = {};
    else if (fn) {
      var arr = callbacks[events];
      for (var i = 0, cb; (cb = arr && arr[i]); ++i) {
        if (cb === fn) arr.splice(i, 1);
      }
    } else {
      events.replace(/[^\s]+/g, function(name) {
        callbacks[name] = [];
      });
    }
    return this;
  };

  // only single event supported
  obs.one = function(name, fn) {
    if (fn) fn.one = true;
    return this.on(name, fn);
  };

  obs.trigger = function(name, ...args) {
    const fns = callbacks[name] || [];

    for (var i = 0, fn; (fn = fns[i]); ++i) {
      if (!fn.busy) {
        fn.busy = true;
        fn.apply(el, fn.typed ? [name].concat(args) : args);
        if (fn.one) { fns.splice(i, 1); i--; }
        else if(fns[i] && fns[i] !== fn) { i-- } // Makes self-removal possible during iteration
        fn.busy = false;
      }
    }

    return this;
  };

  return Object.assign(el, obs);
};

riot.render = (tmpl, data, escape_fn) => {
  if (escape_fn === true) escape_fn = default_escape_fn;
  tmpl = tmpl || '';

  // @ts-ignore
  return (FN[tmpl] = FN[tmpl] || new Function("_", "e", "return '" +
    tmpl.replace(/[\\\n\r']/g, (char: string) => {
      return template_escape[char];
    }).replace(/{\s*([\w\.]+)\s*}/g, "' + (e?e(_.$1,'$1'):_.$1||(_.$1==null?'':_.$1)) + '") + "'")
  )(data, escape_fn);
};

/* Cross browser popstate */
(function () {
  // for browsers only
  if (typeof window === "undefined") return;

  var currentHash,
    pops = riot.observable({}),
    listen = window.addEventListener,
    doc = document;

  function pop(hash) {
    hash = hash.type ? location.hash : hash;
    if (hash !== currentHash) pops.trigger("pop", hash);
    currentHash = hash;
  }

  /* Always fire pop event upon page load (normalize behaviour across browsers) */

  listen("popstate", pop, false);
  doc.addEventListener("DOMContentLoaded", pop, false);

  /* Change the browser URL or listen to changes on the URL */
  riot.route = function(to) {
    // listen
    if (typeof to === "function") return pops.on("pop", to);

    // fire
    if (history.pushState) history.pushState(0, "0", to);
    pop(to);

  };
})();
