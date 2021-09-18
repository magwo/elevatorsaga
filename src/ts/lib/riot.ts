/* Riot 1.0.2, @license MIT, (c) 2014 Muut Inc + contributors */
"use strict";

let FN: { [key: string]: string } = {}; // Precompiled templates (JavaScript functions)
const template_escape: { [key: string]: string } = {"\\": "\\\\", "\n": "\\n", "\r": "\\r", "'": "\\'"};
const render_escape: { [key: string]: string } = {'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'};

type EscapeFunc = (str: string | null, key: string) => string;

const default_escape_fn = (str: string | null, key: string) => {
  return str === null ? '' : (str+'').replace(/[&\"<>]/g, (char: string) => {
    return render_escape[char];
  });
};

export interface IObservable {
  on(events: string, fn: any): this;
  off(events: string, fn?: any): this;
  one(name: string, fn: any): this;
  trigger(name: string, ...args: any[]): this;
}

export type Observable<T> = T & IObservable;

type RiotApi = {
  observable<T>(el: T): Observable<T>;
  render(tmpl: string, data: { [key: string]: any }, escape_fn?: EscapeFunc | boolean): string;
  route?(to: any): void;
}

export let riot = {} as RiotApi;

riot.observable = <T>(el: T) => {
  let callbacks: { [key: string]: any } = {}, slice = [].slice;
  let result = el as Observable<T>;

  result.on = function(events, fn) {
    if (typeof fn === "function") {
      events.replace(/[^\s]+/g, (name: string, pos: number) => {
        (callbacks[name] = callbacks[name] || []).push(fn);
        fn.typed = pos > 0;
        return "";
      });
    }
    return this;
  };

  result.off = function(events, fn) {
    if (events === "*") callbacks = {};
    else if (fn) {
      var arr = callbacks[events];
      for (var i = 0, cb; (cb = arr && arr[i]); ++i) {
        if (cb === fn) arr.splice(i, 1);
      }
    } else {
      events.replace(/[^\s]+/g, (name: string) => {
        callbacks[name] = [];
        return "";
      });
    }
    return this;
  };

  // only single event supported
  result.one = function(name, fn) {
    if (fn) fn.one = true;
    return this.on(name, fn);
  };

  result.trigger = function(name, ...args) {
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

  return result;
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
(() => {
  // for browsers only
  if (typeof window === "undefined") return;

  var currentHash: string,
    pops = riot.observable({}),
    listen = window.addEventListener,
    doc = document;

  const pop = (hash: any) => {
    hash = hash.type ? location.hash : hash;
    if (hash !== currentHash) pops.trigger("pop", hash);
    currentHash = hash;
  }

  /* Always fire pop event upon page load (normalize behaviour across browsers) */

  listen("popstate", pop, false);
  doc.addEventListener("DOMContentLoaded", pop, false);

  /* Change the browser URL or listen to changes on the URL */
  riot.route = (to) => {
    // listen
    if (typeof to === "function") {
      pops.on("pop", to);
      return;
    }

    // fire
    if (history.pushState) history.pushState(0, "0", to);
    pop(to);

  };
})();
