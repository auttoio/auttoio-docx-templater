"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var wrapper = require("../module-wrapper");

var ctXML = "[Content_Types].xml";
var docxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
var docxmContentType = "application/vnd.ms-word.document.macroEnabled.main+xml";
var pptxContentType = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";

function getPartName(override) {
  var partName = override.getAttribute("PartName");

  if (partName[0] === "/") {
    partName = partName.substr(1);
  }

  return partName;
}

var Common =
/*#__PURE__*/
function () {
  function Common() {
    _classCallCheck(this, Common);

    this.name = "Common";
    this.recordRun = false;
    this.recordedRun = [];
  }

  _createClass(Common, [{
    key: "getFileType",
    value: function getFileType(_ref) {
      var zip = _ref.zip,
          contentTypes = _ref.contentTypes,
          overrides = _ref.overrides,
          defaults = _ref.defaults,
          doc = _ref.doc;

      if (!contentTypes) {
        return;
      }

      var fileType = null;
      var partNames = [];

      for (var i = 0, len = overrides.length; i < len; i++) {
        var override = overrides[i];
        var contentType = override.getAttribute("ContentType");
        var partName = getPartName(override);
        partNames.push(partName);

        if (contentType === docxContentType) {
          fileType = "docx";
          doc.targets.push(partName);
        }

        if (contentType === docxmContentType) {
          fileType = "docx";
          doc.targets.push(partName);
        }

        if (contentType === pptxContentType) {
          fileType = "pptx";
          doc.targets.push(partName);
        }
      }

      if (fileType) {
        return fileType;
      }

      var _loop = function _loop(_i, _len) {
        var def = defaults[_i];
        var contentType = def.getAttribute("ContentType");

        if ([docxContentType, docxmContentType, pptxContentType].indexOf(contentType) !== -1) {
          var extension = def.getAttribute("Extension"); // eslint-disable-next-line no-loop-func

          zip.file(/./).map(function (_ref2) {
            var name = _ref2.name;

            if (name.slice(name.length - extension.length - 1) === ".xml" && partNames.indexOf(name) === -1 && name !== ctXML) {
              doc.targets.push(name);
              fileType = contentType === pptxContentType ? "pptx" : "docx";
            }
          });
        }
      };

      for (var _i = 0, _len = defaults.length; _i < _len; _i++) {
        _loop(_i, _len);
      }

      return fileType;
    }
  }]);

  return Common;
}();

module.exports = function () {
  return wrapper(new Common());
};