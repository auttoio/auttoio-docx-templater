"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _require = require("xmldom"),
    DOMParser = _require.DOMParser,
    XMLSerializer = _require.XMLSerializer;

var _require2 = require("./errors"),
    throwXmlTagNotFound = _require2.throwXmlTagNotFound;

var _require3 = require("./utils"),
    last = _require3.last,
    first = _require3.first;

function parser(tag) {
  return _defineProperty({}, "get", function get(scope) {
    if (tag === ".") {
      return scope;
    }

    return scope[tag];
  });
}

function getNearestLeft(parsed, elements, index) {
  for (var i = index; i >= 0; i--) {
    var part = parsed[i];

    for (var j = 0, len = elements.length; j < len; j++) {
      var element = elements[j];

      if (isStarting(part.value, element)) {
        return elements[j];
      }
    }
  }

  return null;
}

function getNearestRight(parsed, elements, index) {
  for (var i = index, l = parsed.length; i < l; i++) {
    var part = parsed[i];

    for (var j = 0, len = elements.length; j < len; j++) {
      var element = elements[j];

      if (isEnding(part.value, element)) {
        return elements[j];
      }
    }
  }

  return -1;
}

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function startsWith(str, prefix) {
  return str.substring(0, prefix.length) === prefix;
}

function unique(arr) {
  var hash = {},
      result = [];

  for (var i = 0, l = arr.length; i < l; ++i) {
    if (!hash.hasOwnProperty(arr[i])) {
      hash[arr[i]] = true;
      result.push(arr[i]);
    }
  }

  return result;
}

function chunkBy(parsed, f) {
  return parsed.reduce(function (chunks, p) {
    var currentChunk = last(chunks);
    var res = f(p);

    if (currentChunk.length === 0) {
      currentChunk.push(p);
      return chunks;
    }

    if (res === "start") {
      chunks.push([p]);
    } else if (res === "end") {
      currentChunk.push(p);
      chunks.push([]);
    } else {
      currentChunk.push(p);
    }

    return chunks;
  }, [[]]).filter(function (p) {
    return p.length > 0;
  });
}

var defaults = {
  nullGetter: function nullGetter(part) {
    if (!part.module) {
      return "undefined";
    }

    if (part.module === "rawxml") {
      return "";
    }

    return "";
  },
  xmlFileNames: [],
  parser: parser,
  linebreaks: false,
  delimiters: {
    start: "{",
    end: "}"
  }
};

function mergeObjects() {
  var resObj = {};
  var obj, keys;

  for (var i = 0; i < arguments.length; i += 1) {
    obj = arguments[i];
    keys = Object.keys(obj);

    for (var j = 0; j < keys.length; j += 1) {
      resObj[keys[j]] = obj[keys[j]];
    }
  }

  return resObj;
}

function xml2str(xmlNode) {
  var a = new XMLSerializer();
  return a.serializeToString(xmlNode).replace(/xmlns(:[a-z0-9]+)?="" ?/g, "");
}

function str2xml(str) {
  if (str.charCodeAt(0) === 65279) {
    // BOM sequence
    str = str.substr(1);
  }

  var parser = new DOMParser();
  return parser.parseFromString(str, "text/xml");
}

var charMap = {
  "&": "&amp;",
  "'": "&apos;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
};

function escapeRegExp(str) {
  // to be able to use a string as a regex
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

var charMapRegexes = Object.keys(charMap).map(function (endChar) {
  var startChar = charMap[endChar];
  return {
    rstart: new RegExp(escapeRegExp(startChar), "g"),
    rend: new RegExp(escapeRegExp(endChar), "g"),
    start: startChar,
    end: endChar
  };
});

function wordToUtf8(string) {
  var r;

  for (var i = 0, l = charMapRegexes.length; i < l; i++) {
    r = charMapRegexes[i];
    string = string.replace(r.rstart, r.end);
  }

  return string;
}

function utf8ToWord(string) {
  if (typeof string !== "string") {
    string = string.toString();
  }

  var r;

  for (var i = 0, l = charMapRegexes.length; i < l; i++) {
    r = charMapRegexes[i];
    string = string.replace(r.rend, r.start);
  }

  return string;
} // This function is written with for loops for performance


function concatArrays(arrays) {
  var result = [];

  for (var i = 0; i < arrays.length; i++) {
    var array = arrays[i];

    for (var j = 0, len = array.length; j < len; j++) {
      result.push(array[j]);
    }
  }

  return result;
}

var spaceRegexp = new RegExp(String.fromCharCode(160), "g");

function convertSpaces(s) {
  return s.replace(spaceRegexp, " ");
}

function pregMatchAll(regex, content) {
  /* regex is a string, content is the content. It returns an array of all matches with their offset, for example:
  	 regex=la
  	 content=lolalolilala
  returns: [{array: {0: 'la'},offset: 2},{array: {0: 'la'},offset: 8},{array: {0: 'la'} ,offset: 10}]
  */
  var matchArray = [];
  var match;

  while ((match = regex.exec(content)) != null) {
    matchArray.push({
      array: match,
      offset: match.index
    });
  }

  return matchArray;
}

function isEnding(value, element) {
  return value === "</" + element + ">";
}

function isStarting(value, element) {
  return value.indexOf("<" + element) === 0 && [">", " "].indexOf(value[element.length + 1]) !== -1;
}

function getRight(parsed, element, index) {
  var val = getRightOrNull(parsed, element, index);

  if (val !== null) {
    return val;
  }

  throwXmlTagNotFound({
    position: "right",
    element: element,
    parsed: parsed,
    index: index
  });
}

function getRightOrNull(parsed, elements, index) {
  if (typeof elements === "string") {
    elements = [elements];
  }

  var level = 1;

  for (var i = index, l = parsed.length; i < l; i++) {
    var part = parsed[i];

    for (var j = 0, len = elements.length; j < len; j++) {
      var element = elements[j];

      if (isEnding(part.value, element)) {
        level--;
      }

      if (isStarting(part.value, element)) {
        level++;
      }

      if (level === 0) {
        return i;
      }
    }
  }

  return null;
}

function getLeft(parsed, element, index) {
  var val = getLeftOrNull(parsed, element, index);

  if (val !== null) {
    return val;
  }

  throwXmlTagNotFound({
    position: "left",
    element: element,
    parsed: parsed,
    index: index
  });
}

function getLeftOrNull(parsed, elements, index) {
  if (typeof elements === "string") {
    elements = [elements];
  }

  var level = 1;

  for (var i = index; i >= 0; i--) {
    var part = parsed[i];

    for (var j = 0, len = elements.length; j < len; j++) {
      var element = elements[j];

      if (isStarting(part.value, element)) {
        level--;
      }

      if (isEnding(part.value, element)) {
        level++;
      }

      if (level === 0) {
        return i;
      }
    }
  }

  return null;
}

function isTagStart(tagType, _ref2) {
  var type = _ref2.type,
      tag = _ref2.tag,
      position = _ref2.position;
  return type === "tag" && tag === tagType && position === "start";
}

function isTagEnd(tagType, _ref3) {
  var type = _ref3.type,
      tag = _ref3.tag,
      position = _ref3.position;
  return type === "tag" && tag === tagType && position === "end";
}

function isParagraphStart(options) {
  return isTagStart("w:p", options) || isTagStart("a:p", options);
}

function isParagraphEnd(options) {
  return isTagEnd("w:p", options) || isTagEnd("a:p", options);
}

function isTextStart(part) {
  return part.type === "tag" && part.position === "start" && part.text;
}

function isTextEnd(part) {
  return part.type === "tag" && part.position === "end" && part.text;
}

function isContent(p) {
  return p.type === "placeholder" || p.type === "content" && p.position === "insidetag";
}

var corruptCharacters = /[\x00-\x08\x0B\x0C\x0E-\x1F]/; // 00    NUL '\0' (null character)
// 01    SOH (start of heading)
// 02    STX (start of text)
// 03    ETX (end of text)
// 04    EOT (end of transmission)
// 05    ENQ (enquiry)
// 06    ACK (acknowledge)
// 07    BEL '\a' (bell)
// 08    BS  '\b' (backspace)
// 0B    VT  '\v' (vertical tab)
// 0C    FF  '\f' (form feed)
// 0E    SO  (shift out)
// 0F    SI  (shift in)
// 10    DLE (data link escape)
// 11    DC1 (device control 1)
// 12    DC2 (device control 2)
// 13    DC3 (device control 3)
// 14    DC4 (device control 4)
// 15    NAK (negative ack.)
// 16    SYN (synchronous idle)
// 17    ETB (end of trans. blk)
// 18    CAN (cancel)
// 19    EM  (end of medium)
// 1A    SUB (substitute)
// 1B    ESC (escape)
// 1C    FS  (file separator)
// 1D    GS  (group separator)
// 1E    RS  (record separator)
// 1F    US  (unit separator)

function hasCorruptCharacters(string) {
  return corruptCharacters.test(string);
}

module.exports = {
  endsWith: endsWith,
  startsWith: startsWith,
  getNearestLeft: getNearestLeft,
  getNearestRight: getNearestRight,
  isContent: isContent,
  isParagraphStart: isParagraphStart,
  isParagraphEnd: isParagraphEnd,
  isTagStart: isTagStart,
  isTagEnd: isTagEnd,
  isTextStart: isTextStart,
  isTextEnd: isTextEnd,
  unique: unique,
  chunkBy: chunkBy,
  last: last,
  first: first,
  mergeObjects: mergeObjects,
  xml2str: xml2str,
  str2xml: str2xml,
  getRightOrNull: getRightOrNull,
  getRight: getRight,
  getLeftOrNull: getLeftOrNull,
  getLeft: getLeft,
  pregMatchAll: pregMatchAll,
  convertSpaces: convertSpaces,
  escapeRegExp: escapeRegExp,
  charMapRegexes: charMapRegexes,
  hasCorruptCharacters: hasCorruptCharacters,
  defaults: defaults,
  wordToUtf8: wordToUtf8,
  utf8ToWord: utf8ToWord,
  concatArrays: concatArrays,
  charMap: charMap
};