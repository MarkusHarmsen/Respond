/*! Respond.js v1.4.2: min/max-width media query polyfill
 * Copyright 2016 Scott Jehl
 * Licensed under MIT
 * http://j.mp/respondjs */

/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas. Dual MIT/BSD license */
/*! NOTE: If you're already including a window.matchMedia polyfill via Modernizr or otherwise, you don't need this part */
(function(w) {
  "use strict";
  w.matchMedia = w.matchMedia || function(doc, undefined) {
    var bool, docElem = doc.documentElement, refNode = docElem.firstElementChild || docElem.firstChild, // fakeBody required for <FF4 when executed in <head>
    fakeBody = doc.createElement("body"), div = doc.createElement("div");
    div.id = "mq-test-1";
    div.style.cssText = "position:absolute;top:-100em";
    fakeBody.style.background = "none";
    fakeBody.appendChild(div);
    return function(q) {
      div.innerHTML = '&shy;<style media="' + q + '"> #mq-test-1 { width: 42px; }</style>';
      docElem.insertBefore(fakeBody, refNode);
      bool = div.offsetWidth === 42;
      docElem.removeChild(fakeBody);
      return {
        matches: bool,
        media: q
      };
    };
  }(w.document);
})(this);

/*! matchMedia() polyfill addListener/removeListener extension. Author & copyright (c) 2012: Scott Jehl. Dual MIT/BSD license */
(function(w) {
  "use strict";
  // Bail out for browsers that have addListener support
  if (w.matchMedia && w.matchMedia("all").addListener) {
    return false;
  }
  var localMatchMedia = w.matchMedia, hasMediaQueries = localMatchMedia("only all").matches, isListening = false, timeoutID = 0, // setTimeout for debouncing 'handleChange'
  queries = [], // Contains each 'mql' and associated 'listeners' if 'addListener' is used
  handleChange = function(evt) {
    // Debounce
    w.clearTimeout(timeoutID);
    timeoutID = w.setTimeout(function() {
      for (var i = 0, il = queries.length; i < il; i++) {
        var mql = queries[i].mql, listeners = queries[i].listeners || [], matches = localMatchMedia(mql.media).matches;
        // Update mql.matches value and call listeners
        // Fire listeners only if transitioning to or from matched state
        if (matches !== mql.matches) {
          mql.matches = matches;
          for (var j = 0, jl = listeners.length; j < jl; j++) {
            listeners[j].call(w, mql);
          }
        }
      }
    }, 30);
  };
  w.matchMedia = function(media) {
    var mql = localMatchMedia(media), listeners = [], index = 0;
    mql.addListener = function(listener) {
      // Changes would not occur to css media type so return now (Affects IE <= 8)
      if (!hasMediaQueries) {
        return;
      }
      // Set up 'resize' listener for browsers that support CSS3 media queries (Not for IE <= 8)
      // There should only ever be 1 resize listener running for performance
      if (!isListening) {
        isListening = true;
        w.addEventListener("resize", handleChange, true);
      }
      // Push object only if it has not been pushed already
      if (index === 0) {
        index = queries.push({
          mql: mql,
          listeners: listeners
        });
      }
      listeners.push(listener);
    };
    mql.removeListener = function(listener) {
      for (var i = 0, il = listeners.length; i < il; i++) {
        if (listeners[i] === listener) {
          listeners.splice(i, 1);
        }
      }
    };
    return mql;
  };
})(this);

/* Respond.js: min/max-width media query polyfill. (c) Scott Jehl. MIT Lic. j.mp/respondjs  */
(function(w) {
  "use strict";
  //exposed namespace
  var respond = {};
  w.respond = respond;
  //define update even in native-mq-supporting browsers, to avoid errors
  respond.update = function() {};
  //define ajax obj
  var requestQueue = [], xmlHttp = function() {
    var xmlhttpmethod = false;
    try {
      xmlhttpmethod = new w.XMLHttpRequest();
    } catch (e) {
      xmlhttpmethod = new w.ActiveXObject("Microsoft.XMLHTTP");
    }
    return function() {
      return xmlhttpmethod;
    };
  }(), xmlHttpExternal = function() {
    var xmlhttpmethod = false;
    try {
      xmlhttpmethod = new w.XDomainRequest();
    } catch (e) {}
    return function() {
      return xmlhttpmethod;
    };
  }(), //check if an URL is external
  //http://stackoverflow.com/questions/6238351/fastest-way-to-detect-external-urls
  isExternalUrl = function(url) {
    var domain = function(url) {
      return url.toLowerCase().replace(/([a-z])?:\/\//, "$1").split("/")[0];
    };
    return (url.indexOf(":") > -1 || url.indexOf("//") > -1) && domain(w.location.href) !== domain(url);
  }, //tweaked Ajax functions from Quirksmode
  ajaxInternal = function(url, callback) {
    var req = xmlHttp();
    if (!req) {
      return;
    }
    req.open("GET", url, true);
    req.onreadystatechange = function() {
      if (req.readyState !== 4 || req.status !== 200 && req.status !== 304) {
        return;
      }
      callback(req.responseText);
    };
    if (req.readyState === 4) {
      return;
    }
    req.send(null);
  }, //external ajax function
  ajaxExternal = function(url, callback) {
    var req = xmlHttpExternal();
    if (!req) {
      return;
    }
    req.open("GET", url);
    req.onload = function() {
      callback(req.responseText);
    };
    req.send();
  }, //ajax wrapper
  ajax = function(url, callback) {
    if (isExternalUrl(url)) {
      ajaxExternal(url, callback);
    } else {
      ajaxInternal(url, callback);
    }
  }, isUnsupportedMediaQuery = function(query) {
    return query.replace(respond.regex.minmaxwh, "").match(respond.regex.other);
  };
  //expose for testing
  respond.ajax = ajax;
  respond.queue = requestQueue;
  respond.unsupportedmq = isUnsupportedMediaQuery;
  respond.regex = {
    media: /@media[^\{]+\{([^\{\}]*\{[^\}\{]*\})+/gi,
    keyframes: /@(?:\-(?:o|moz|webkit)\-)?keyframes[^\{]+\{(?:[^\{\}]*\{[^\}\{]*\})+[^\}]*\}/gi,
    comments: /\/\*[^*]*\*+([^/][^*]*\*+)*\//gi,
    urls: /(url\()['"]?([^\/\)'"][^:\)'"]+)['"]?(\))/g,
    findStyles: /@media *([^\{]+)\{([\S\s]+?)$/,
    only: /(only\s+)?([a-zA-Z]+)\s?/,
    minw: /\(\s*min\-width\s*:\s*(\s*[0-9\.]+)(px|em)\s*\)/,
    maxw: /\(\s*max\-width\s*:\s*(\s*[0-9\.]+)(px|em)\s*\)/,
    minmaxwh: /\(\s*m(in|ax)\-(height|width)\s*:\s*(\s*[0-9\.]+)(px|em)\s*\)/gi,
    other: /\([^\)]*\)/g
  };
  //expose media query support flag for external use
  respond.mediaQueriesSupported = w.matchMedia && w.matchMedia("only all") !== null && w.matchMedia("only all").matches;
  //if media queries are supported, exit here
  if (respond.mediaQueriesSupported) {
    return;
  }
  //define vars
  var doc = w.document, docElem = doc.documentElement, mediastyles = [], rules = [], appendedEls = [], parsedSheets = {}, resizeThrottle = 30, head = doc.getElementsByTagName("head")[0] || docElem, base = doc.getElementsByTagName("base")[0], links = head.getElementsByTagName("link"), lastCall, resizeDefer, //cached container for 1em value, populated the first time it's needed
  eminpx, // returns the value of 1em in pixels
  getEmValue = function() {
    var ret, div = doc.createElement("div"), body = doc.body, originalHTMLFontSize = docElem.style.fontSize, originalBodyFontSize = body && body.style.fontSize, fakeUsed = false;
    div.style.cssText = "position:absolute;font-size:1em;width:1em";
    if (!body) {
      body = fakeUsed = doc.createElement("body");
      body.style.background = "none";
    }
    // 1em in a media query is the value of the default font size of the browser
    // reset docElem and body to ensure the correct value is returned
    docElem.style.fontSize = "100%";
    body.style.fontSize = "100%";
    body.appendChild(div);
    if (fakeUsed) {
      docElem.insertBefore(body, docElem.firstChild);
    }
    ret = div.offsetWidth;
    if (fakeUsed) {
      docElem.removeChild(body);
    } else {
      body.removeChild(div);
    }
    // restore the original values
    docElem.style.fontSize = originalHTMLFontSize;
    if (originalBodyFontSize) {
      body.style.fontSize = originalBodyFontSize;
    }
    //also update eminpx before returning
    ret = eminpx = parseFloat(ret);
    return ret;
  }, //enable/disable styles
  applyMedia = function(fromResize) {
    var name = "clientWidth", docElemProp = docElem[name], currWidth = doc.compatMode === "CSS1Compat" && docElemProp || doc.body[name] || docElemProp, styleBlocks = {}, lastLink = links[links.length - 1], now = new Date().getTime();
    //throttle resize calls
    if (fromResize && lastCall && now - lastCall < resizeThrottle) {
      w.clearTimeout(resizeDefer);
      resizeDefer = w.setTimeout(applyMedia, resizeThrottle);
      return;
    } else {
      lastCall = now;
    }
    for (var i in mediastyles) {
      if (mediastyles.hasOwnProperty(i)) {
        var thisstyle = mediastyles[i], min = thisstyle.minw, max = thisstyle.maxw, minnull = min === null, maxnull = max === null, em = "em";
        if (!!min) {
          min = parseFloat(min) * (min.indexOf(em) > -1 ? eminpx || getEmValue() : 1);
        }
        if (!!max) {
          max = parseFloat(max) * (max.indexOf(em) > -1 ? eminpx || getEmValue() : 1);
        }
        // if there's no media query at all (the () part), or min or max is not null, and if either is present, they're true
        if (!thisstyle.hasquery || (!minnull || !maxnull) && (minnull || currWidth >= min) && (maxnull || currWidth <= max)) {
          if (!styleBlocks[thisstyle.media]) {
            styleBlocks[thisstyle.media] = [];
          }
          styleBlocks[thisstyle.media].push(rules[thisstyle.rules]);
        }
      }
    }
    //remove any existing respond style element(s)
    for (var j in appendedEls) {
      if (appendedEls.hasOwnProperty(j)) {
        if (appendedEls[j] && appendedEls[j].parentNode === head) {
          head.removeChild(appendedEls[j]);
        }
      }
    }
    appendedEls.length = 0;
    //inject active styles, grouped by media type
    for (var k in styleBlocks) {
      if (styleBlocks.hasOwnProperty(k)) {
        var ss = doc.createElement("style"), css = styleBlocks[k].join("\n");
        ss.type = "text/css";
        ss.media = k;
        //originally, ss was appended to a documentFragment and sheets were appended in bulk.
        //this caused crashes in IE in a number of circumstances, such as when the HTML element had a bg image set, so appending beforehand seems best. Thanks to @dvelyk for the initial research on this one!
        head.insertBefore(ss, lastLink.nextSibling);
        if (ss.styleSheet) {
          ss.styleSheet.cssText = css;
        } else {
          ss.appendChild(doc.createTextNode(css));
        }
        //push to appendedEls to track for later removal
        appendedEls.push(ss);
      }
    }
  }, //find media blocks in css text, convert to style blocks
  translate = function(styles, href, media) {
    var qs = styles.replace(respond.regex.comments, "").replace(respond.regex.keyframes, "").match(respond.regex.media), ql = qs && qs.length || 0;
    //try to get CSS path
    href = href.substring(0, href.lastIndexOf("/"));
    var repUrls = function(css) {
      return css.replace(respond.regex.urls, "$1" + href + "$2$3");
    }, useMedia = !ql && media;
    //if path exists, tack on trailing slash
    if (href.length) {
      href += "/";
    }
    //if no internal queries exist, but media attr does, use that
    //note: this currently lacks support for situations where a media attr is specified on a link AND
    //its associated stylesheet has internal CSS media queries.
    //In those cases, the media attribute will currently be ignored.
    if (useMedia) {
      ql = 1;
    }
    for (var i = 0; i < ql; i++) {
      var fullq, thisq, eachq, eql;
      //media attr
      if (useMedia) {
        fullq = media;
        rules.push(repUrls(styles));
      } else {
        fullq = qs[i].match(respond.regex.findStyles) && RegExp.$1;
        rules.push(RegExp.$2 && repUrls(RegExp.$2));
      }
      eachq = fullq.split(",");
      eql = eachq.length;
      for (var j = 0; j < eql; j++) {
        thisq = eachq[j];
        if (isUnsupportedMediaQuery(thisq)) {
          continue;
        }
        mediastyles.push({
          media: thisq.split("(")[0].match(respond.regex.only) && RegExp.$2 || "all",
          rules: rules.length - 1,
          hasquery: thisq.indexOf("(") > -1,
          minw: thisq.match(respond.regex.minw) && parseFloat(RegExp.$1) + (RegExp.$2 || ""),
          maxw: thisq.match(respond.regex.maxw) && parseFloat(RegExp.$1) + (RegExp.$2 || "")
        });
      }
    }
    applyMedia();
  }, //recurse through request queue, get css text
  makeRequests = function() {
    if (requestQueue.length) {
      var thisRequest = requestQueue.shift();
      ajax(thisRequest.href, function(styles) {
        translate(styles, thisRequest.href, thisRequest.media);
        parsedSheets[thisRequest.href] = true;
        // by wrapping recursive function call in setTimeout
        // we prevent "Stack overflow" error in IE7
        w.setTimeout(function() {
          makeRequests();
        }, 0);
      });
    }
  }, //loop stylesheets, send text content to translate
  ripCSS = function() {
    for (var i = 0; i < links.length; i++) {
      var sheet = links[i], href = sheet.href, media = sheet.media, isCSS = sheet.rel && sheet.rel.toLowerCase() === "stylesheet";
      //only links plz and prevent re-parsing
      if (!!href && isCSS && !parsedSheets[href]) {
        // selectivizr exposes css through the rawCssText expando
        if (sheet.styleSheet && sheet.styleSheet.rawCssText) {
          translate(sheet.styleSheet.rawCssText, href, media);
          parsedSheets[href] = true;
        } else {
          // IE7 doesn't handle urls that start with '//' for ajax request
          // manually add in the protocol
          if (href.substring(0, 2) === "//") {
            href = w.location.protocol + href;
          }
          requestQueue.push({
            href: href,
            media: media
          });
        }
      }
    }
    makeRequests();
  };
  //translate CSS
  ripCSS();
  //expose update for re-running respond later on
  respond.update = ripCSS;
  //expose getEmValue
  respond.getEmValue = getEmValue;
  //adjust on resize
  function callMedia() {
    applyMedia(true);
  }
  if (w.addEventListener) {
    w.addEventListener("resize", callMedia, false);
  } else if (w.attachEvent) {
    w.attachEvent("onresize", callMedia);
  }
})(this);