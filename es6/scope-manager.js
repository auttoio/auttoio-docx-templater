"use strict";
const { getScopeParserExecutionError } = require("./errors");
const { last } = require("./utils");

function find(list, fn) {
	const length = list.length >>> 0;
	let value;

	for (let i = 0; i < length; i++) {
		value = list[i];
		if (fn.call(this, value, i, list)) {
			return value;
		}
	}
	return undefined;
}

function getValue(tag, meta, num) {
	const scope = this.scopeList[num];
	if (this.resolved) {
		let w = this.resolved;
		this.scopePath.forEach((p, index) => {
			const lIndex = this.scopeLindex[index];
			w = find(w, function(r) {
				return r.lIndex === lIndex;
			});
			w = w.value[this.scopePathItem[index]];
		});
		return [
			this.scopePath.length - 1,
			find(w, function(r) {
				return meta.part.lIndex === r.lIndex;
			}).value,
		];
	}
	// search in the scopes (in reverse order) and keep the first defined value
	let result;
	const parser = this.parser(tag, { scopePath: this.scopePath });
	try {
		result = parser.get(scope, this.getContext(meta, num));
	} catch (error) {
		throw getScopeParserExecutionError({
			tag,
			scope,
			error,
			offset: meta.part.offset,
		});
	}
	if (result == null && num > 0) {
		return getValue.call(this, tag, meta, num - 1);
	}
	return [num, result];
}

function getValueAsync(tag, meta, num) {
	const scope = this.scopeList[num];
	// search in the scopes (in reverse order) and keep the first defined value
	const parser = this.parser(tag, { scopePath: this.scopePath });
	return Promise.resolve(parser.get(scope, this.getContext(meta, num)))
		.catch(function(error) {
			throw getScopeParserExecutionError({ tag, scope, error });
		})
		.then(result => {
			if (result == null && num > 0) {
				return getValueAsync.call(this, tag, meta, num - 1);
			}
			return result;
		});
}

// This class responsibility is to manage the scope
const ScopeManager = class ScopeManager {
	constructor(options) {
		this.scopePath = options.scopePath;
		this.scopePathItem = options.scopePathItem;
		this.scopeList = options.scopeList;
		this.scopeLindex = options.scopeLindex;
		this.parser = options.parser;
		this.resolved = options.resolved;
	}
	loopOver(tag, functor, inverted, meta) {
		return this.loopOverValue(this.getValue(tag, meta), functor, inverted, tag);
	}
	functorIfInverted(inverted, functor, value, i) {
		if (inverted) {
			functor(value, i);
		}
		return inverted;
	}
	isValueFalsy(value, type, tag, scope) {
		const parser = this.parser(tag, { scopePath: this.scopePath });

		return parser.isFalsy(value, type, tag, scope);
/*		return (
			value == null ||
			!value ||
			(type === "[object Array]" && value.length === 0)
		);*/
	}
	loopOverValue(value, functor, inverted, tag) {
		if (this.resolved) {
			inverted = false;
		}
		const type = Object.prototype.toString.call(value);
		const currentValue = this.scopeList[this.num];
		if (this.isValueFalsy(value, type, tag, currentValue)) {
			return this.functorIfInverted(inverted, functor, last(this.scopeList), 0);
		}
		if (type === "[object Array]") {
			for (let i = 0; i < value.length; i++) {
				this.functorIfInverted(!inverted, functor, value[i], i);
			}
			return true;
		}
		if (type === "[object Object]") {
			return this.functorIfInverted(!inverted, functor, value, 0);
		}
		return this.functorIfInverted(!inverted, functor, last(this.scopeList), 0);
	}
	getValue(tag, meta) {
		const [num, result] = getValue.call(
			this,
			tag,
			meta,
			this.scopeList.length - 1
		);
		this.num = num;
		return result;
	}
	getValueAsync(tag, meta) {
		return getValueAsync.call(this, tag, meta, this.scopeList.length - 1);
	}
	getContext(meta, num) {
		return {
			num,
			meta,
			scopeList: this.scopeList,
			resolved: this.resolved,
			scopePath: this.scopePath,
			scopePathItem: this.scopePathItem,
		};
	}
	createSubScopeManager(scope, tag, i, part) {
		return new ScopeManager({
			resolved: this.resolved,
			parser: this.parser,
			scopeList: this.scopeList.concat(scope),
			scopePath: this.scopePath.concat(tag),
			scopePathItem: this.scopePathItem.concat(i),
			scopeLindex: this.scopeLindex.concat(part.lIndex),
		});
	}
};

module.exports = function(options) {
	options.scopePath = [];
	options.scopePathItem = [];
	options.scopeLindex = [];
	options.scopeList = [options.tags];
	return new ScopeManager(options);
};
