"use strict";

function moduleResolve(part, options) {
  var moduleResolved;

  for (var i = 0, l = options.modules.length; i < l; i++) {
    var _module = options.modules[i];
    moduleResolved = _module.resolve(part, options);

    if (moduleResolved) {
      return moduleResolved;
    }
  }

  return false;
}

function resolve(options) {
  var resolved = [];
  var baseNullGetter = options.baseNullGetter;
  var compiled = options.compiled,
      scopeManager = options.scopeManager;

  options.nullGetter = function (part, sm) {
    return baseNullGetter(part, sm || scopeManager);
  };

  options.resolved = resolved;
  var errors = [];
  return Promise.all(compiled.map(function (part) {
    var moduleResolved = moduleResolve(part, options);

    if (moduleResolved) {
      return moduleResolved.then(function (value) {
        resolved.push({
          tag: part.value,
          value: value,
          lIndex: part.lIndex
        });
      });
    }

    if (part.type === "placeholder") {
      return scopeManager.getValueAsync(part.value, {
        part: part
      }).then(function (value) {
        if (value == null) {
          value = options.nullGetter(part);
        }

        resolved.push({
          tag: part.value,
          value: value,
          lIndex: part.lIndex
        });
        return value;
      });
    }

    return;
  }).filter(function (a) {
    return a;
  })).then(function () {
    return {
      errors: errors,
      resolved: resolved
    };
  });
}

module.exports = resolve;