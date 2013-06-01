/*
* Kendo UI Complete v2012.2.913 (http://kendoui.com)
* Copyright 2012 Telerik AD. All rights reserved.
*
* Kendo UI Complete commercial licenses may be obtained at
* https://www.kendoui.com/purchase/license-agreement/kendo-ui-complete-commercial.aspx
* If you do not own a commercial license, this file shall be governed by the trial license terms.
*/
;(function($, undefined) {
    var kendo = window.kendo = window.kendo || {},
        extend = $.extend,
        each = $.each,
        proxy = $.proxy,
        isArray = $.isArray,
        noop = $.noop,
        isFunction = $.isFunction,
        math = Math,
        Template,
        JSON = window.JSON || {},
        support = {},
        percentRegExp = /%/,
        formatRegExp = /\{(\d+)(:[^\}]+)?\}/g,
        boxShadowRegExp = /(\d+?)px\s*(\d+?)px\s*(\d+?)px\s*(\d+?)?/i,
        FUNCTION = "function",
        STRING = "string",
        NUMBER = "number",
        OBJECT = "object",
        NULL = "null",
        BOOLEAN = "boolean",
        UNDEFINED = "undefined",
        getterCache = {},
        setterCache = {},
        slice = [].slice,
        globalize = window.Globalize;

    function Class() {}

    Class.extend = function(proto) {
        var base = function() {},
            member,
            that = this,
            subclass = proto && proto.init ? proto.init : function () {
                that.apply(this, arguments);
            },
            fn;

        base.prototype = that.prototype;
        fn = subclass.fn = subclass.prototype = new base();

        for (member in proto) {
            if (typeof proto[member] === OBJECT && !(proto[member] instanceof Array) && proto[member] !== null) {
                // Merge object members
                fn[member] = extend(true, {}, base.prototype[member], proto[member]);
            } else {
                fn[member] = proto[member];
            }
        }

        fn.constructor = subclass;
        subclass.extend = that.extend;

        return subclass;
    };

    var Observable = Class.extend({
        init: function() {
            this._events = {};
        },

        bind: function(eventName, handlers, one) {
            var that = this,
                idx,
                eventNames = typeof eventName === STRING ? [eventName] : eventName,
                length,
                original,
                handler,
                handlersIsFunction = typeof handlers === FUNCTION,
                events;

            for (idx = 0, length = eventNames.length; idx < length; idx++) {
                eventName = eventNames[idx];

                handler = handlersIsFunction ? handlers : handlers[eventName];

                if (handler) {
                    if (one) {
                        original = handler;
                        handler = function() {
                            that.unbind(eventName, handler);
                            original.apply(that, arguments);
                        };
                    }
                    events = that._events[eventName] = that._events[eventName] || [];
                    events.push(handler);
                }
            }

            return that;
        },

        one: function(eventNames, handlers) {
            return this.bind(eventNames, handlers, true);
        },

        first: function(eventName, handlers) {
            var that = this,
                idx,
                eventNames = typeof eventName === STRING ? [eventName] : eventName,
                length,
                handler,
                handlersIsFunction = typeof handlers === FUNCTION,
                events;

            for (idx = 0, length = eventNames.length; idx < length; idx++) {
                eventName = eventNames[idx];

                handler = handlersIsFunction ? handlers : handlers[eventName];

                if (handler) {
                    events = that._events[eventName] = that._events[eventName] || [];
                    events.unshift(handler);
                }
            }

            return that;
        },

        trigger: function(eventName, e) {
            var that = this,
                events = that._events[eventName],
                idx,
                length,
                isDefaultPrevented = false;

            if (events) {
                e = e || {};

                e.sender = that;

                e.preventDefault = function () {
                    isDefaultPrevented = true;
                };

                e.isDefaultPrevented = function() {
                    return isDefaultPrevented;
                };

                events = events.slice();

                //Do not cache the length of the events array as removing events attached through one will fail
                for (idx = 0, length = events.length; idx < length; idx++) {
                    events[idx].call(that, e);
                }
            }

            return isDefaultPrevented;
        },

        unbind: function(eventName, handler) {
            var that = this,
                events = that._events[eventName],
                idx,
                length;

            if (eventName === undefined) {
                that._events = {};
            } else if (events) {
                if (handler) {
                    for (idx = 0, length = events.length; idx < length; idx++) {
                        if (events[idx] === handler) {
                            events.splice(idx, 1);
                        }
                    }
                } else {
                    that._events[eventName] = [];
                }
            }

            return that;
        }
    });


     function compilePart(part, stringPart) {
         if (stringPart) {
             return "'" +
                 part.split("'").join("\\'")
                     .split('\\"').join('\\\\\\"')
                     .replace(/\n/g, "\\n")
                     .replace(/\r/g, "\\r")
                     .replace(/\t/g, "\\t") + "'";
         } else {
             var first = part.charAt(0),
                 rest = part.substring(1);

             if (first === "=") {
                 return "+(" + rest + ")+";
             } else if (first === ":") {
                 return "+e(" + rest + ")+";
             } else {
                 return ";" + part + ";o+=";
             }
         }
     }

    var argumentNameRegExp = /^\w+/,
        encodeRegExp = /\$\{([^}]*)\}/g,
        escapedCurlyRegExp = /\\\}/g,
        curlyRegExp = /__CURLY__/g,
        escapedSharpRegExp = /\\#/g,
        sharpRegExp = /__SHARP__/g;

    Template = {
        paramName: "data", // name of the parameter of the generated template
        useWithBlock: true, // whether to wrap the template in a with() block
        render: function(template, data) {
            var idx,
                length,
                html = "";

            for (idx = 0, length = data.length; idx < length; idx++) {
                html += template(data[idx]);
            }

            return html;
        },
        compile: function(template, options) {
            var settings = extend({}, this, options),
                paramName = settings.paramName,
                argumentName = paramName.match(argumentNameRegExp)[0],
                useWithBlock = settings.useWithBlock,
                functionBody = "var o,e=kendo.htmlEncode;",
                parts,
                idx;

            if (isFunction(template)) {
                if (template.length === 2) {
                    //looks like jQuery.template
                    return function(d) {
                        return template($, { data: d }).join("");
                    };
                }
                return template;
            }

            functionBody += useWithBlock ? "with(" + paramName + "){" : "";

            functionBody += "o=";

            parts = template
                .replace(escapedCurlyRegExp, "__CURLY__")
                .replace(encodeRegExp, "#=e($1)#")
                .replace(curlyRegExp, "}")
                .replace(escapedSharpRegExp, "__SHARP__")
                .split("#");

            for (idx = 0; idx < parts.length; idx ++) {
                functionBody += compilePart(parts[idx], idx % 2 === 0);
            }

            functionBody += useWithBlock ? ";}" : ";";

            functionBody += "return o;";

            functionBody = functionBody.replace(sharpRegExp, "#");

            try {
                return new Function(argumentName, functionBody);
            } catch(e) {
                throw new Error(kendo.format("Invalid template:'{0}' Generated code:'{1}'", template, functionBody));
            }
        }
    };

function pad(number) {
    return number < 10 ? "0" + number : number;
}

    //JSON stringify
(function() {
    var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"" : '\\"',
            "\\": "\\\\"
        },
        rep,
        toString = {}.toString;

    if (typeof Date.prototype.toJSON !== FUNCTION) {


        Date.prototype.toJSON = function (key) {
            var that = this;

            return isFinite(that.valueOf()) ?
                that.getUTCFullYear()     + "-" +
                pad(that.getUTCMonth() + 1) + "-" +
                pad(that.getUTCDate())      + "T" +
                pad(that.getUTCHours())     + ":" +
                pad(that.getUTCMinutes())   + ":" +
                pad(that.getUTCSeconds())   + "Z" : null;
        };

        String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string) ? "\"" + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === STRING ? c :
                "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        }) + "\"" : "\"" + string + "\"";
    }

    function str(key, holder) {
        var i,
            k,
            v,
            length,
            mind = gap,
            partial,
            value = holder[key],
            type;

        if (value && typeof value === OBJECT && typeof value.toJSON === FUNCTION) {
            value = value.toJSON(key);
        }

        if (typeof rep === FUNCTION) {
            value = rep.call(holder, key, value);
        }

        type = typeof value;
        if (type === STRING) {
            return quote(value);
        } else if (type === NUMBER) {
            return isFinite(value) ? String(value) : NULL;
        } else if (type === BOOLEAN || type === NULL) {
            return String(value);
        } else if (type === OBJECT) {
            if (!value) {
                return NULL;
            }
            gap += indent;
            partial = [];
            if (toString.apply(value) === "[object Array]") {
                length = value.length;
                for (i = 0; i < length; i++) {
                    partial[i] = str(i, value) || NULL;
                }
                v = partial.length === 0 ? "[]" : gap ?
                    "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]" :
                    "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }
            if (rep && typeof rep === OBJECT) {
                length = rep.length;
                for (i = 0; i < length; i++) {
                    if (typeof rep[i] === STRING) {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ": " : ":") + v);
                        }
                    }
                }
            } else {
                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ": " : ":") + v);
                        }
                    }
                }
            }

            v = partial.length === 0 ? "{}" : gap ?
                "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}" :
                "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

    if (typeof JSON.stringify !== FUNCTION) {
        JSON.stringify = function (value, replacer, space) {
            var i;
            gap = "";
            indent = "";

            if (typeof space === NUMBER) {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

            } else if (typeof space === STRING) {
                indent = space;
            }

            rep = replacer;
            if (replacer && typeof replacer !== FUNCTION && (typeof replacer !== OBJECT || typeof replacer.length !== NUMBER)) {
                throw new Error("JSON.stringify");
            }

            return str("", {"": value});
        };
    }
})();

// Date and Number formatting
(function() {
    var dateFormatRegExp = /dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|HH|H|hh|h|mm|m|fff|ff|f|tt|ss|s|"[^"]*"|'[^']*'/g,
        standardFormatRegExp =  /^(n|c|p|e)(\d*)$/i,
        literalRegExp = /["'].*?["']/g,
        commaRegExp = /\,/g,
        EMPTY = "",
        POINT = ".",
        COMMA = ",",
        SHARP = "#",
        ZERO = "0",
        PLACEHOLDER = "??",
        EN = "en-US";

    //cultures
    kendo.cultures = {"en-US" : {
        name: EN,
        numberFormat: {
            pattern: ["-n"],
            decimals: 2,
            ",": ",",
            ".": ".",
            groupSize: [3],
            percent: {
                pattern: ["-n %", "n %"],
                decimals: 2,
                ",": ",",
                ".": ".",
                groupSize: [3],
                symbol: "%"
            },
            currency: {
                pattern: ["($n)", "$n"],
                decimals: 2,
                ",": ",",
                ".": ".",
                groupSize: [3],
                symbol: "$"
            }
        },
        calendars: {
            standard: {
                days: {
                    names: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    namesAbbr: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                    namesShort: [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa" ]
                },
                months: {
                    names: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                    namesAbbr: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                },
                AM: [ "AM", "am", "AM" ],
                PM: [ "PM", "pm", "PM" ],
                patterns: {
                    d: "M/d/yyyy",
                    D: "dddd, MMMM dd, yyyy",
                    F: "dddd, MMMM dd, yyyy h:mm:ss tt",
                    g: "M/d/yyyy h:mm tt",
                    G: "M/d/yyyy h:mm:ss tt",
                    m: "MMMM dd",
                    M: "MMMM dd",
                    s: "yyyy'-'MM'-'ddTHH':'mm':'ss",
                    t: "h:mm tt",
                    T: "h:mm:ss tt",
                    u: "yyyy'-'MM'-'dd HH':'mm':'ss'Z'",
                    y: "MMMM, yyyy",
                    Y: "MMMM, yyyy"
                },
                "/": "/",
                ":": ":",
                firstDay: 0
            }
        }
    }};


     function findCulture(culture) {
        if (culture) {
            if (culture.numberFormat) {
                return culture;
            }

            if (typeof culture === STRING) {
                var cultures = kendo.cultures;
                return cultures[culture] || cultures[culture.split("-")[0]] || null;
            }

            return null;
        }

        return null;
    }

    function getCulture(culture) {
        if (culture) {
            culture = findCulture(culture);
        }

        return culture || kendo.cultures.current;
    }

    kendo.culture = function(cultureName) {
        var cultures = kendo.cultures, culture;

        if (cultureName !== undefined) {
            culture = findCulture(cultureName) || cultures[EN];
            culture.calendar = culture.calendars.standard;
            cultures.current = culture;
        } else {
            return cultures.current;
        }
    };

    kendo.findCulture = findCulture;
    kendo.getCulture = getCulture;

    //set current culture to en-US.
    kendo.culture(EN);

    function formatDate(date, format, culture) {
        culture = getCulture(culture);

        var calendar = culture.calendars.standard,
            days = calendar.days,
            months = calendar.months;

        format = calendar.patterns[format] || format;

        return format.replace(dateFormatRegExp, function (match) {
            var result;

            if (match === "d") {
                result = date.getDate();
            } else if (match === "dd") {
                result = pad(date.getDate());
            } else if (match === "ddd") {
                result = days.namesAbbr[date.getDay()];
            } else if (match === "dddd") {
                result = days.names[date.getDay()];
            } else if (match === "M") {
                result = date.getMonth() + 1;
            } else if (match === "MM") {
                result = pad(date.getMonth() + 1);
            } else if (match === "MMM") {
                result = months.namesAbbr[date.getMonth()];
            } else if (match === "MMMM") {
                result = months.names[date.getMonth()];
            } else if (match === "yy") {
                result = pad(date.getFullYear() % 100);
            } else if (match === "yyyy") {
                result = date.getFullYear();
            } else if (match === "h" ) {
                result = date.getHours() % 12 || 12;
            } else if (match === "hh") {
                result = pad(date.getHours() % 12 || 12);
            } else if (match === "H") {
                result = date.getHours();
            } else if (match === "HH") {
                result = pad(date.getHours());
            } else if (match === "m") {
                result = date.getMinutes();
            } else if (match === "mm") {
                result = pad(date.getMinutes());
            } else if (match === "s") {
                result = date.getSeconds();
            } else if (match === "ss") {
                result = pad(date.getSeconds());
            } else if (match === "f") {
                result = math.floor(date.getMilliseconds() / 100);
            } else if (match === "ff") {
                result = math.floor(date.getMilliseconds() / 10);
            } else if (match === "fff") {
                result = date.getMilliseconds();
            } else if (match === "tt") {
                result = date.getHours() < 12 ? calendar.AM[0] : calendar.PM[0];
            }

            return result !== undefined ? result : match.slice(1, match.length - 1);
        });
    }

    //number formatting
    function formatNumber(number, format, culture) {
        culture = getCulture(culture);

        var numberFormat = culture.numberFormat,
            groupSize = numberFormat.groupSize[0],
            groupSeparator = numberFormat[COMMA],
            decimal = numberFormat[POINT],
            precision = numberFormat.decimals,
            pattern = numberFormat.pattern[0],
            literals = [],
            symbol,
            isCurrency, isPercent,
            customPrecision,
            formatAndPrecision,
            negative = number < 0,
            integer,
            fraction,
            integerLength,
            fractionLength,
            replacement = EMPTY,
            value = EMPTY,
            idx,
            length,
            ch,
            hasGroup,
            hasNegativeFormat,
            decimalIndex,
            sharpIndex,
            zeroIndex,
            percentIndex,
            startZeroIndex,
            start = -1,
            end;

        //return empty string if no number
        if (number === undefined) {
            return EMPTY;
        }

        if (!isFinite(number)) {
            return number;
        }

        //if no format then return number.toString() or number.toLocaleString() if culture.name is not defined
        if (!format) {
            return culture.name.length ? number.toLocaleString() : number.toString();
        }

        formatAndPrecision = standardFormatRegExp.exec(format);

        // standard formatting
        if (formatAndPrecision) {
            format = formatAndPrecision[1].toLowerCase();

            isCurrency = format === "c";
            isPercent = format === "p";

            if (isCurrency || isPercent) {
                //get specific number format information if format is currency or percent
                numberFormat = isCurrency ? numberFormat.currency : numberFormat.percent;
                groupSize = numberFormat.groupSize[0];
                groupSeparator = numberFormat[COMMA];
                decimal = numberFormat[POINT];
                precision = numberFormat.decimals;
                symbol = numberFormat.symbol;
                pattern = numberFormat.pattern[negative ? 0 : 1];
            }

            customPrecision = formatAndPrecision[2];

            if (customPrecision) {
                precision = +customPrecision;
            }

            //return number in exponential format
            if (format === "e") {
                return customPrecision ? number.toExponential(precision) : number.toExponential(); // toExponential() and toExponential(undefined) differ in FF #653438.
            }

            // multiply if format is percent
            if (isPercent) {
                number *= 100;
            }

            number = number.toFixed(precision);
            number = number.split(POINT);

            integer = number[0];
            fraction = number[1];

            //exclude "-" if number is negative.
            if (negative) {
                integer = integer.substring(1);
            }

            value = integer;
            integerLength = integer.length;

            //add group separator to the number if it is longer enough
            if (integerLength >= groupSize) {
                value = EMPTY;
                for (idx = 0; idx < integerLength; idx++) {
                    if (idx > 0 && (integerLength - idx) % groupSize === 0) {
                        value += groupSeparator;
                    }
                    value += integer.charAt(idx);
                }
            }

            if (fraction) {
                value += decimal + fraction;
            }

            if (format === "n" && !negative) {
                return value;
            }

            number = EMPTY;

            for (idx = 0, length = pattern.length; idx < length; idx++) {
                ch = pattern.charAt(idx);

                if (ch === "n") {
                    number += value;
                } else if (ch === "$" || ch === "%") {
                    number += symbol;
                } else {
                    number += ch;
                }
            }

            return number;
        }

        //custom formatting
        //
        //separate format by sections.

        //make number positive
        if (negative) {
            number = -number;
        }

        format = format.split(";");
        if (negative && format[1]) {
            //get negative format
            format = format[1];
            hasNegativeFormat = true;
        } else if (number === 0) {
            //format for zeros
            format = format[2] || format[0];
            if (format.indexOf(SHARP) == -1 && format.indexOf(ZERO) == -1) {
                //return format if it is string constant.
                return format;
            }
        } else {
            format = format[0];
        }

        if (format.indexOf("'") > -1 || format.indexOf("\"") > -1) {
            format = format.replace(literalRegExp, function(match) {
                literals.push(match);
                return PLACEHOLDER;
            });
        }

        percentIndex = format.indexOf("%");

        isPercent = percentIndex != -1;
        isCurrency = format.indexOf("$") != -1;

        //multiply number if the format has percent
        if (isPercent) {
            if (format[percentIndex - 1] !== "\\") {
                number *= 100;
            } else {
                format = format.split("\\").join("");
            }
        }

        if (isCurrency || isPercent) {
            //get specific number format information if format is currency or percent
            numberFormat = isCurrency ? numberFormat.currency : numberFormat.percent;
            groupSize = numberFormat.groupSize[0];
            groupSeparator = numberFormat[COMMA];
            decimal = numberFormat[POINT];
            precision = numberFormat.decimals;
            symbol = numberFormat.symbol;
        }

        hasGroup = format.indexOf(COMMA) > -1;
        if (hasGroup) {
            format = format.replace(commaRegExp, EMPTY);
        }

        decimalIndex = format.indexOf(POINT);
        length = format.length;

        if (decimalIndex != -1) {
            zeroIndex = format.lastIndexOf(ZERO);
            sharpIndex = format.lastIndexOf(SHARP);
            fraction = number.toString().split(POINT)[1] || EMPTY;

            if (sharpIndex > zeroIndex && fraction.length > (sharpIndex - zeroIndex)) {
                idx = sharpIndex;
            } else if (zeroIndex != -1 && zeroIndex >= decimalIndex) {
                idx = zeroIndex;
            }

            if (idx) {
                number = number.toFixed(idx - decimalIndex);
            }

        } else {
            number = number.toFixed(0);
        }

        sharpIndex = format.indexOf(SHARP);
        startZeroIndex = zeroIndex = format.indexOf(ZERO);

        //define the index of the first digit placeholder
        if (sharpIndex == -1 && zeroIndex != -1) {
            start = zeroIndex;
        } else if (sharpIndex != -1 && zeroIndex == -1) {
            start = sharpIndex;
        } else {
            start = sharpIndex > zeroIndex ? zeroIndex : sharpIndex;
        }

        sharpIndex = format.lastIndexOf(SHARP);
        zeroIndex = format.lastIndexOf(ZERO);

        //define the index of the last digit placeholder
        if (sharpIndex == -1 && zeroIndex != -1) {
            end = zeroIndex;
        } else if (sharpIndex != -1 && zeroIndex == -1) {
            end = sharpIndex;
        } else {
            end = sharpIndex > zeroIndex ? sharpIndex : zeroIndex;
        }

        if (start == length) {
            end = start;
        }

        if (start != -1) {
            value = number.toString().split(POINT);
            integer = value[0];
            fraction = value[1] || EMPTY;

            integerLength = integer.length;
            fractionLength = fraction.length;

            //add group separator to the number if it is longer enough
            if (hasGroup) {
                if (integerLength === groupSize && integerLength < decimalIndex - startZeroIndex) {
                    integer = groupSeparator + integer;
                } else if (integerLength > groupSize) {
                    value = EMPTY;
                    for (idx = 0; idx < integerLength; idx++) {
                        if (idx > 0 && (integerLength - idx) % groupSize === 0) {
                            value += groupSeparator;
                        }
                        value += integer.charAt(idx);
                    }

                    integer = value;
                }
            }

            number = format.substring(0, start);

            if (negative && !hasNegativeFormat) {
                number += "-";
            }

            for (idx = start; idx < length; idx++) {
                ch = format.charAt(idx);

                if (decimalIndex == -1) {
                    if (end - idx < integerLength) {
                        number += integer;
                        break;
                    }
                } else {
                    if (zeroIndex != -1 && zeroIndex < idx) {
                        replacement = EMPTY;
                    }

                    if ((decimalIndex - idx) <= integerLength && decimalIndex - idx > -1) {
                        number += integer;
                        idx = decimalIndex;
                    }

                    if (decimalIndex === idx) {
                        number += (fraction ? decimal : EMPTY) + fraction;
                        idx += end - decimalIndex + 1;
                        continue;
                    }
                }

                if (ch === ZERO) {
                    number += ch;
                    replacement = ch;
                } else if (ch === SHARP) {
                    number += replacement;
                }
            }

            if (end >= start) {
                number += format.substring(end + 1);
            }

            //replace symbol placeholders
            if (isCurrency || isPercent) {
                value = EMPTY;
                for (idx = 0, length = number.length; idx < length; idx++) {
                    ch = number.charAt(idx);
                    value += (ch === "$" || ch === "%") ? symbol : ch;
                }
                number = value;
            }

            if (literals[0]) {
                length = literals.length;
                for (idx = 0; idx < length; idx++) {
                    number = number.replace(PLACEHOLDER, literals[idx]);
                }
            }
        }

        return number;
    }

    var toString = function(value, fmt, culture) {
        if (fmt) {
            if (value instanceof Date) {
                return formatDate(value, fmt, culture);
            } else if (typeof value === NUMBER) {
                return formatNumber(value, fmt, culture);
            }
        }

        return value !== undefined ? value : "";
    };

    if (globalize) {
        toString = proxy(globalize.format, globalize);
    }

    kendo.format = function(fmt) {
        var values = arguments;

        return fmt.replace(formatRegExp, function(match, index, placeholderFormat) {
            var value = values[parseInt(index, 10) + 1];

            return toString(value, placeholderFormat ? placeholderFormat.substring(1) : "");
        });
    };

    kendo._extractFormat = function (format) {
        if (format.slice(0,3) === "{0:") {
            format = format.slice(3, format.length - 1);
        }

        return format;
    };

    kendo.toString = toString;
    })();


(function() {
    var nonBreakingSpaceRegExp = /\u00A0/g,
        exponentRegExp = /[eE][\-+]?[0-9]+/,
        shortTimeZoneRegExp = /[+|\-]\d{1,2}/,
        longTimeZoneRegExp = /[+|\-]\d{1,2}:\d{2}/,
        dateRegExp = /^\/Date\((.*?)\)\/$/,
        formatsSequence = ["G", "g", "d", "F", "D", "y", "m", "T", "t"],
        numberRegExp = {
            2: /^\d{1,2}/,
            4: /^\d{4}/
        };

    function outOfRange(value, start, end) {
        return !(value >= start && value <= end);
    }

    function designatorPredicate(designator) {
        return designator.charAt(0);
    }

    function mapDesignators(designators) {
        return $.map(designators, designatorPredicate);
    }

    function parseExact(value, format, culture) {
        if (!value) {
            return null;
        }

        var lookAhead = function (match) {
                var i = 0;
                while (format[idx] === match) {
                    i++;
                    idx++;
                }
                if (i > 0) {
                    idx -= 1;
                }
                return i;
            },
            getNumber = function(size) {
                var rg = numberRegExp[size] || new RegExp('^\\d{1,' + size + '}'),
                    match = value.substr(valueIdx, size).match(rg);

                if (match) {
                    match = match[0];
                    valueIdx += match.length;
                    return parseInt(match, 10);
                }
                return null;
            },
            getIndexByName = function (names) {
                var i = 0,
                    length = names.length,
                    name, nameLength;

                for (; i < length; i++) {
                    name = names[i];
                    nameLength = name.length;

                    if (value.substr(valueIdx, nameLength) == name) {
                        valueIdx += nameLength;
                        return i + 1;
                    }
                }
                return null;
            },
            checkLiteral = function() {
                var result = false;
                if (value.charAt(valueIdx) === format[idx]) {
                    valueIdx++;
                    result = true;
                }
                return result;
            },
            calendar = culture.calendars.standard,
            year = null,
            month = null,
            day = null,
            hours = null,
            minutes = null,
            seconds = null,
            milliseconds = null,
            idx = 0,
            valueIdx = 0,
            literal = false,
            date = new Date(),
            shortYearCutOff = 30,
            defaultYear = date.getFullYear(),
            ch, count, length, pattern,
            pmHour, UTC, ISO8601, matches,
            amDesignators, pmDesignators,
            hoursOffset, minutesOffset;

        if (!format) {
            format = "d"; //shord date format
        }

        //if format is part of the patterns get real format
        pattern = calendar.patterns[format];
        if (pattern) {
            format = pattern;
        }

        format = format.split("");
        length = format.length;

        for (; idx < length; idx++) {
            ch = format[idx];

            if (literal) {
                if (ch === "'") {
                    literal = false;
                } else {
                    checkLiteral();
                }
            } else {
                if (ch === "d") {
                    count = lookAhead("d");
                    day = count < 3 ? getNumber(2) : getIndexByName(calendar.days[count == 3 ? "namesAbbr" : "names"]);

                    if (day === null || outOfRange(day, 1, 31)) {
                        return null;
                    }
                } else if (ch === "M") {
                    count = lookAhead("M");
                    month = count < 3 ? getNumber(2) : getIndexByName(calendar.months[count == 3 ? 'namesAbbr' : 'names']);

                    if (month === null || outOfRange(month, 1, 12)) {
                        return null;
                    }
                    month -= 1; //because month is zero based
                } else if (ch === "y") {
                    count = lookAhead("y");
                    year = getNumber(count);
                    if (year === null) {
                        year = defaultYear;
                    }
                    if (year < shortYearCutOff) {
                        year = (defaultYear - defaultYear % 100) + year;
                    }
                } else if (ch === "h" ) {
                    lookAhead("h");
                    hours = getNumber(2);
                    if (hours == 12) {
                        hours = 0;
                    }
                    if (hours === null || outOfRange(hours, 0, 11)) {
                        return null;
                    }
                } else if (ch === "H") {
                    lookAhead("H");
                    hours = getNumber(2);
                    if (hours === null || outOfRange(hours, 0, 23)) {
                        return null;
                    }
                } else if (ch === "m") {
                    lookAhead("m");
                    minutes = getNumber(2);
                    if (minutes === null || outOfRange(minutes, 0, 59)) {
                        return null;
                    }
                } else if (ch === "s") {
                    lookAhead("s");
                    seconds = getNumber(2);
                    if (seconds === null || outOfRange(seconds, 0, 59)) {
                        return null;
                    }
                } else if (ch === "f") {
                    count = lookAhead("f");
                    milliseconds = getNumber(count);
                    if (milliseconds === null || outOfRange(milliseconds, 0, 999)) {
                        return null;
                    }
                } else if (ch === "t") {
                    count = lookAhead("t");
                    amDesignators = calendar.AM;
                    pmDesignators = calendar.PM;

                    if (count === 1) {
                        amDesignators = mapDesignators(amDesignators);
                        pmDesignators = mapDesignators(pmDesignators);
                    }

                    pmHour = getIndexByName(pmDesignators);
                    if (!pmHour && !getIndexByName(amDesignators)) {
                        return null;
                    }
                }
                else if (ch === "z") {
                    UTC = true;
                    count = lookAhead("z");

                    if (value.substr(valueIdx, 1) === "Z") {
                        if (!ISO8601) {
                            return null;
                        }

                        checkLiteral();
                        continue;
                    }

                    matches = value.substr(valueIdx, 6)
                                   .match(count > 2 ? longTimeZoneRegExp : shortTimeZoneRegExp);

                    if (!matches) {
                        return null;
                    }

                    matches = matches[0];
                    valueIdx = matches.length;
                    matches = matches.split(":");

                    hoursOffset = parseInt(matches[0], 10);
                    if (outOfRange(hoursOffset, -12, 13)) {
                        return null;
                    }

                    if (count > 2) {
                        minutesOffset = parseInt(matches[1], 10);
                        if (isNaN(minutesOffset) || outOfRange(minutesOffset, 0, 59)) {
                            return null;
                        }
                    }
                } else if (ch === "T") {
                    ISO8601 = checkLiteral();
                } else if (ch === "'") {
                    literal = true;
                    checkLiteral();
                } else if (!checkLiteral()) {
                    return null;
                }
            }
        }

        if (pmHour && hours < 12) {
            hours += 12;
        }

        if (day === null) {
            day = 1;
        }

        if (UTC) {
            if (hoursOffset) {
                hours += -hoursOffset;
            }

            if (minutesOffset) {
                minutes += -minutesOffset;
            }

            return new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
        }

        return new Date(year, month, day, hours, minutes, seconds, milliseconds);
    }

    kendo.parseDate = function(value, formats, culture) {
        if (value instanceof Date) {
            return value;
        }

        var idx = 0,
            date = null,
            length, patterns;

        if (value && value.indexOf("/D") === 0) {
            date = dateRegExp.exec(value);
            if (date) {
                return new Date(parseInt(date[1], 10));
            }
        }

        culture = kendo.getCulture(culture);

        if (!formats) {
            formats = [];
            patterns = culture.calendar.patterns;
            length = formatsSequence.length;

            for (; idx < length; idx++) {
                formats[idx] = patterns[formatsSequence[idx]];
            }
            formats[idx] = "ddd MMM dd yyyy HH:mm:ss";
            formats[++idx] = "yyyy-MM-ddTHH:mm:ss.fffzzz";
            formats[++idx] = "yyyy-MM-ddTHH:mm:sszzz";
            formats[++idx] = "yyyy-MM-ddTHH:mmzzz";
            formats[++idx] = "yyyy-MM-ddTHH:mmzz";
            formats[++idx] = "yyyy-MM-dd";

            idx = 0;
        }

        formats = isArray(formats) ? formats: [formats];
        length = formats.length;

        for (; idx < length; idx++) {
            date = parseExact(value, formats[idx], culture);
            if (date) {
                return date;
            }
        }

        return date;
    };

    kendo.parseInt = function(value, culture) {
        var result = kendo.parseFloat(value, culture);
        if (result) {
            result = result | 0;
        }
        return result;
    };

    kendo.parseFloat = function(value, culture, format) {
        if (!value && value !== 0) {
           return null;
        }

        if (typeof value === NUMBER) {
           return value;
        }

        value = value.toString();
        culture = kendo.getCulture(culture);

        var number = culture.numberFormat,
            percent = number.percent,
            currency = number.currency,
            symbol = currency.symbol,
            percentSymbol = percent.symbol,
            negative = value.indexOf("-") > -1,
            parts, isPercent;

        //handle exponential number
        if (exponentRegExp.test(value)) {
            value = parseFloat(value);
            if (isNaN(value)) {
                value = null;
            }
            return value;
        }

        if (value.indexOf(symbol) > -1 || (format && format.toLowerCase().indexOf("c") > -1)) {
            number = currency;
            parts = number.pattern[0].replace("$", symbol).split("n");
            if (value.indexOf(parts[0]) > -1 && value.indexOf(parts[1]) > -1) {
                value = value.replace(parts[0], "").replace(parts[1], "");
                negative = true;
            }
        } else if (value.indexOf(percentSymbol) > -1) {
            isPercent = true;
            number = percent;
            symbol = percentSymbol;
        }

        value = value.replace("-", "")
                     .replace(symbol, "")
                     .replace(nonBreakingSpaceRegExp, " ")
                     .split(number[","].replace(nonBreakingSpaceRegExp, " ")).join("")
                     .replace(number["."], ".");

        value = parseFloat(value);

        if (isNaN(value)) {
            value = null;
        } else if (negative) {
            value *= -1;
        }

        if (value && isPercent) {
            value /= 100;
        }

        return value;
    };

    if (globalize) {
        kendo.parseDate = proxy(globalize.parseDate, globalize);
        kendo.parseFloat = proxy(globalize.parseFloat, globalize);
    }
})();

    function wrap(element) {
        var browser = support.browser, percentage;

        if (!element.parent().hasClass("k-animation-container")) {
            var shadow = element.css(kendo.support.transitions.css + "box-shadow") || element.css("box-shadow"),
                radius = shadow ? shadow.match(boxShadowRegExp) || [ 0, 0, 0, 0, 0 ] : [ 0, 0, 0, 0, 0 ],
                blur = math.max((+radius[3]), +(radius[4] || 0)),
                left = (-radius[1]) + blur,
                right = (+radius[1]) + blur,
                bottom = (+radius[2]) + blur,
                width = element[0].style.width,
                height = element[0].style.height,
                percentWidth = percentRegExp.test(width),
                percentHeight = percentRegExp.test(height);

            if (browser.opera) { // Box shadow can't be retrieved in Opera
                left = right = bottom = 5;
            }

            percentage = percentWidth || percentHeight;

            if (!percentWidth) { width = element.outerWidth(); }
            if (!percentHeight) { height = element.outerHeight(); }

            element.wrap(
                         $("<div/>")
                         .addClass("k-animation-container")
                         .css({
                             width: width,
                             height: height,
                             marginLeft: -left,
                             paddingLeft: left,
                             paddingRight: right,
                             paddingBottom: bottom
                         }));

            if (percentage) {
                element.css({
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    mozBoxSizing: "border-box",
                    webkitBoxSizing: "border-box"
                });
            }
        } else {
            var wrapper = element.parent(".k-animation-container"),
                wrapperStyle = wrapper[0].style;

            if (wrapper.is(":hidden")) {
                wrapper.show();
            }

            percentage = percentRegExp.test(wrapperStyle.width) || percentRegExp.test(wrapperStyle.height);

            if (!percentage) {
                wrapper.css({
                    width: element.outerWidth(),
                    height: element.outerHeight()
                });
            }
        }

        if (browser.msie && math.floor(browser.version) <= 7) {
            element.css({
                zoom: 1
            });
        }

        return element.parent();
    }

    function deepExtend(destination) {
        var i = 1,
            length = arguments.length;

        for (i = 1; i < length; i++) {
            deepExtendOne(destination, arguments[i]);
        }

        return destination;
    }

    function deepExtendOne(destination, source) {
        var ObservableArray = kendo.data.ObservableArray,
            property,
            propValue,
            propType,
            destProp;

        for (property in source) {
            propValue = source[property];
            propType = typeof propValue;
            if (propType === OBJECT && propValue !== null && propValue.constructor !== Array && propValue.constructor !== ObservableArray) {
                if (propValue instanceof Date) {
                    destination[property] = new Date(propValue.getTime());
                } else {
                    destProp = destination[property];
                    if (typeof (destProp) === OBJECT) {
                        destination[property] = destProp || {};
                    } else {
                        destination[property] = {};
                    }
                    deepExtendOne(destination[property], propValue);
                }
            } else if (propType !== UNDEFINED) {
                destination[property] = propValue;
            }
        }

        return destination;
    }

    function testRx(agent, rxs, dflt) {
        for (var rx in rxs) {
            if (rxs.hasOwnProperty(rx) && rxs[rx].test(agent)) {
                return rx;
            }
        }
        return dflt !== undefined ? dflt : agent;
    }

    function getComputedStyles(element, properties) {
        var styles = {}, computedStyle;

        if (document.defaultView && document.defaultView.getComputedStyle) {
            computedStyle = document.defaultView.getComputedStyle(element, "");

            if (properties) {
                $.each(properties, function(idx, value) {
                    styles[value] = computedStyle.getPropertyValue(value);
                });
            }
        } else {
            computedStyle = element.currentStyle;

            if (properties) {
                $.each(properties, function(idx, value) {
                    styles[value] = computedStyle[value.replace(/\-(\w)/g, function (strMatch, g1) { return g1.toUpperCase(); })];
                });
            }
        }

        if (!kendo.size(styles)) {
            styles = computedStyle;
        }

        return styles;
    }

    (function() {
        support.scrollbar = function() {
            var div = document.createElement("div"),
                result;

            div.style.cssText = "overflow:scroll;overflow-x:hidden;zoom:1;clear:both";
            div.innerHTML = "&nbsp;";
            document.body.appendChild(div);

            result = div.offsetWidth - div.scrollWidth;

            document.body.removeChild(div);
            return result;
        };

        var table = document.createElement("table");

        // Internet Explorer does not support setting the innerHTML of TBODY and TABLE elements
        try {
            table.innerHTML = "<tr><td></td></tr>";

            support.tbodyInnerHtml = true;
        } catch (e) {
            support.tbodyInnerHtml = false;
        }

        support.touch = "ontouchstart" in window;
        support.pointers = navigator.msPointerEnabled;

        var transitions = support.transitions = false,
            transforms = support.transforms = false,
            elementProto = "HTMLElement" in window ? HTMLElement.prototype : [];

        support.hasHW3D = ("WebKitCSSMatrix" in window && "m11" in new window.WebKitCSSMatrix()) || "MozPerspective" in document.documentElement.style || "msPerspective" in document.documentElement.style;
        support.hasNativeScrolling = typeof document.documentElement.style.webkitOverflowScrolling == "string";

        each([ "Moz", "webkit", "O", "ms" ], function () {
            var prefix = this.toString(),
                hasTransitions = typeof table.style[prefix + "Transition"] === STRING;

            if (hasTransitions || typeof table.style[prefix + "Transform"] === STRING) {
                var lowPrefix = prefix.toLowerCase();

                transforms = {
                    css: "-" + lowPrefix + "-",
                    prefix: prefix,
                    event: (lowPrefix === "o" || lowPrefix === "webkit") ? lowPrefix : lowPrefix === "ms" ? "MS" : ""
                };

                if (hasTransitions) {
                    transitions = transforms;
                    transitions.event = transitions.event ? transitions.event + "TransitionEnd" : "transitionend";
                }

                return false;
            }
        });

        support.transforms = transforms;
        support.transitions = transitions;

        support.devicePixelRatio = window.devicePixelRatio === undefined ? 1 : window.devicePixelRatio;

        support.detectOS = function (ua) {
            var os = false, minorVersion, match = [],
                agentRxs = {
                    fire: /(Silk)\/(\d+)\.(\d+(\.\d+)?)/,
                    android: /(Android|Android.*(?:Opera|Firefox).*?\/)\s*(\d+)\.(\d+(\.\d+)?)/,
                    iphone: /(iPhone|iPod).*OS\s+(\d+)[\._]([\d\._]+)/,
                    ipad: /(iPad).*OS\s+(\d+)[\._]([\d_]+)/,
                    meego: /(MeeGo).+NokiaBrowser\/(\d+)\.([\d\._]+)/,
                    webos: /(webOS)\/(\d+)\.(\d+(\.\d+)?)/,
                    blackberry: /(BlackBerry).*?Version\/(\d+)\.(\d+(\.\d+)?)/,
                    playbook: /(PlayBook).*?Tablet\s*OS\s*(\d+)\.(\d+(\.\d+)?)/,
                    winphone: /(IEMobile)\/(\d+)\.(\d+(\.\d+)?)/,
                    windows: /(MSIE)\s+(\d+)\.(\d+(\.\d+)?)/
                },
                osRxs = {
                    ios: /^i(phone|pad|pod)$/i,
                    android: /^android|fire$/i,
                    blackberry: /^blackberry|playbook/i,
                    windows: /windows|winphone/
                },
                formFactorRxs = {
                    tablet: /playbook|ipad|fire/i
                },
                browserRxs = {
                    omini: /Opera\sMini/i,
                    omobile: /Opera\sMobi/i,
                    firefox: /Firefox|Fennec/i,
                    mobilesafari: /version\/.*safari/i,
                    chrome: /chrome/i,
                    webkit: /webkit/i,
                    ie: /MSIE|Windows\sPhone/i
                };

            for (var agent in agentRxs) {
                if (agentRxs.hasOwnProperty(agent)) {
                    match = ua.match(agentRxs[agent]);
                    if (match) {
                        if (agent == "windows" && "plugins" in navigator) { return false; } // Break if not Metro/Mobile Windows

                        os = {};
                        os.device = agent;
                        os.tablet = testRx(agent, formFactorRxs, false);
                        os.browser = testRx(ua, browserRxs, "default");
                        os.name = testRx(agent, osRxs);
                        os[os.name] = true;
                        os.majorVersion = match[2];
                        os.minorVersion = match[3].replace("_", ".");
                        minorVersion = os.minorVersion.replace(".", "").substr(0, 2);
                        os.flatVersion = os.majorVersion + minorVersion + (new Array(3 - (minorVersion.length < 3 ? minorVersion.length : 2)).join("0"));
                        os.appMode = window.navigator.standalone || (/file|local/).test(window.location.protocol) || typeof window.PhoneGap !== UNDEFINED || typeof window.cordova !== UNDEFINED; // Use file protocol to detect appModes.

                        if (os.android && support.devicePixelRatio < 1.5 && (window.outerWidth > 800 || window.outerHeight > 800)) {
                            os.tablet = agent;
                        }

                        break;
                    }
                }
            }
            return os;
        };

        support.mobileOS = support.detectOS(navigator.userAgent);

        function detectBrowser(ua) {
            var browser = false, match = [],
                browserRxs = {
                    webkit: /(chrome)[ \/]([\w.]+)/i,
                    safari: /(webkit)[ \/]([\w.]+)/i,
                    opera: /(opera)(?:.*version|)[ \/]([\w.]+)/i,
                    msie: /(msie) ([\w.]+)/i,
                    mozilla: /(mozilla)(?:.*? rv:([\w.]+)|)/i
                };

            for (var agent in browserRxs) {
                if (browserRxs.hasOwnProperty(agent)) {
                    match = ua.match(browserRxs[agent]);
                    if (match) {
                        browser = {};
                        browser[agent] = true;
                        browser[match[1].toLowerCase()] = true;
                        browser.version = match[2];

                        break;
                    }
                }
            }
            return browser;
        }

        support.browser = detectBrowser(navigator.userAgent);

        support.zoomLevel = function() {
            return support.touch ? (document.documentElement.clientWidth / window.innerWidth) : 1;
        };

        support.eventCapture = document.documentElement.addEventListener;

        support.placeholder = "placeholder" in document.createElement("input");
        support.stableSort = (function() {
            var sorted = [0,1,2,3,4,5,6,7,8,9,10,11,12].sort(function() { return 0; } );
            return sorted[0] === 0 && sorted[1] === 1 && sorted[2] === 2 && sorted[3] === 3 && sorted[4] === 4 &&
                sorted[5] === 5 && sorted[6] === 6 && sorted[7] === 7 && sorted[8] === 8 &&
                sorted[9] === 9 && sorted[10] === 10 && sorted[11] === 11 && sorted[12] === 12;
        })();

        support.matchesSelector = elementProto.webkitMatchesSelector || elementProto.mozMatchesSelector ||
                                  elementProto.msMatchesSelector || elementProto.oMatchesSelector || elementProto.matchesSelector ||
          function( selector ) {
              var nodeList = document.querySelectorAll ? ( this.parentNode || document ).querySelectorAll( selector ) || [] : $(selector),
                  i = nodeList.length;

              while (i--) {
                  if (nodeList[i] == this) {
                      return true;
                  }
              }

              return false;
          };
    })();


    function size(obj) {
        var result = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key) && key != "toJSON") { // Ignore fake IE7 toJSON.
                result++;
            }
        }

        return result;
    }

    function isNodeEmpty(element) {
        return $.trim($(element).contents().filter(function () { return this.nodeType != 8; }).html()) === "";
    }

    function getOffset(element, type) {
        if (!type) {
            type = "offset";
        }

        var result = element[type](),
            mobileOS = support.mobileOS;

        if (support.touch && mobileOS.ios && mobileOS.flatVersion < 410) { // Extra processing only in broken iOS'
            var offset = type == "offset" ? result : element.offset(),
                positioned = (result.left == offset.left && result.top == offset.top);

            if (positioned) {
                return {
                    top: result.top - window.scrollY,
                    left: result.left - window.scrollX
                };
            }
        }

        return result;
    }

    var directions = {
        left: { reverse: "right" },
        right: { reverse: "left" },
        down: { reverse: "up" },
        up: { reverse: "down" },
        top: { reverse: "bottom" },
        bottom: { reverse: "top" },
        "in": { reverse: "out" },
        out: { reverse: "in" }
    };

    function parseEffects(input) {
        var effects = {};

        each((typeof input === "string" ? input.split(" ") : input), function(idx) {
            effects[idx] = this;
        });

        return effects;
    }

    var fx = {
        promise: function (element, options) {
            if (options.show) {
                element.css({ display: element.data("olddisplay") || "block" }).css("display");
            }

            if (options.hide) {
                element.data("olddisplay", element.css("display")).hide();
            }

            if (options.init) {
                options.init();
            }

            if (options.completeCallback) {
                options.completeCallback(element); // call the external complete callback with the element
            }

            element.dequeue();
        },

        transitionPromise: function(element, destination, options) {
            var container = kendo.wrap(element);
            container.append(destination);

            element.hide();
            destination.show();

            if (options.completeCallback) {
                options.completeCallback(element); // call the external complete callback with the element
            }

            return element;
        }
    };

    function prepareAnimationOptions(options, duration, reverse, complete) {
        if (typeof options === STRING) {
            // options is the list of effect names separated by space e.g. animate(element, "fadeIn slideDown")

            // only callback is provided e.g. animate(element, options, function() {});
            if (isFunction(duration)) {
                complete = duration;
                duration = 400;
                reverse = false;
            }

            if (isFunction(reverse)) {
                complete = reverse;
                reverse = false;
            }

            if (typeof duration === BOOLEAN){
                reverse = duration;
                duration = 400;
            }

            options = {
                effects: options,
                duration: duration,
                reverse: reverse,
                complete: complete
            };
        }

        return extend({
            //default options
            effects: {},
            duration: 400, //jQuery default duration
            reverse: false,
            init: noop,
            teardown: noop,
            hide: false,
            show: false
        }, options, { completeCallback: options.complete, complete: noop }); // Move external complete callback, so deferred.resolve can be always executed.

    }

    function animate(element, options, duration, reverse, complete) {
        element.each(function (idx, el) { // fire separate queues on every element to separate the callback elements
            el = $(el);
            el.queue(function () {
                fx.promise(el, prepareAnimationOptions(options, duration, reverse, complete));
            });
        });

        return element;
    }

    function animateTo(element, destination, options, duration, reverse, complete) {
        return fx.transitionPromise(element, destination, prepareAnimationOptions(options, duration, reverse, complete));
    }

    function toggleClass(element, classes, options, add) {
        if (classes) {
            classes = classes.split(" ");

            each(classes, function(idx, value) {
                element.toggleClass(value, add);
            });
        }

        return element;
    }

    if (!("kendoAnimate" in $.fn)) {
        extend($.fn, {
            kendoStop: function(clearQueue, gotoEnd) {
                return this.stop(clearQueue, gotoEnd);
            },

            kendoAnimate: function(options, duration, reverse, complete) {
                return animate(this, options, duration, reverse, complete);
            },

            kendoAnimateTo: function(destination, options, duration, reverse, complete) {
                return animateTo(this, destination, options, duration, reverse, complete);
            },

            kendoAddClass: function(classes, options){
                return kendo.toggleClass(this, classes, options, true);
            },
            kendoRemoveClass: function(classes, options){
                return kendo.toggleClass(this, classes, options, false);
            },
            kendoToggleClass: function(classes, options, toggle){
                return kendo.toggleClass(this, classes, options, toggle);
            }
        });
    }

    var ampRegExp = /&/g,
        ltRegExp = /</g,
        gtRegExp = />/g;
    function htmlEncode(value) {
        return ("" + value).replace(ampRegExp, "&amp;").replace(ltRegExp, "&lt;").replace(gtRegExp, "&gt;");
    }

    var touchLocation = function(e) {
        var originalEvent = typeof e.pageX == UNDEFINED ? e.originalEvent : e;
        return {
            idx: support.pointers ? originalEvent.pointerId : 0,
            x: originalEvent.pageX,
            y: originalEvent.pageY
        };
    };

    var eventTarget = function (e) {
        return e.target;
    };

    if (support.touch) {

        var mobileChrome = (support.mobileOS.browser == "chrome" && !support.mobileOS.ios);

        touchLocation = function(e, id) {
            var changedTouches = e.changedTouches || e.originalEvent.changedTouches;

            if (id) {
                var output = null;
                each(changedTouches, function(idx, value) {
                    if (id == value.identifier) {
                        output = {
                            idx: value.identifier,
                            x: value.pageX,
                            y: value.pageY
                        };
                    }
                });
                return output;
            } else {
                return {
                    idx: changedTouches[0].identifier,
                    x: changedTouches[0].pageX,
                    y: changedTouches[0].pageY
                };
            }
        };

        eventTarget = function(e) {
            var touches = "originalEvent" in e ? e.originalEvent.changedTouches : "changedTouches" in e ? e.changedTouches : null;

            if (mobileChrome) {
                return touches ? document.elementFromPoint(touches[0].screenX, touches[0].screenY) : null;
            } else {
                return touches ? document.elementFromPoint(touches[0].clientX, touches[0].clientY) : null;
            }
        };

        each(["swipe", "swipeLeft", "swipeRight", "swipeUp", "swipeDown", "doubleTap", "tap"], function(m, value) {
            $.fn[value] = function(callback) {
                return this.bind(value, callback);
            };
        });
    }

    if (support.touch) {
        support.mousedown = "touchstart";
        support.mouseup = "touchend";
        support.mousemove = "touchmove";
        support.mousecancel = "touchcancel";
        support.resize = "orientationchange";
    } else if (support.pointers) {
        support.mousemove = "MSPointerMove";
        support.mousedown = "MSPointerDown";
        support.mouseup = "MSPointerUp";
        support.mousecancel = "MSPointerCancel";
        support.resize = "orientationchange resize";
    } else {
        support.mousemove = "mousemove";
        support.mousedown = "mousedown";
        support.mouseup = "mouseup";
        support.mousecancel = "mouseleave";
        support.resize = "resize";
    }


    var wrapExpression = function(members) {
        var result = "d",
            index,
            idx,
            length,
            member,
            count = 1;

        for (idx = 0, length = members.length; idx < length; idx++) {
            member = members[idx];
            if (member !== "") {
                index = member.indexOf("[");

                if (index !== 0) {
                    if (index == -1) {
                        member = "." + member;
                    } else {
                        count++;
                        member = "." + member.substring(0, index) + " || {})" + member.substring(index);
                    }
                }

                count++;
                result += member + ((idx < length - 1) ? " || {})" : ")");
            }
        }
        return new Array(count).join("(") + result;
    },
    localUrlRe = /^([a-z]+:)?\/\//i;

    extend(kendo, {
        ui: kendo.ui || {},
        fx: kendo.fx || fx,
        mobile: kendo.mobile || {},
        data: kendo.data || {},
        dataviz: kendo.dataviz || {ui: { roles: {}}},
        keys: {
            INSERT: 45,
            DELETE: 46,
            BACKSPACE: 8,
            TAB: 9,
            ENTER: 13,
            ESC: 27,
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40,
            END: 35,
            HOME: 36,
            SPACEBAR: 32,
            PAGEUP: 33,
            PAGEDOWN: 34,
            F2: 113,
            F10: 121,
            F12: 123
        },
        support: kendo.support || support,
        animate: kendo.animate || animate,
        ns: "",
        attr: function(value) {
            return "data-" + kendo.ns + value;
        },
        wrap: wrap,
        deepExtend: deepExtend,
        getComputedStyles: getComputedStyles,
        size: size,
        isNodeEmpty: isNodeEmpty,
        getOffset: kendo.getOffset || getOffset,
        parseEffects: kendo.parseEffects || parseEffects,
        toggleClass: kendo.toggleClass || toggleClass,
        directions: kendo.directions || directions,
        Observable: Observable,
        Class: Class,
        Template: Template,
        template: proxy(Template.compile, Template),
        render: proxy(Template.render, Template),
        stringify: proxy(JSON.stringify, JSON),
        touchLocation: touchLocation,
        eventTarget: eventTarget,
        htmlEncode: htmlEncode,
        isLocalUrl: function(url) {
            return url && !localUrlRe.test(url);
        },

        expr: function(expression, safe) {
            expression = expression || "";

            if (expression && expression.charAt(0) !== "[") {
                expression = "." + expression;
            }

            if (safe) {
                expression =  wrapExpression(expression.split("."));
            } else {
                expression = "d" + expression;
            }

            return expression;
        },

        getter: function(expression, safe) {
            return getterCache[expression] = getterCache[expression] || new Function("d", "return " + kendo.expr(expression, safe));
        },

        setter: function(expression) {
            return setterCache[expression] = setterCache[expression] || new Function("d,value", "d." + expression + "=value");
        },

        accessor: function(expression) {
            return {
                get: kendo.getter(expression),
                set: kendo.setter(expression)
            };
        },

        guid: function() {
            var id = "", i, random;

            for (i = 0; i < 32; i++) {
                random = math.random() * 16 | 0;

                if (i == 8 || i == 12 || i == 16 || i == 20) {
                    id += "-";
                }
                id += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
            }

            return id;
        },

        roleSelector: function(role) {
            return role.replace(/(\S+)/g, "[" + kendo.attr("role") + "=$1],").slice(0, -1);
        },


        logToConsole: function(message) {
            var console = window.console;

            if (typeof(console) != "undefined" && console.log) {
                console.log(message);
            }
        }
    });

    var Widget = Observable.extend( {
        init: function(element, options) {
            var that = this;

            that.element = $(element);

            Observable.fn.init.call(that);

            options = that.options = extend(true, {}, that.options, options);

            if (!that.element.attr(kendo.attr("role"))) {
                that.element.attr(kendo.attr("role"), (options.name || "").toLowerCase());
            }

            that.element.data("kendo" + options.prefix + options.name, that);

            that.bind(that.events, options);
        },

        events: [],

        options: {
            prefix: ""
        },

        setOptions: function(options) {
            var that = this,
                idx = 0,
                length = that.events.length,
                e;

            for (; idx < length; idx ++) {
                e = that.events[idx];
                if (that.options[e] && options[e]) {
                    that.unbind(e, that.options[e]);
                }
            }

            $.extend(that.options, options);
            that.bind(that.events, options);
        },

        destroy: function() {
            var that = this;

            that.element.removeData("kendo" + that.options.prefix + that.options.name);

            that.unbind();
        }
    });

    kendo.notify = noop;

    var templateRegExp = /template$/i,
        jsonRegExp = /^\s*(?:\{(?:.|\n)*\}|\[(?:.|\n)*\])\s*$/,
        jsonFormatRegExp = /^\{(\d+)(:[^\}]+)?\}/,
        dashRegExp = /([A-Z])/g;

    function parseOption(element, option) {
        var value;

        if (option.indexOf("data") === 0) {
            option = option.substring(4);
            option = option.charAt(0).toLowerCase() + option.substring(1);
        }

        option = option.replace(dashRegExp, "-$1");
        value = element.getAttribute("data-" + kendo.ns + option);

        if (value === null) {
            value = undefined;
        } else if (value === "null") {
            value = null;
        } else if (value === "true") {
            value = true;
        } else if (value === "false") {
            value = false;
        } else if (!isNaN(parseFloat(value))) {
            value = parseFloat(value);
        } else if (jsonRegExp.test(value) && !jsonFormatRegExp.test(value)) {
            value = eval("(" + value + ")");
        }

        return value;
    }

    function parseOptions(element, options) {
        var result = {},
            option,
            value;

        for (option in options) {
            value = parseOption(element, option);

            if (value !== undefined) {

                if (templateRegExp.test(option)) {
                    value = kendo.template($("#" + value).html());
                }

                result[option] = value;
            }
        }

        return result;
    }

    kendo.initWidget = function(element, options, roles) {
        var result,
            option,
            widget,
            idx,
            length,
            role,
            value,
            dataSource;

        // Preserve backwards compatibility with (element, options, namespace) signature, where namespace was kendo.ui
        if (!roles) {
            roles = kendo.ui.roles;
        } else if (roles.roles) {
            roles = roles.roles;
        }

        element = element.nodeType ? element : element[0];

        role = element.getAttribute("data-" + kendo.ns + "role");

        if (!role) {
            return;
        }

        if (role.indexOf(".") === -1) {
            widget = roles[role];
        } else { // full namespace path - like kendo.ui.Widget
            widget = kendo.getter(role)(window);
        }

        if (!widget) {
            return;
        }

        dataSource = parseOption(element, "dataSource");

        options = $.extend({}, parseOptions(element, widget.fn.options), options);

        if (dataSource) {
            if (typeof dataSource === STRING) {
                options.dataSource = kendo.getter(dataSource)(window);
            } else {
                options.dataSource = dataSource;
            }
        }

        for (idx = 0, length = widget.fn.events.length; idx < length; idx++) {
            option = widget.fn.events[idx];

            value = parseOption(element, option);

            if (value !== undefined) {
                options[option] = kendo.getter(value)(window);
            }
        }

        result = $(element).data("kendo" + widget.fn.options.prefix + widget.fn.options.name);

        if (!result) {
            result = new widget(element, options);
        } else {
            result.setOptions(options);
        }

        return result;
    };

    kendo.rolesFromNamespaces = function(namespaces) {
        var roles;

        if (!namespaces[0]) {
            namespaces = [kendo.ui, kendo.dataviz.ui];
        }

        roles = $.map(namespaces, function(namespace) { return namespace.roles; }).reverse();

        return extend.apply(null, [{}].concat(roles));
    };

    kendo.init = function(element) {
        var roles = kendo.rolesFromNamespaces(slice.call(arguments, 1));

        $(element).find("[data-" + kendo.ns + "role]").andSelf().each(function(){
            kendo.initWidget(this, {}, roles);
        });
    };

    kendo.destroy = function(element) {
        $(element).find("[data-" + kendo.ns + "role]").andSelf().each(function(){
            var element = $(this),
                widget = kendo.widgetInstance(element, kendo.ui) ||
                         kendo.widgetInstance(element, kendo.mobile.ui) ||
                         kendo.widgetInstance(element, kendo.dataviz.ui);

            if (widget) {
                widget.destroy();
            }
        });
    };

    kendo.parseOptions = parseOptions;

    extend(kendo.ui, {
        Widget: Widget,
        roles: {},
        progress: function(container, toggle) {
            var mask = container.find(".k-loading-mask");

            if (toggle) {
                if (!mask.length) {
                    mask = $("<div class='k-loading-mask'><span class='k-loading-text'>Loading...</span><div class='k-loading-image'/><div class='k-loading-color'/></div>")
                        .width("100%").height("100%")
                        .prependTo(container)
                        .css({ top: container.scrollTop(), left: container.scrollLeft() });
                }
            } else if (mask) {
                mask.remove();
            }
        },
        plugin: function(widget, register, prefix) {
            var name = widget.fn.options.name,
                getter;

            register = register || kendo.ui;
            prefix = prefix || "";

            register[name] = widget;

            register.roles[name.toLowerCase()] = widget;

            getter = "getKendo" + prefix + name;
            name = "kendo" + prefix + name;

            $.fn[name] = function(options) {
                var value = this,
                    args;

                if (typeof options === STRING) {
                    args = slice.call(arguments, 1);

                    this.each(function(){
                        var widget = $.data(this, name),
                            method,
                            result;

                        if (!widget) {
                            throw new Error(kendo.format("Cannot call method '{0}' of {1} before it is initialized", options, name));
                        }

                        method = widget[options];

                        if (typeof method !== FUNCTION) {
                            throw new Error(kendo.format("Cannot find method '{0}' of {1}", options, name));
                        }

                        result = method.apply(widget, args);

                        if (result !== undefined) {
                            value = result;
                            return false;
                        }
                    });
                } else {
                    this.each(function() {
                        new widget(this, options);
                    });
                }

                return value;
            };

            $.fn[getter] = function() {
                return this.data(name);
            };
        }
    });

    var MobileWidget = Widget.extend({
        init: function(element, options) {
            Widget.fn.init.call(this, element, options);
            this.wrapper = this.element;
        },

        options: {
            prefix: "Mobile"
        },

        events: [],

        viewShow: $.noop,

        view: function() {
            var viewElement = this.element.closest(kendo.roleSelector("view") + "," + kendo.roleSelector("splitview"));
            return viewElement.data("kendoMobileView") || viewElement.data("kendoMobileSplitView");
        }
    });

    extend(kendo.mobile, {
        init: function(element) {
            kendo.init(element, kendo.mobile.ui, kendo.ui, kendo.dataviz.ui);
        },

        ui: {
            Widget: MobileWidget,
            roles: {},
            plugin: function(widget) {
                kendo.ui.plugin(widget, kendo.mobile.ui, "Mobile");
            }
        }
    });

    kendo.touchScroller = function(elements, options) {
        // return the first touch scroller
        return $(elements).map(function(idx, element) {
            element = $(element);
            if (support.touch && kendo.mobile.ui.Scroller && !element.data("kendoMobileScroller")) {
                element.kendoMobileScroller(options);
                return element.data("kendoMobileScroller");
            } else {
                return false;
            }
        })[0];
    };

    kendo.preventDefault = function(e) {
        e.preventDefault();
    };

    kendo.widgetInstance = function(element, suite) {
        var widget = suite.roles[element.data(kendo.ns + "role")];

        if (widget) {
            return element.data("kendo" + widget.fn.options.prefix + widget.fn.options.name);
        }
    };

    kendo.onResize = function(callback) {
        var handler = callback;
        if (support.mobileOS.android) {
            handler = function() { setTimeout(callback, 200); };
        }

        $(window).on(support.resize, handler);
    };

    kendo.attrValue = function(element, key) {
        return element.data(kendo.ns + key);
    };
})(jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        extend = $.extend,
        odataFilters = {
            eq: "eq",
            neq: "ne",
            gt: "gt",
            gte: "ge",
            lt: "lt",
            lte: "le",
            contains : "substringof",
            endswith: "endswith",
            startswith: "startswith"
        },
        mappers = {
            pageSize: $.noop,
            page: $.noop,
            filter: function(params, filter) {
                if (filter) {
                    params.$filter = toOdataFilter(filter);
                }
            },
            sort: function(params, orderby) {
                var expr = $.map(orderby, function(value) {
                    var order = value.field.replace(/\./g, "/");

                    if (value.dir === "desc") {
                        order += " desc";
                    }

                    return order;
                }).join(",");

                if (expr) {
                    params.$orderby = expr;
                }
            },
            skip: function(params, skip) {
                if (skip) {
                    params.$skip = skip;
                }
            },
            take: function(params, take) {
                if (take) {
                    params.$top = take;
                }
            }
        },
        defaultDataType = {
            read: {
                dataType: "jsonp"
            }
        };

    function toOdataFilter(filter) {
        var result = [],
            logic = filter.logic || "and",
            idx,
            length,
            field,
            type,
            format,
            operator,
            value,
            ignoreCase,
            filters = filter.filters;

        for (idx = 0, length = filters.length; idx < length; idx++) {
            filter = filters[idx];
            field = filter.field;
            value = filter.value;
            operator = filter.operator;

            if (filter.filters) {
                filter = toOdataFilter(filter);
            } else {
                ignoreCase = filter.ignoreCase;
                field = field.replace(/\./g, "/");
                filter = odataFilters[operator];

                if (filter && value !== undefined) {
                    type = $.type(value);
                    if (type === "string") {
                        format = "'{1}'";
                        value = value.replace(/'/g, "''");

                        if (ignoreCase === true) {
                            field = "tolower(" + field + ")";
                        }

                    } else if (type === "date") {
                        format = "datetime'{1:yyyy-MM-ddTHH:mm:ss}'";
                    } else {
                        format = "{1}";
                    }

                    if (filter.length > 3) {
                        if (filter !== "substringof") {
                            format = "{0}({2}," + format + ")";
                        } else {
                            format = "{0}(" + format + ",{2})";
                        }
                    } else {
                        format = "{2} {0} " + format;
                    }

                    filter = kendo.format(format, filter, value, field);
                }
            }

            result.push(filter);
        }

        filter = result.join(" " + logic + " ");

        if (result.length > 1) {
            filter = "(" + filter + ")";
        }

        return filter;
    }

    extend(true, kendo.data, {
        schemas: {
            odata: {
                type: "json",
                data: function(data) {
                    return data.d.results || [data.d];
                },
                total: "d.__count"
            }
        },
        transports: {
            odata: {
                read: {
                    cache: true, // to prevent jQuery from adding cache buster
                    dataType: "jsonp",
                    jsonp: "$callback"
                },
                update: {
                    cache: true,
                    dataType: "json",
                    contentType: "application/json", // to inform the server the the request body is JSON encoded
                    type: "PUT" // can be PUT or MERGE
                },
                create: {
                    cache: true,
                    dataType: "json",
                    contentType: "application/json",
                    type: "POST" // must be POST to create new entity
                },
                destroy: {
                    cache: true,
                    dataType: "json",
                    type: "DELETE"
                },
                parameterMap: function(options, type) {
                    var params,
                        value,
                        option,
                        dataType;

                    options = options || {};
                    type = type || "read";
                    dataType = (this.options || defaultDataType)[type];
                    dataType = dataType ? dataType.dataType : "json";

                    if (type === "read") {
                        params = {
                            $inlinecount: "allpages"
                        };

                        if (dataType != "json") {
                            params.$format = "json";
                        }

                        for (option in options) {
                            if (mappers[option]) {
                                mappers[option](params, options[option]);
                            } else {
                                params[option] = options[option];
                            }
                        }
                    } else {
                        if (dataType !== "json") {
                            throw new Error("Only json dataType can be used for " + type + " operation.");
                        }

                        if (type !== "destroy") {
                            for (option in options) {
                                value = options[option];
                                if (typeof value === "number") {
                                    options[option] = value + "";
                                }
                            }

                            params = kendo.stringify(options);
                        }
                    }

                    return params;
                }
            }
        }
    });
})(jQuery);
(function($, undefined) {
    var kendo = window.kendo,
        isArray = $.isArray,
        isPlainObject = $.isPlainObject,
        map = $.map,
        each = $.each,
        extend = $.extend,
        getter = kendo.getter,
        Class = kendo.Class;

    var XmlDataReader = Class.extend({
        init: function(options) {
            var that = this,
                total = options.total,
                model = options.model,
                data = options.data;

            if (model) {
                if (isPlainObject(model)) {
                    if (model.fields) {
                        each(model.fields, function(field, value) {
                            if (isPlainObject(value) && value.field) {
                                value = extend(value, { field: that.getter(value.field) });
                            } else {
                                value = { field: that.getter(value) };
                            }
                            model.fields[field] = value;
                        });
                    }
                    var id = model.id;
                    if (id) {
                        var idField = {};

                        idField[that.xpathToMember(id, true)] = { field : that.getter(id) };
                        model.fields = extend(idField, model.fields);
                        model.id = that.xpathToMember(id);
                    }
                    model = kendo.data.Model.define(model);
                }

                that.model = model;
            }

            if (total) {
                total = that.getter(total);
                that.total = function(data) {
                    return parseInt(total(data), 10);
                };
            }

            if (data) {
                data = that.xpathToMember(data);
                that.data = function(value) {
                    var result = that.evaluate(value, data),
                        modelInstance;

                    result = isArray(result) ? result : [result];

                    if (that.model && model.fields) {
                        modelInstance = new that.model();

                        return map(result, function(value) {
                            if (value) {
                                var record = {}, field;

                                for (field in model.fields) {
                                    record[field] = modelInstance._parse(field, model.fields[field].field(value));
                                }

                                return record;
                            }
                        });
                    }

                    return result;
                };
            }
        },
        total: function(result) {
            return this.data(result).length;
        },
        errors: function(data) {
            return data ? data.errors : null;
        },
        parseDOM: function(element) {
            var result = {},
                parsedNode,
                node,
                nodeType,
                nodeName,
                member,
                attribute,
                attributes = element.attributes,
                attributeCount = attributes.length,
                idx;

            for (idx = 0; idx < attributeCount; idx++) {
                attribute = attributes[idx];
                result["@" + attribute.nodeName] = attribute.nodeValue;
            }

            for (node = element.firstChild; node; node = node.nextSibling) {
                nodeType = node.nodeType;

                if (nodeType === 3 || nodeType === 4) {
                    // text nodes or CDATA are stored as #text field
                    result["#text"] = node.nodeValue;
                } else if (nodeType === 1) {
                    // elements are stored as fields
                    parsedNode = this.parseDOM(node);

                    nodeName = node.nodeName;

                    member = result[nodeName];

                    if (isArray(member)) {
                        // elements of same nodeName are stored as array
                        member.push(parsedNode);
                    } else if (member !== undefined) {
                        member = [member, parsedNode];
                    } else {
                        member = parsedNode;
                    }

                    result[nodeName] = member;
                }
            }
            return result;
        },

        evaluate: function(value, expression) {
            var members = expression.split("."),
                member,
                result,
                length,
                intermediateResult,
                idx;

            while (member = members.shift()) {
                value = value[member];

                if (isArray(value)) {
                    result = [];
                    expression = members.join(".");

                    for (idx = 0, length = value.length; idx < length; idx++) {
                        intermediateResult = this.evaluate(value[idx], expression);

                        intermediateResult = isArray(intermediateResult) ? intermediateResult : [intermediateResult];

                        result.push.apply(result, intermediateResult);
                    }

                    return result;
                }
            }

            return value;
        },

        parse: function(xml) {
            var documentElement,
                tree,
                result = {};

            documentElement = xml.documentElement || $.parseXML(xml).documentElement;

            tree = this.parseDOM(documentElement);

            result[documentElement.nodeName] = tree;

            return result;
        },

        xpathToMember: function(member, raw) {
            if (!member) {
                return "";
            }

            member = member.replace(/^\//, "") // remove the first "/"
                           .replace(/\//g, "."); // replace all "/" with "."

            if (member.indexOf("@") >= 0) {
                // replace @attribute with '["@attribute"]'
                return member.replace(/\.?(@.*)/, raw? '$1':'["$1"]');
            }

            if (member.indexOf("text()") >= 0) {
                // replace ".text()" with '["#text"]'
                return member.replace(/(\.?text\(\))/, raw? '#text':'["#text"]');
            }

            return member;
        },
        getter: function(member) {
            return getter(this.xpathToMember(member), true);
        }
    });

    $.extend(true, kendo.data, {
        XmlDataReader: XmlDataReader,
        readers: {
            xml: XmlDataReader
        }
    });
})(jQuery);
(function($, undefined) {
    var extend = $.extend,
        proxy = $.proxy,
        isFunction = $.isFunction,
        isPlainObject = $.isPlainObject,
        isEmptyObject = $.isEmptyObject,
        isArray = $.isArray,
        grep = $.grep,
        ajax = $.ajax,
        map,
        each = $.each,
        noop = $.noop,
        kendo = window.kendo,
        Observable = kendo.Observable,
        Class = kendo.Class,
        STRING = "string",
        FUNCTION = "function",
        CREATE = "create",
        READ = "read",
        UPDATE = "update",
        DESTROY = "destroy",
        CHANGE = "change",
        SYNC = "sync",
        GET = "get",
        ERROR = "error",
        REQUESTSTART = "requestStart",
        REQUESTEND = "requestEnd",
        crud = [CREATE, READ, UPDATE, DESTROY],
        identity = function(o) { return o; },
        getter = kendo.getter,
        stringify = kendo.stringify,
        math = Math,
        push = [].push,
        join = [].join,
        pop = [].pop,
        splice = [].splice,
        shift = [].shift,
        slice = [].slice,
        unshift = [].unshift,
        toString = {}.toString,
        stableSort = kendo.support.stableSort,
        dateRegExp = /^\/Date\((.*?)\)\/$/,
        quoteRegExp = /(?=['\\])/g;

    var ObservableArray = Observable.extend({
        init: function(array, type) {
            var that = this;

            that.type = type || ObservableObject;

            Observable.fn.init.call(that);

            that.length = array.length;

            that.wrapAll(array, that);
        },

        toJSON: function() {
            var idx, length = this.length, value, json = new Array(length);

            for (idx = 0; idx < length; idx++){
                value = this[idx];

                if (value instanceof ObservableObject) {
                    value = value.toJSON();
                }

                json[idx] = value;
            }

            return json;
        },

        parent: noop,

        wrapAll: function(source, target) {
            var that = this,
                idx,
                length,
                parent = function() {
                    return that;
                };

            target = target || [];

            for (idx = 0, length = source.length; idx < length; idx++) {
                target[idx] = that.wrap(source[idx], parent);
            }

            return target;
        },

        wrap: function(object, parent) {
            var that = this,
                observable;

            if (object !== null && toString.call(object) === "[object Object]") {
                observable = object instanceof that.type || object instanceof Model;

                if (!observable) {
                    object = object instanceof ObservableObject ? object.toJSON() : object;
                    object = new that.type(object);
                }

                object.parent = parent;

                object.bind(CHANGE, function(e) {
                    that.trigger(CHANGE, {
                        field: e.field,
                        node: e.node,
                        index: e.index,
                        items: e.items || [this],
                        action: e.node  ? (e.action || "itemchange") : "itemchange"
                    });
                });
            }

            return object;
        },

        push: function() {
            var index = this.length,
                items = this.wrapAll(arguments),
                result;

            result = push.apply(this, items);

            this.trigger(CHANGE, {
                action: "add",
                index: index,
                items: items
            });

            return result;
        },

        slice: slice,

        join: join,

        pop: function() {
            var length = this.length, result = pop.apply(this);

            if (length) {
                this.trigger(CHANGE, {
                    action: "remove",
                    index: length - 1,
                    items:[result]
                });
            }

            return result;
        },

        splice: function(index, howMany, item) {
            var items = this.wrapAll(slice.call(arguments, 2)),
                result, i, len;

            result = splice.apply(this, [index, howMany].concat(items));

            if (result.length) {
                this.trigger(CHANGE, {
                    action: "remove",
                    index: index,
                    items: result
                });

                for (i = 0, len = result.length; i < len; i++) {
                    if (result[i].children) {
                        result[i].unbind(CHANGE);
                    }
                }
            }

            if (item) {
                this.trigger(CHANGE, {
                    action: "add",
                    index: index,
                    items: items
                });
            }
            return result;
        },

        shift: function() {
            var length = this.length, result = shift.apply(this);

            if (length) {
                this.trigger(CHANGE, {
                    action: "remove",
                    index: 0,
                    items:[result]
                });
            }

            return result;
        },

        unshift: function() {
            var items = this.wrapAll(arguments),
                result;

            result = unshift.apply(this, items);

            this.trigger(CHANGE, {
                action: "add",
                index: 0,
                items: items
            });

            return result;
        },

        indexOf: function(item) {
            var that = this,
                idx,
                length;

            for (idx = 0, length = that.length; idx < length; idx++) {
                if (that[idx] === item) {
                    return idx;
                }
            }
            return -1;
        }
    });

    var ObservableObject = Observable.extend({
        init: function(value) {
            var that = this,
                member,
                field,
                parent = function() {
                    return that;
                },
                type;

            Observable.fn.init.call(this);

            for (field in value) {
                member = value[field];
                if (field.charAt(0) != "_") {
                    type = toString.call(member);

                    member = that.wrap(member, field, parent);
                }
                that[field] = member;
            }

            that.uid = kendo.guid();
        },

        shouldSerialize: function(field) {
            return this.hasOwnProperty(field) && field !== "_events" && typeof this[field] !== FUNCTION && field !== "uid";
        },

        toJSON: function() {
            var result = {}, value, field;

            for (field in this) {
                if (this.shouldSerialize(field)) {
                    value = this[field];

                    if (value instanceof ObservableObject || value instanceof ObservableArray) {
                        value = value.toJSON();
                    }

                    result[field] = value;
                }
            }

            return result;
        },

        get: function(field) {
            var that = this, result;

            that.trigger(GET, { field: field });

            if (field === "this") {
                result = that;
            } else {
                result = kendo.getter(field, true)(that);
            }

            return result;
        },

        _set: function(field, value) {
            var that = this;
            if (field.indexOf(".")) {
                var paths = field.split("."),
                    path = "";

                while (paths.length > 1) {
                    path += paths.shift();
                    var obj = kendo.getter(path, true)(that);
                    if (obj instanceof ObservableObject) {
                        obj.set(paths.join("."), value);
                        return;
                    }
                    path += ".";
                }
            }

            kendo.setter(field)(that, value);
        },

        set: function(field, value) {
            var that = this,
                current = that[field],
                parent = function() { return that; };

            if (current !== value) {
                if (!that.trigger("set", { field: field, value: value })) {

                    that._set(field, that.wrap(value, field, parent));

                    that.trigger(CHANGE, { field: field });
                }
            }
        },

        parent: noop,

        wrap: function(object, field, parent) {
            var that = this,
                type = toString.call(object),
                isObservableArray = object instanceof ObservableArray;

            if (object !== null && object !== undefined && type === "[object Object]" && !(object instanceof DataSource) && !isObservableArray) {
                if (!(object instanceof ObservableObject)) {
                    object = new ObservableObject(object);
                }

                object.parent = parent;

                (function(field) {
                    object.bind(GET, function(e) {
                        e.field = field + "." + e.field;
                        that.trigger(GET, e);
                    });

                    object.bind(CHANGE, function(e) {
                        e.field = field + "." + e.field;
                        that.trigger(CHANGE, e);
                    });
                })(field);
            } else if (object !== null && (type === "[object Array]" || isObservableArray)) {
                if (!isObservableArray) {
                    object = new ObservableArray(object);
                }
                object.parent = parent;

                (function(field) {
                    object.bind(CHANGE, function(e) {
                        that.trigger(CHANGE, { field: field, index: e.index, items: e.items, action: e.action});
                    });
                })(field);
            } else if (object !== null && object instanceof DataSource) {
                object._parent = parent; // assign parent to the DataSource if part of observable object
            }


            return object;
        }
    });

    function equal(x, y) {
        if (x === y) {
            return true;
        }

        var xtype = $.type(x), ytype = $.type(y), field;

        if (xtype !== ytype) {
            return false;
        }

        if (xtype === "date") {
            return x.getTime() === y.getTime();
        }

        if (xtype !== "object" && xtype !== "array") {
            return false;
        }

        for (field in x) {
            if (!equal(x[field], y[field])) {
                return false;
            }
        }

        return true;
    }

    var parsers = {
        "number": function(value) {
            return kendo.parseFloat(value);
        },

        "date": function(value) {
            return kendo.parseDate(value);
        },

        "boolean": function(value) {
            if (typeof value === STRING) {
                return value.toLowerCase() === "true";
            }
            return !!value;
        },

        "string": function(value) {
            return value != null ? (value + "") : value;
        },

        "default": function(value) {
            return value;
        }
    };

    var defaultValues = {
        "string": "",
        "number": 0,
        "date": new Date(),
        "boolean": false,
        "default": ""
    };

    var Model = ObservableObject.extend({
        init: function(data) {
            var that = this;

            if (!data || $.isEmptyObject(data)) {
                data = $.extend({}, that.defaults, data);
            }

            ObservableObject.fn.init.call(that, data);

            that.dirty = false;

            if (that.idField) {
                that.id = that.get(that.idField);

                if (that.id === undefined) {
                    that.id = that._defaultId;
                }
            }
        },

        shouldSerialize: function(field) {
            return ObservableObject.fn.shouldSerialize.call(this, field) && field !== "uid" && !(this.idField !== "id" && field === "id") && field !== "dirty" && field !== "_accessors";
        },

        _parse: function(field, value) {
            var that = this,
            parse;

            field = (that.fields || {})[field];
            if (field) {
                parse = field.parse;
                if (!parse && field.type) {
                    parse = parsers[field.type.toLowerCase()];
                }
            }

            return parse ? parse(value) : value;
        },

        editable: function(field) {
            field = (this.fields || {})[field];
            return field ? field.editable !== false : true;
        },

        set: function(field, value, initiator) {
            var that = this;

            if (that.editable(field)) {
                value = that._parse(field, value);

                if (!equal(value, that.get(field))) {
                    that.dirty = true;
                    ObservableObject.fn.set.call(that, field, value, initiator);
                }
            }
        },

        accept: function(data) {
            var that = this,
                parent = function() { return that; },
                field;

            for (field in data) {
                that._set(field, that.wrap(data[field], field, parent));
            }

            if (that.idField) {
                that.id = that.get(that.idField);
            }

            that.dirty = false;
        },

        isNew: function() {
            return this.id === this._defaultId;
        }
    });

    Model.define = function(base, options) {
        if (options === undefined) {
            options = base;
            base = Model;
        }

        var model,
            proto = extend({ defaults: {} }, options),
            name,
            field,
            type,
            value,
            id = proto.id;

        if (id) {
            proto.idField = id;
        }

        if (proto.id) {
            delete proto.id;
        }

        if (id) {
            proto.defaults[id] = proto._defaultId = "";
        }

        for (name in proto.fields) {
            field = proto.fields[name];
            type = field.type || "default";
            value = null;

            name = typeof (field.field) === STRING ? field.field : name;

            if (!field.nullable) {
                value = proto.defaults[name] = field.defaultValue !== undefined ? field.defaultValue : defaultValues[type.toLowerCase()];
            }

            if (options.id === name) {
                proto._defaultId = value;
            }

            proto.defaults[name] = value;

            field.parse = field.parse || parsers[type];
        }

        model = base.extend(proto);
        model.define = function(options) {
            return Model.define(model, options);
        };

        if (proto.fields) {
            model.fields = proto.fields;
            model.idField = proto.idField;
        }

        return model;
    };

    var Comparer = {
        selector: function(field) {
            return isFunction(field) ? field : getter(field);
        },

        asc: function(field) {
            var selector = this.selector(field);
            return function (a, b) {
                a = selector(a);
                b = selector(b);

                return a > b ? 1 : (a < b ? -1 : 0);
            };
        },

        desc: function(field) {
            var selector = this.selector(field);
            return function (a, b) {
                a = selector(a);
                b = selector(b);

                return a < b ? 1 : (a > b ? -1 : 0);
            };
        },

        create: function(descriptor) {
            return this[descriptor.dir.toLowerCase()](descriptor.field);
        },

        combine: function(comparers) {
            return function(a, b) {
                var result = comparers[0](a, b),
                    idx,
                    length;

                for (idx = 1, length = comparers.length; idx < length; idx ++) {
                    result = result || comparers[idx](a, b);
                }

                return result;
            };
        }
    };

    var PositionComparer = extend({}, Comparer, {
        asc: function(field) {
            var selector = this.selector(field);
            return function (a, b) {
                var valueA = selector(a);
                var valueB = selector(b);

                if (valueA && valueA.getTime && valueB && valueB.getTime) {
                    valueA = valueA.getTime();
                    valueB = valueB.getTime();
                }

                if (valueA === valueB) {
                    return a.__position - b.__position;
                }
                return valueA > valueB ? 1 : (valueA < valueB ? -1 : 0);
            };
        },

        desc: function(field) {
            var selector = this.selector(field);
            return function (a, b) {
                var valueA = selector(a);
                var valueB = selector(b);

                if (valueA === valueB) {
                    return a.__position - b.__position;
                }

                return valueA < valueB ? 1 : (valueA > valueB ? -1 : 0);
            };
        }
    });

    map = function (array, callback) {
        var idx, length = array.length, result = new Array(length);

        for (idx = 0; idx < length; idx++) {
            result[idx] = callback(array[idx], idx, array);
        }

        return result;
    };

    var operators = (function(){

        function quote(value) {
            return value.replace(quoteRegExp, "\\");
        }

        function operator(op, a, b, ignore) {
            var date;

            if (b != null) {
                if (typeof b === STRING) {
                    b = quote(b);
                    date = dateRegExp.exec(b);
                    if (date) {
                        b = new Date(+date[1]);
                    } else if (ignore) {
                        b = "'" + b.toLowerCase() + "'";
                        a = "(" + a + " || '').toLowerCase()";
                    } else {
                        b = "'" + b + "'";
                    }
                }

                if (b.getTime) {
                    //b looks like a Date
                    a = "(" + a + "?" + a + ".getTime():" + a + ")";
                    b = b.getTime();
                }
            }

            return a + " " + op + " " + b;
        }

        return {
            eq: function(a, b, ignore) {
                return operator("==", a, b, ignore);
            },
            neq: function(a, b, ignore) {
                return operator("!=", a, b, ignore);
            },
            gt: function(a, b, ignore) {
                return operator(">", a, b, ignore);
            },
            gte: function(a, b, ignore) {
                return operator(">=", a, b, ignore);
            },
            lt: function(a, b, ignore) {
                return operator("<", a, b, ignore);
            },
            lte: function(a, b, ignore) {
                return operator("<=", a, b, ignore);
            },
            startswith: function(a, b, ignore) {
                if (ignore) {
                    a = a + ".toLowerCase()";
                    if (b) {
                        b = b.toLowerCase();
                    }
                }

                if (b) {
                    b = quote(b);
                }

                return a + ".lastIndexOf('" + b + "', 0) == 0";
            },
            endswith: function(a, b, ignore) {
                if (ignore) {
                    a = a + ".toLowerCase()";
                    if (b) {
                        b = b.toLowerCase();
                    }
                }

                if (b) {
                    b = quote(b);
                }

                return a + ".lastIndexOf('" + b + "') == " + a + ".length - " + (b || "").length;
            },
            contains: function(a, b, ignore) {
                if (ignore) {
                    a = "(" + a + " || '').toLowerCase()";
                    if (b) {
                        b = b.toLowerCase();
                    }
                }

                if (b) {
                    b = quote(b);
                }

                return a + ".indexOf('" + b + "') >= 0";
            },
            doesnotcontain: function(a, b, ignore) {
                if (ignore) {
                    a = "(" + a + " || '').toLowerCase()";
                    if (b) {
                        b = b.toLowerCase();
                    }
                }

                if (b) {
                    b = quote(b);
                }

                return a + ".indexOf('" + b + "') == -1";
            }
        };
    })();

    function Query(data) {
        this.data = data || [];
    }

    Query.filterExpr = function(expression) {
        var expressions = [],
            logic = { and: " && ", or: " || " },
            idx,
            length,
            filter,
            expr,
            fieldFunctions = [],
            operatorFunctions = [],
            field,
            operator,
            filters = expression.filters;

        for (idx = 0, length = filters.length; idx < length; idx++) {
            filter = filters[idx];
            field = filter.field;
            operator = filter.operator;

            if (filter.filters) {
                expr = Query.filterExpr(filter);
                //Nested function fields or operators - update their index e.g. __o[0] -> __o[1]
                filter = expr.expression
                .replace(/__o\[(\d+)\]/g, function(match, index) {
                    index = +index;
                    return "__o[" + (operatorFunctions.length + index) + "]";
                })
                .replace(/__f\[(\d+)\]/g, function(match, index) {
                    index = +index;
                    return "__f[" + (fieldFunctions.length + index) + "]";
                });

                operatorFunctions.push.apply(operatorFunctions, expr.operators);
                fieldFunctions.push.apply(fieldFunctions, expr.fields);
            } else {
                if (typeof field === FUNCTION) {
                    expr = "__f[" + fieldFunctions.length +"](d)";
                    fieldFunctions.push(field);
                } else {
                    expr = kendo.expr(field);
                }

                if (typeof operator === FUNCTION) {
                    filter = "__o[" + operatorFunctions.length + "](" + expr + ", " + filter.value + ")";
                    operatorFunctions.push(operator);
                } else {
                    filter = operators[(operator || "eq").toLowerCase()](expr, filter.value, filter.ignoreCase !== undefined? filter.ignoreCase : true);
                }
            }

            expressions.push(filter);
        }

        return  { expression: "(" + expressions.join(logic[expression.logic]) + ")", fields: fieldFunctions, operators: operatorFunctions };
    };

    function normalizeSort(field, dir) {
        if (field) {
            var descriptor = typeof field === STRING ? { field: field, dir: dir } : field,
            descriptors = isArray(descriptor) ? descriptor : (descriptor !== undefined ? [descriptor] : []);

            return grep(descriptors, function(d) { return !!d.dir; });
        }
    }

    var operatorMap = {
        "==": "eq",
        equals: "eq",
        isequalto: "eq",
        equalto: "eq",
        equal: "eq",
        "!=": "neq",
        ne: "neq",
        notequals: "neq",
        isnotequalto: "neq",
        notequalto: "neq",
        notequal: "neq",
        "<": "lt",
        islessthan: "lt",
        lessthan: "lt",
        less: "lt",
        "<=": "lte",
        le: "lte",
        islessthanorequalto: "lte",
        lessthanequal: "lte",
        ">": "gt",
        isgreaterthan: "gt",
        greaterthan: "gt",
        greater: "gt",
        ">=": "gte",
        isgreaterthanorequalto: "gte",
        greaterthanequal: "gte",
        ge: "gte",
        notsubstringof: "doesnotcontain"
    };

    function normalizeOperator(expression) {
        var idx,
        length,
        filter,
        operator,
        filters = expression.filters;

        if (filters) {
            for (idx = 0, length = filters.length; idx < length; idx++) {
                filter = filters[idx];
                operator = filter.operator;

                if (operator && typeof operator === STRING) {
                    filter.operator = operatorMap[operator.toLowerCase()] || operator;
                }

                normalizeOperator(filter);
            }
        }
    }

    function normalizeFilter(expression) {
        if (expression && !isEmptyObject(expression)) {
            if (isArray(expression) || !expression.filters) {
                expression = {
                    logic: "and",
                    filters: isArray(expression) ? expression : [expression]
                };
            }

            normalizeOperator(expression);

            return expression;
        }
    }

    Query.normalizeFilter = normalizeFilter;

    function normalizeAggregate(expressions) {
        return isArray(expressions) ? expressions : [expressions];
    }

    function normalizeGroup(field, dir) {
        var descriptor = typeof field === STRING ? { field: field, dir: dir } : field,
        descriptors = isArray(descriptor) ? descriptor : (descriptor !== undefined ? [descriptor] : []);

        return map(descriptors, function(d) { return { field: d.field, dir: d.dir || "asc", aggregates: d.aggregates }; });
    }

    Query.prototype = {
        toArray: function () {
            return this.data;
        },
        range: function(index, count) {
            return new Query(this.data.slice(index, index + count));
        },
        skip: function (count) {
            return new Query(this.data.slice(count));
        },
        take: function (count) {
            return new Query(this.data.slice(0, count));
        },
        select: function (selector) {
            return new Query(map(this.data, selector));
        },
        orderBy: function (selector) {
            var result = this.data.slice(0),
            comparer = isFunction(selector) || !selector ? Comparer.asc(selector) : selector.compare;

            return new Query(result.sort(comparer));
        },
        orderByDescending: function (selector) {
            return new Query(this.data.slice(0).sort(Comparer.desc(selector)));
        },
        sort: function(field, dir, comparer) {
            var idx,
            length,
            descriptors = normalizeSort(field, dir),
            comparers = [];

            comparer = comparer || Comparer;

            if (descriptors.length) {
                for (idx = 0, length = descriptors.length; idx < length; idx++) {
                    comparers.push(comparer.create(descriptors[idx]));
                }

                return this.orderBy({ compare: comparer.combine(comparers) });
            }

            return this;
        },

        filter: function(expressions) {
            var idx,
            current,
            length,
            compiled,
            predicate,
            data = this.data,
            fields,
            operators,
            result = [],
            filter;

            expressions = normalizeFilter(expressions);

            if (!expressions || expressions.filters.length === 0) {
                return this;
            }

            compiled = Query.filterExpr(expressions);
            fields = compiled.fields;
            operators = compiled.operators;

            predicate = filter = new Function("d, __f, __o", "return " + compiled.expression);

            if (fields.length || operators.length) {
                filter = function(d) {
                    return predicate(d, fields, operators);
                };
            }

            for (idx = 0, length = data.length; idx < length; idx++) {
                current = data[idx];

                if (filter(current)) {
                    result.push(current);
                }
            }
            return new Query(result);
        },

        group: function(descriptors, allData) {
            descriptors =  normalizeGroup(descriptors || []);
            allData = allData || this.data;

            var that = this,
            result = new Query(that.data),
            descriptor;

            if (descriptors.length > 0) {
                descriptor = descriptors[0];
                result = result.groupBy(descriptor).select(function(group) {
                    var data = new Query(allData).filter([ { field: group.field, operator: "eq", value: group.value } ]);
                    return {
                        field: group.field,
                        value: group.value,
                        items: descriptors.length > 1 ? new Query(group.items).group(descriptors.slice(1), data.toArray()).toArray() : group.items,
                        hasSubgroups: descriptors.length > 1,
                        aggregates: data.aggregate(descriptor.aggregates)
                    };
                });
            }
            return result;
        },

        groupBy: function(descriptor) {
            if (isEmptyObject(descriptor) || !this.data.length) {
                return new Query([]);
            }

            var field = descriptor.field,
                sorted = this._sortForGrouping(field, descriptor.dir || "asc"),
                accessor = kendo.accessor(field),
                item,
                groupValue = accessor.get(sorted[0], field),
                group = {
                    field: field,
                    value: groupValue,
                    items: []
                },
                currentValue,
                idx,
                len,
                result = [group];

            for(idx = 0, len = sorted.length; idx < len; idx++) {
                item = sorted[idx];
                currentValue = accessor.get(item, field);
                if(!groupValueComparer(groupValue, currentValue)) {
                    groupValue = currentValue;
                    group = {
                        field: field,
                        value: groupValue,
                        items: []
                    };
                    result.push(group);
                }
                group.items.push(item);
            }
            return new Query(result);
        },

        _sortForGrouping: function(field, dir) {
            var idx, length,
                data = this.data;

            if (!stableSort) {
                for (idx = 0, length = data.length; idx < length; idx++) {
                    data[idx].__position = idx;
                }

                data = new Query(data).sort(field, dir, PositionComparer).toArray();

                for (idx = 0, length = data.length; idx < length; idx++) {
                    delete data[idx].__position;
                }
                return data;
            }
            return this.sort(field, dir).toArray();
        },

        aggregate: function (aggregates) {
            var idx,
            len,
            result = {};

            if (aggregates && aggregates.length) {
                for(idx = 0, len = this.data.length; idx < len; idx++) {
                    calculateAggregate(result, aggregates, this.data[idx], idx, len);
                }
            }
            return result;
        }
    };

    function groupValueComparer(a, b) {
        if (a && a.getTime && b && b.getTime) {
            return a.getTime() === b.getTime();
        }
        return a === b;
    }

    function calculateAggregate(accumulator, aggregates, item, index, length) {
        aggregates = aggregates || [];
        var idx,
        aggr,
        functionName,
        len = aggregates.length;

        for (idx = 0; idx < len; idx++) {
            aggr = aggregates[idx];
            functionName = aggr.aggregate;
            var field = aggr.field;
            accumulator[field] = accumulator[field] || {};
            accumulator[field][functionName] = functions[functionName.toLowerCase()](accumulator[field][functionName], item, kendo.accessor(field), index, length);
        }
    }

    var functions = {
        sum: function(accumulator, item, accessor) {
            return (accumulator || 0) + accessor.get(item);
        },
        count: function(accumulator, item, accessor) {
            return (accumulator || 0) + 1;
        },
        average: function(accumulator, item, accessor, index, length) {
            accumulator = (accumulator || 0) + accessor.get(item);
            if(index == length - 1) {
                accumulator = accumulator / length;
            }
            return accumulator;
        },
        max: function(accumulator, item, accessor) {
            var value = accessor.get(item);

            accumulator = accumulator || 0;

            if(accumulator < value) {
                accumulator = value;
            }
            return accumulator;
        },
        min: function(accumulator, item, accessor) {
            var value = accessor.get(item);

            accumulator = (accumulator || value);

            if(accumulator > value) {
                accumulator = value;
            }
            return accumulator;
        }
    };

    function toJSON(array) {
        var idx, length = array.length, result = new Array(length);

        for (idx = 0; idx < length; idx++) {
            result[idx] = array[idx].toJSON();
        }

        return result;
    }

    function process(data, options) {
        options = options || {};

        var query = new Query(data),
            group = options.group,
            sort = normalizeGroup(group || []).concat(normalizeSort(options.sort || [])),
            total,
            filter = options.filter,
            skip = options.skip,
            take = options.take;

        if (filter) {
            query = query.filter(filter);
            total = query.toArray().length;
        }

        if (sort) {
            query = query.sort(sort);

            if (group) {
                data = query.toArray();
            }
        }

        if (skip !== undefined && take !== undefined) {
            query = query.range(skip, take);
        }

        if (group) {
            query = query.group(group, data);
        }

        return {
            total: total,
            data: query.toArray()
        };
    }

    function calculateAggregates(data, options) {
        options = options || {};

        var query = new Query(data),
            aggregates = options.aggregate,
            filter = options.filter;

        if(filter) {
            query = query.filter(filter);
        }

        return query.aggregate(aggregates);
    }

    var LocalTransport = Class.extend({
        init: function(options) {
            this.data = options.data;
        },

        read: function(options) {
            options.success(this.data);
        },
        update: function(options) {
            options.success(options.data);
        },
        create: function(options) {
            options.success(options.data);
        },
        destroy: noop
    });

    var RemoteTransport = Class.extend( {
        init: function(options) {
            var that = this, parameterMap;

            options = that.options = extend({}, that.options, options);

            each(crud, function(index, type) {
                if (typeof options[type] === STRING) {
                    options[type] = {
                        url: options[type]
                    };
                }
            });

            that.cache = options.cache? Cache.create(options.cache) : {
                find: noop,
                add: noop
            };

            parameterMap = options.parameterMap;

            that.parameterMap = isFunction(parameterMap) ? parameterMap : function(options) {
                var result = {};

                each(options, function(option, value) {
                    if (option in parameterMap) {
                        option = parameterMap[option];
                        if (isPlainObject(option)) {
                            value = option.value(value);
                            option = option.key;
                        }
                    }

                    result[option] = value;
                });

                return result;
            };
        },

        options: {
            parameterMap: identity
        },

        create: function(options) {
            return ajax(this.setup(options, CREATE));
        },

        read: function(options) {
            var that = this,
                success,
                error,
                result,
                cache = that.cache;

            options = that.setup(options, READ);

            success = options.success || noop;
            error = options.error || noop;

            result = cache.find(options.data);

            if(result !== undefined) {
                success(result);
            } else {
                options.success = function(result) {
                    cache.add(options.data, result);

                    success(result);
                };

                $.ajax(options);
            }
        },

        update: function(options) {
            return ajax(this.setup(options, UPDATE));
        },

        destroy: function(options) {
            return ajax(this.setup(options, DESTROY));
        },

        setup: function(options, type) {
            options = options || {};

            var that = this,
                parameters,
                operation = that.options[type],
                data = isFunction(operation.data) ? operation.data(options.data) : operation.data;

            options = extend(true, {}, operation, options);
            parameters = extend(true, {}, data, options.data);

            options.data = that.parameterMap(parameters, type);

            if (isFunction(options.url)) {
                options.url = options.url(parameters);
            }

            return options;
        }
    });

    var Cache = Class.extend({
        init: function() {
            this._store = {};
        },
        add: function(key, data) {
            if(key !== undefined) {
                this._store[stringify(key)] = data;
            }
        },
        find: function(key) {
            return this._store[stringify(key)];
        },
        clear: function() {
            this._store = {};
        },
        remove: function(key) {
            delete this._store[stringify(key)];
        }
    });

    Cache.create = function(options) {
        var store = {
            "inmemory": function() { return new Cache(); }
        };

        if (isPlainObject(options) && isFunction(options.find)) {
            return options;
        }

        if (options === true) {
            return new Cache();
        }

        return store[options]();
    };

    function convertRecords(data, getters, modelInstance) {
        var record,
            getter,
            idx,
            length;

        for (idx = 0, length = data.length; idx < length; idx++) {
            record = data[idx];
            for (getter in getters) {
                record[getter] = modelInstance._parse(getter, getters[getter](record));
            }
        }
    }

    function convertGroup(data, getters, modelInstance) {
        var record,
            idx,
            length;

        for (idx = 0, length = data.length; idx < length; idx++) {
            record = data[idx];
            record.value = modelInstance._parse(record.field, record.value);

            if (record.hasSubgroups) {
                convertGroup(record.items, getters, modelInstance);
            } else {
                convertRecords(record.items, getters, modelInstance);
            }
        }
    }

    function wrapDataAccess(originalFunction, model, converter, getters) {
        return function(data) {
            data = originalFunction(data);

            if (data && !isEmptyObject(getters)) {
                if (toString.call(data) !== "[object Array]" && !(data instanceof ObservableArray)) {
                    data = [data];
                }

                converter(data, getters, new model());
            }

            return data || [];
        };
    }

    var DataReader = Class.extend({
        init: function(schema) {
            var that = this, member, get, model, base;

            schema = schema || {};

            for (member in schema) {
                get = schema[member];

                that[member] = typeof get === STRING ? getter(get) : get;
            }

            base = schema.modelBase || Model;

            if (isPlainObject(that.model)) {
                that.model = model = base.define(that.model);
            }

            if (that.model) {
                var dataFunction = proxy(that.data, that),
                    groupsFunction = proxy(that.groups, that),
                    getters = {};

                model = that.model;

                if (model.fields) {
                    each(model.fields, function(field, value) {
                        if (isPlainObject(value) && value.field) {
                            getters[value.field] = getter(value.field);
                        } else {
                            getters[field] = getter(field);
                        }
                    });
                }

                that.data = wrapDataAccess(dataFunction, model, convertRecords, getters);
                that.groups = wrapDataAccess(groupsFunction, model, convertGroup, getters);
            }
        },
        errors: function(data) {
            return data ? data.errors : null;
        },
        parse: identity,
        data: identity,
        total: function(data) {
            return data.length;
        },
        groups: identity,
        status: function(data) {
            return data.status;
        },
        aggregates: function() {
            return {};
        }
    });

    function flattenGroups(data) {
        var idx, length, result = [];

        for (idx = 0, length = data.length; idx < length; idx++) {
            if (data[idx].hasSubgroups) {
                result = result.concat(flattenGroups(data[idx].items));
            } else {
                result = result.concat(data[idx].items.slice());
            }
        }
        return result;
    }
    function wrapGroupItems(data, model) {
        var idx, length, group, items;
        if (model) {
            for (idx = 0, length = data.length; idx < length; idx++) {
                group = data[idx];
                items = group.items;

                if (group.hasSubgroups) {
                    wrapGroupItems(items, model);
                } else if (items.length && !(items[0] instanceof model)) {
                    items.type = model;
                    items.wrapAll(items, items);
                }
            }
        }
    }

    function eachGroupItems(data, func) {
        var idx, length;

        for (idx = 0, length = data.length; idx < length; idx++) {
            if (data[idx].hasSubgroups) {
                if (eachGroupItems(data[idx].items, func)) {
                    return true;
                }
            } else {
                if (func(data[idx].items, data[idx])) {
                    return true;
                }
            }
        }
    }

    function removeModel(data, model) {
        var idx, length;

        for (idx = 0, length = data.length; idx < length; idx++) {
            if (data[idx].uid == model.uid) {
                model = data[idx];
                data.splice(idx, 1);
                return model;
            }
        }
    }

    function wrapInEmptyGroup(groups, model) {
        var parent,
            group,
            idx,
            length;

        for (idx = groups.length-1, length = 0; idx >= length; idx--) {
            group = groups[idx];
            parent = {
                value: model.get(group.field),
                field: group.field,
                items: parent ? [parent] : [model],
                hasSubgroups: !!parent,
                aggregates: {}
            };
        }

        return parent;
    }

    function indexOfPristineModel(data, model) {
        if (model) {
            return indexOf(data, function(item) {
                return item[model.idField] === model.id;
            });
        }
        return -1;
    }

    function indexOfModel(data, model) {
        if (model) {
            return indexOf(data, function(item) {
                return item.uid == model.uid;
            });
        }
        return -1;
    }

    function indexOf(data, comparer) {
        var idx, length;

        for (idx = 0, length = data.length; idx < length; idx++) {
            if (comparer(data[idx])) {
                return idx;
            }
        }

        return -1;
    }

    var DataSource = Observable.extend({
        init: function(options) {
            var that = this, model, transport, data;

            if (options) {
                data = options.data;
            }

            options = that.options = extend({}, that.options, options);

            extend(that, {
                _map: {},
                _prefetch: {},
                _data: [],
                _ranges: [],
                _view: [],
                _pristine: [],
                _destroyed: [],
                _pageSize: options.pageSize,
                _page: options.page  || (options.pageSize ? 1 : undefined),
                _sort: normalizeSort(options.sort),
                _filter: normalizeFilter(options.filter),
                _group: normalizeGroup(options.group),
                _aggregate: options.aggregate,
                _total: options.total
            });

            Observable.fn.init.call(that);

            transport = options.transport;

            if (transport) {
                transport.read = typeof transport.read === STRING ? { url: transport.read } : transport.read;

                if (options.type) {
                    if (kendo.data.transports[options.type] && !isPlainObject(kendo.data.transports[options.type])) {
                       that.transport = new kendo.data.transports[options.type](extend(transport, { data: data }));
                    } else {
                        transport = extend(true, {}, kendo.data.transports[options.type], transport);
                    }

                    options.schema = extend(true, {}, kendo.data.schemas[options.type], options.schema);
                }

                if (!that.transport) {
                    that.transport = isFunction(transport.read) ? transport: new RemoteTransport(transport);
                }
            } else {
                that.transport = new LocalTransport({ data: options.data });
            }

            that.reader = new kendo.data.readers[options.schema.type || "json" ](options.schema);

            model = that.reader.model || {};

            that._data = that._observe(that._data);

            that.bind([ERROR, CHANGE, REQUESTSTART, SYNC, REQUESTEND], options);
        },

        options: {
            data: [],
            schema: {
               modelBase: Model
            },
            serverSorting: false,
            serverPaging: false,
            serverFiltering: false,
            serverGrouping: false,
            serverAggregates: false,
            sendAllFields: true,
            batch: false
        },

        _flatData: function(data) {
            if (this.options.serverGrouping && this.group().length) {
                return flattenGroups(data);
            }
            return data;
        },

        get: function(id) {
            var idx, length, data = this._flatData(this._data);

            for (idx = 0, length = data.length; idx < length; idx++) {
                if (data[idx].id == id) {
                    return data[idx];
                }
            }
        },

        getByUid: function(id) {
            var idx, length, data = this._flatData(this._data);

            if (!data) {
                return;
            }

            for (idx = 0, length = data.length; idx < length; idx++) {
                if (data[idx].uid == id) {
                    return data[idx];
                }
            }
        },

        sync: function() {
            var that = this,
                idx,
                length,
                created = [],
                updated = [],
                destroyed = that._destroyed,
                data = that._flatData(that._data);

            if (!that.reader.model) {
                return;
            }

            for (idx = 0, length = data.length; idx < length; idx++) {
                if (data[idx].isNew()) {
                    created.push(data[idx]);
                } else if (data[idx].dirty) {
                    updated.push(data[idx]);
                }
            }

            var promises = that._send("create", created);

            promises.push.apply(promises ,that._send("update", updated));
            promises.push.apply(promises ,that._send("destroy", destroyed));

            $.when.apply(null, promises)
                .then(function() {
                    var idx,
                    length;

                    for (idx = 0, length = arguments.length; idx < length; idx++){
                        that._accept(arguments[idx]);
                    }

                    that._change();

                    that.trigger(SYNC);
                });
        },

        _accept: function(result) {
            var that = this,
                models = result.models,
                response = result.response,
                idx = 0,
                serverGroup = that.options.serverGrouping && that.group() && that.group().length,
                pristine = that.reader.data(that._pristine),
                type = result.type,
                length;

            that.trigger(REQUESTEND, { response: response, type: type });

            if (response) {
                response = that.reader.parse(response);

                if (that._handleCustomErrors(response)) {
                    return;
                }

                response = that.reader.data(response);

                if (!$.isArray(response)) {
                    response = [response];
                }
            } else {
                response = $.map(models, function(model) { return model.toJSON(); } );
            }

            if (type === "destroy") {
                that._destroyed = [];
            }

            for (idx = 0, length = models.length; idx < length; idx++) {
                if (type !== "destroy") {
                    models[idx].accept(response[idx]);

                    if (type === "create") {
                        pristine.push(serverGroup ? wrapInEmptyGroup(that.group(), models[idx]) : response[idx]);
                    } else if (type === "update") {
                        if (serverGroup) {
                            that._updatePristineGroupModel(models[idx], response[idx]);
                        } else {
                            extend(pristine[that._pristineIndex(models[idx])], response[idx]);
                        }
                    }
                } else {
                    if (serverGroup) {
                        that._removePristineGroupModel(models[idx]);
                    } else {
                        pristine.splice(that._pristineIndex(models[idx]), 1);
                    }
                }
            }
        },

        _pristineIndex: function(model) {
            var that = this,
                idx,
                length,
                pristine = that.reader.data(that._pristine);

            for (idx = 0, length = pristine.length; idx < length; idx++) {
                if (pristine[idx][model.idField] === model.id) {
                    return idx;
                }
            }
            return -1;
        },

        _updatePristineGroupModel: function(model, values) {
            var pristineData = this.reader.groups(this._pristine),
                index;

            eachGroupItems(pristineData,
                function(items, group) {
                    index = indexOfPristineModel(items, model);
                    if (index > -1) {
                        extend(true, items[index], values);
                        return true;
                    }
                });
        },

        _removePristineGroupModel: function(model) {
            var pristineData = this.reader.groups(this._pristine),
                index;

            eachGroupItems(pristineData,
                function(items, group) {
                    index = indexOfPristineModel(items, model);
                    if (index > -1) {
                        items.splice(index, 1);
                        return true;
                    }
                });
        },
        _promise: function(data, models, type) {
            var that = this,
            transport = that.transport;

            return $.Deferred(function(deferred) {
                transport[type].call(transport, extend({
                    success: function(response) {
                        deferred.resolve({
                            response: response,
                            models: models,
                            type: type
                        });
                    },
                    error: function(response) {
                        deferred.reject(response);
                        that.trigger(ERROR, response);
                    }
                }, data)
                );
            }).promise();
        },

        _send: function(method, data) {
            var that = this,
                idx,
                length,
                promises = [];

            if (that.options.batch) {
                if (data.length) {
                    promises.push(that._promise( { data: { models: toJSON(data) } }, data , method));
                }
            } else {
                for (idx = 0, length = data.length; idx < length; idx++) {
                    promises.push(that._promise( { data: data[idx].toJSON() }, [ data[idx] ], method));
                }
            }

            return promises;
        },

        add: function(model) {
            return this.insert(this._data.length, model);
        },

        insert: function(index, model) {
            if (!model) {
                model = index;
                index = 0;
            }

            if (!(model instanceof Model)) {
                if (this.reader.model) {
                    model = new this.reader.model(model);
                } else {
                    model = new ObservableObject(model);
                }
            }

            if (this.options.serverGrouping && this.group() && this.group().length) {
                this._data.splice(index, 0, wrapInEmptyGroup(this.group(), model));
            } else {
                this._data.splice(index, 0, model);
            }

            return model;
        },

        cancelChanges: function(model) {
            var that = this,
                pristineIndex,
                serverGroup = that.options.serverGrouping && that.group() && that.group().length,
                read = !serverGroup ? that.reader.data : that.reader.groups,
                pristine = read(that._pristine),
                index;

            if (model instanceof kendo.data.Model) {
                if (serverGroup) {
                    that._cancelGroupModel(model);
                } else {
                    index = that.indexOf(model);
                    pristineIndex = that._pristineIndex(model);
                    if (index != -1) {
                        if (pristineIndex != -1 && !model.isNew()) {
                           that._data[index].accept(pristine[pristineIndex]);
                        } else {
                            that._data.splice(index, 1);
                        }
                    }
                }
            } else {
                that._destroyed = [];
                that._data = that._observe(pristine);
                that._change();
            }
        },

        read: function(data) {
            var that = this, params = that._params(data);

            that._queueRequest(params, function() {
                that.trigger(REQUESTSTART);
                that._ranges = [];
                that.transport.read({
                    data: params,
                    success: proxy(that.success, that),
                    error: proxy(that.error, that)
                });
            });
        },

        _cancelGroupModel: function(model) {
            var pristineData = this.reader.groups(this._pristine),
                pristine,
                idx;

            eachGroupItems(pristineData,
                function(items, group) {
                    idx = indexOfPristineModel(items, model);
                    if (idx > -1) {
                        pristine = items[idx];
                        return true;
                    }
                });

            if (idx > -1) {
                eachGroupItems(this._data, function(items, group) {
                    idx = indexOfModel(items, model);
                    if (idx > -1) {
                        if (!model.isNew()) {
                            extend(true, items[idx], pristine);
                        } else {
                            items.splice(idx, 1);
                        }
                    }
                });
            }
        },

        indexOf: function(model) {
            return indexOfModel(this._data, model);
        },

        _params: function(data) {
            var that = this,
            options =  extend({
                take: that.take(),
                skip: that.skip(),
                page: that.page(),
                pageSize: that.pageSize(),
                sort: that._sort,
                filter: that._filter,
                group: that._group,
                aggregate: that._aggregate
            }, data);

            if (!that.options.serverPaging) {
                delete options.take;
                delete options.skip;
                delete options.page;
                delete options.pageSize;
            }
            if (!that.options.serverGrouping) {
                delete options.group;
            }
            if (!that.options.serverFiltering) {
                delete options.filter;
            }
            if (!that.options.serverSorting) {
                delete options.sort;
            }
            if (!that.options.serverAggregates) {
                delete options.aggregate;
            }
            return options;
        },

        _queueRequest: function(options, callback) {
            var that = this;
            if (!that._requestInProgress) {
                that._requestInProgress = true;
                that._pending = undefined;
                callback();
            } else {
                that._pending = { callback: proxy(callback, that), options: options };
            }
        },

        _dequeueRequest: function() {
            var that = this;
            that._requestInProgress = false;
            if (that._pending) {
                that._queueRequest(that._pending.options, that._pending.callback);
            }
        },

        remove: function(model) {
            var data = this._data;

            if (this.options.serverGrouping && this.group() && this.group().length) {
                return this._removeGroupItem(data, model);
            }
            return removeModel(data, model);
        },

        _removeGroupItem: function(data, model) {
            var result,
                that = this;

            eachGroupItems(data, function(items, group) {
                result = removeModel(items, model);
                if (result) {
                    if (!result.isNew || !result.isNew()) {
                        that._destroyed.push(result);
                    }
                    return true;
                }
            });
            return model;
        },

        error: function(xhr, status, errorThrown) {
            this._dequeueRequest();
            this.trigger(REQUESTEND, { });
            this.trigger(ERROR, { xhr: xhr, status: status, errorThrown: errorThrown });
        },

        _handleCustomErrors: function(response) {
            if (this.reader.errors) {
                var errors = this.reader.errors(response);
                if (errors) {
                    this.trigger(ERROR, { xhr: null, status: "customerror", errorThrown: "custom error", errors: errors });
                    return true;
                }
            }
            return false;
        },

        _parent: noop,

        success: function(data) {
            var that = this,
                options = that.options,
                hasGroups = options.serverGrouping === true && that._group && that._group.length > 0;

            that.trigger(REQUESTEND, { response: data, type: "read" });

            data = that.reader.parse(data);

            if (that._handleCustomErrors(data)) {
                that._dequeueRequest();
                return;
            }

            that._pristine = isPlainObject(data) ? $.extend(true, {}, data) : data.slice ? data.slice(0) : data;

            that._total = that.reader.total(data);

            if (that._aggregate && options.serverAggregates) {
                that._aggregateResult = that.reader.aggregates(data);
            }

            if (hasGroups) {
                data = that.reader.groups(data);
            } else {
                data = that.reader.data(data);
            }

            that._data = that._observe(data);

            var start = that._skip || 0,
            end = start + that._data.length;

            that._ranges.push({ start: start, end: end, data: that._data });
            that._ranges.sort( function(x, y) { return x.start - y.start; } );

            that._dequeueRequest();
            that._process(that._data);
        },

        _observe: function(data) {
            var that = this,
                model = that.reader.model,
                wrap = false;

            if (model && data.length) {
                wrap = !(data[0] instanceof model);
            }

            if (data instanceof ObservableArray) {
                if (wrap) {
                    data.type = that.reader.model;
                    data.wrapAll(data, data);
                }
            } else {
                data = new ObservableArray(data, that.reader.model);
                data.parent = function() { return that._parent(); };
            }

            if (that.group() && that.group().length && that.options.serverGrouping) {
                wrapGroupItems(data, model);
            }

            return data.bind(CHANGE, proxy(that._change, that));
        },

        _change: function(e) {
            var that = this, idx, length, action = e ? e.action : "";

            if (action === "remove") {
                for (idx = 0, length = e.items.length; idx < length; idx++) {
                    if (!e.items[idx].isNew || !e.items[idx].isNew()) {
                        that._destroyed.push(e.items[idx]);
                    }
                }
            }

            if (that.options.autoSync && (action === "add" || action === "remove" || action === "itemchange")) {
                that.sync();
            } else {
                var total = that._total || that.reader.total(that._pristine);
                if (action === "add") {
                    total++;
                } else if (action === "remove") {
                    total--;
                } else if (action !== "itemchange" && !that.options.serverPaging) {
                    total = that.reader.total(that._pristine);
                }

                that._total = total;

                that._process(that._data, e);
            }
        },

        _process: function (data, e) {
            var that = this,
                options = {},
                result;

            if (that.options.serverPaging !== true) {
                options.skip = that._skip;
                options.take = that._take || that._pageSize;

                if(options.skip === undefined && that._page !== undefined && that._pageSize !== undefined) {
                    options.skip = (that._page - 1) * that._pageSize;
                }
            }

            if (that.options.serverSorting !== true) {
                options.sort = that._sort;
            }

            if (that.options.serverFiltering !== true) {
                options.filter = that._filter;
            }

            if (that.options.serverGrouping !== true) {
                options.group = that._group;
            }

            if (that.options.serverAggregates !== true) {
                options.aggregate = that._aggregate;
                that._aggregateResult = calculateAggregates(data, options);
            }

            result = process(data, options);

            that._view = result.data;

            if (result.total !== undefined && !that.options.serverFiltering) {
                that._total = result.total;
            }

            e = e || {};

            e.items = e.items || that._view;

            that.trigger(CHANGE, e);
        },

        at: function(index) {
            return this._data[index];
        },

        data: function(value) {
            var that = this;
            if (value !== undefined) {
                that._data = this._observe(value);

                that._total = that._data.length;

                that._process(that._data);
            } else {
                return that._data;
            }
        },

        view: function() {
            return this._view;
        },

        query: function(options) {
            var that = this,
            result,
            remote = that.options.serverSorting || that.options.serverPaging || that.options.serverFiltering || that.options.serverGrouping || that.options.serverAggregates;

            if (options !== undefined) {
                that._pageSize = options.pageSize;
                that._page = options.page;
                that._sort = options.sort;
                that._filter = options.filter;
                that._group = options.group;
                that._aggregate = options.aggregate;
                that._skip = options.skip;
                that._take = options.take;

                if(that._skip === undefined) {
                    that._skip = that.skip();
                    options.skip = that.skip();
                }

                if(that._take === undefined && that._pageSize !== undefined) {
                    that._take = that._pageSize;
                    options.take = that._take;
                }

                if (options.sort) {
                    that._sort = options.sort = normalizeSort(options.sort);
                }

                if (options.filter) {
                    that._filter = options.filter = normalizeFilter(options.filter);
                }

                if (options.group) {
                    that._group = options.group = normalizeGroup(options.group);
                }
                if (options.aggregate) {
                    that._aggregate = options.aggregate = normalizeAggregate(options.aggregate);
                }
            }

            if (remote || (that._data === undefined || that._data.length === 0)) {
                that.read(options);
            } else {
                that.trigger(REQUESTSTART);
                result = process(that._data, options);

                if (!that.options.serverFiltering) {
                    if (result.total !== undefined) {
                        that._total = result.total;
                    } else {
                        that._total = that._data.length;
                    }
                }

                that._view = result.data;
                that._aggregateResult = calculateAggregates(that._data, options);
                that.trigger(CHANGE, { items: result.data });
            }
        },

        fetch: function(callback) {
            var that = this;

            if (callback && isFunction(callback)) {
                that.one(CHANGE, callback);
            }

            that._query();
        },

        _query: function(options) {
            var that = this;

            that.query(extend({}, {
                page: that.page(),
                pageSize: that.pageSize(),
                sort: that.sort(),
                filter: that.filter(),
                group: that.group(),
                aggregate: that.aggregate()
            }, options));
        },

        next: function(options) {
            var that = this,
                page = that.page(),
                total = that.total();

            options = options || {};

            if (!page || (total && page + 1 > that.totalPages())) {
                return;
            }

            that._skip = page * that.take();

            page += 1;
            options.page = page;

            that._query(options);

            return page;
        },

        prev: function(options) {
            var that = this,
                page = that.page();

            options = options || {};

            if (!page || page === 1) {
                return;
            }

            that._skip = that._skip - that.take();

            page -= 1;
            options.page = page;

            that._query(options);

            return page;
        },

        page: function(val) {
            var that = this,
            skip;

            if(val !== undefined) {
                val = math.max(math.min(math.max(val, 1), that.totalPages()), 1);
                that._query({ page: val });
                return;
            }
            skip = that.skip();

            return skip !== undefined ? math.round((skip || 0) / (that.take() || 1)) + 1 : undefined;
        },

        pageSize: function(val) {
            var that = this;

            if(val !== undefined) {
                that._query({ pageSize: val, page: 1 });
                return;
            }

            return that.take();
        },

        sort: function(val) {
            var that = this;

            if(val !== undefined) {
                that._query({ sort: val });
                return;
            }

            return that._sort;
        },

        filter: function(val) {
            var that = this;

            if (val === undefined) {
                return that._filter;
            }

            that._query({ filter: val, page: 1 });
        },

        group: function(val) {
            var that = this;

            if(val !== undefined) {
                that._query({ group: val });
                return;
            }

            return that._group;
        },

        total: function() {
            return this._total || 0;
        },

        aggregate: function(val) {
            var that = this;

            if(val !== undefined) {
                that._query({ aggregate: val });
                return;
            }

            return that._aggregate;
        },

        aggregates: function() {
            return this._aggregateResult;
        },

        totalPages: function() {
            var that = this,
            pageSize = that.pageSize() || that.total();

            return math.ceil((that.total() || 0) / pageSize);
        },

        inRange: function(skip, take) {
            var that = this,
            end = math.min(skip + take, that.total());

            if (!that.options.serverPaging && that.data.length > 0) {
                return true;
            }

            return that._findRange(skip, end).length > 0;
        },

        range: function(skip, take) {
            skip = math.min(skip || 0, this.total());
            var that = this,
            pageSkip = math.max(math.floor(skip / take), 0) * take,
            size = math.min(pageSkip + take, that.total()),
            data;

            data = that._findRange(skip, math.min(skip + take, that.total()));

            if (data.length) {
                that._skip = skip > that.skip() ? math.min(size, (that.totalPages() - 1) * that.take()) : pageSkip;

                that._take = take;

                var paging = that.options.serverPaging;
                var sorting = that.options.serverSorting;
                var filtering = that.options.serverFiltering;
                try {
                    that.options.serverPaging = true;
                    that.options.serverSorting = true;
                    that.options.serverFiltering = true;
                    if (paging) {
                        that._data = data = that._observe(data);
                    }
                    that._process(data);
                } finally {
                    that.options.serverPaging = paging;
                    that.options.serverSorting = sorting;
                    that.options.serverFiltering = filtering;
                }

                return;
            }

            if (take !== undefined) {
                if (!that._rangeExists(pageSkip, size)) {
                    that.prefetch(pageSkip, take, function() {
                        if (skip > pageSkip && size < that.total() && !that._rangeExists(size, math.min(size + take, that.total()))) {
                            that.prefetch(size, take, function() {
                                that.range(skip, take);
                            });
                        } else {
                            that.range(skip, take);
                        }
                    });
                } else if (pageSkip < skip) {
                    that.prefetch(size, take, function() {
                        that.range(skip, take);
                    });
                }
            }
        },

        _findRange: function(start, end) {
            var that = this,
                ranges = that._ranges,
                range,
                data = [],
                skipIdx,
                takeIdx,
                startIndex,
                endIndex,
                rangeData,
                rangeEnd,
                processed,
                options = that.options,
                remote = options.serverSorting || options.serverPaging || options.serverFiltering || options.serverGrouping || options.serverAggregates,
                length;

            for (skipIdx = 0, length = ranges.length; skipIdx < length; skipIdx++) {
                range = ranges[skipIdx];
                if (start >= range.start && start <= range.end) {
                    var count = 0;

                    for (takeIdx = skipIdx; takeIdx < length; takeIdx++) {
                        range = ranges[takeIdx];

                        if (range.data.length && start + count >= range.start) {
                            rangeData = range.data;
                            rangeEnd = range.end;

                            if (!remote) {
                                processed = process(range.data, { sort: that.sort(), filter: that.filter() });
                                rangeData = processed.data;

                                if (processed.total !== undefined) {
                                    rangeEnd = processed.total;
                                }
                            }

                            startIndex = 0;
                            if (start + count > range.start) {
                                startIndex = (start + count) - range.start;
                            }
                            endIndex = rangeData.length;
                            if (rangeEnd > end) {
                                endIndex = endIndex - (rangeEnd - end);
                            }
                            count += endIndex - startIndex;
                            data = data.concat(rangeData.slice(startIndex, endIndex));

                            if (end <= range.end && count == end - start) {
                                return data;
                            }
                        }
                    }
                    break;
                }
            }
            return [];
        },

        skip: function() {
            var that = this;

            if (that._skip === undefined) {
                return (that._page !== undefined ? (that._page  - 1) * (that.take() || 1) : undefined);
            }
            return that._skip;
        },

        take: function() {
            var that = this;
            return that._take || that._pageSize;
        },

        prefetch: function(skip, take, callback) {
            var that = this,
            size = math.min(skip + take, that.total()),
            range = { start: skip, end: size, data: [] },
            options = {
                take: take,
                skip: skip,
                page: skip / take + 1,
                pageSize: take,
                sort: that._sort,
                filter: that._filter,
                group: that._group,
                aggregate: that._aggregate
            };

            if (!that._rangeExists(skip, size)) {
                clearTimeout(that._timeout);

                that._timeout = setTimeout(function() {
                    that._queueRequest(options, function() {
                        that.transport.read({
                            data: options,
                            success: function (data) {
                                that._dequeueRequest();
                                var found = false;
                                for (var i = 0, len = that._ranges.length; i < len; i++) {
                                    if (that._ranges[i].start === skip) {
                                        found = true;
                                        range = that._ranges[i];
                                        break;
                                    }
                                }
                                if (!found) {
                                    that._ranges.push(range);
                                }

                                data = that.reader.parse(data);
                                range.data = that._observe(that.reader.data(data));
                                range.end = range.start + range.data.length;
                                that._ranges.sort( function(x, y) { return x.start - y.start; } );
                                that._total = that.reader.total(data);
                                if (callback) {
                                    callback();
                                }
                            }
                        });
                    });
                }, 100);
            } else if (callback) {
                callback();
            }
        },

        _rangeExists: function(start, end) {
            var that = this,
            ranges = that._ranges,
            idx,
            length;

            for (idx = 0, length = ranges.length; idx < length; idx++) {
                if (ranges[idx].start <= start && ranges[idx].end >= end) {
                    return true;
                }
            }
            return false;
        }
    });

    DataSource.create = function(options) {
        options = options && options.push ? { data: options } : options;

        var dataSource = options || {},
        data = dataSource.data,
        fields = dataSource.fields,
        table = dataSource.table,
        select = dataSource.select,
        idx,
        length,
        model = {},
        field;

        if (!data && fields && !dataSource.transport) {
            if (table) {
                data = inferTable(table, fields);
            } else if (select) {
                data = inferSelect(select, fields);
            }
        }

        if (kendo.data.Model && fields && (!dataSource.schema || !dataSource.schema.model)) {
            for (idx = 0, length = fields.length; idx < length; idx++) {
                field = fields[idx];
                if (field.type) {
                    model[field.field] = field;
                }
            }

            if (!isEmptyObject(model)) {
                dataSource.schema = extend(true, dataSource.schema, { model:  { fields: model } });
            }
        }

        dataSource.data = data;

        return dataSource instanceof DataSource ? dataSource : new DataSource(dataSource);
    };

    function inferSelect(select, fields) {
        var options = $(select)[0].children,
            idx,
            length,
            data = [],
            record,
            firstField = fields[0],
            secondField = fields[1],
            value,
            option;

        for (idx = 0, length = options.length; idx < length; idx++) {
            record = {};
            option = options[idx];

            record[firstField.field] = option.text;

            value = option.attributes.value;

            if (value && value.specified) {
                value = option.value;
            } else {
                value = option.text;
            }

            record[secondField.field] = value;

            data.push(record);
        }

        return data;
    }

    function inferTable(table, fields) {
        var tbody = $(table)[0].tBodies[0],
        rows = tbody ? tbody.rows : [],
        idx,
        length,
        fieldIndex,
        fieldCount = fields.length,
        data = [],
        cells,
        record,
        cell,
        empty;

        for (idx = 0, length = rows.length; idx < length; idx++) {
            record = {};
            empty = true;
            cells = rows[idx].cells;

            for (fieldIndex = 0; fieldIndex < fieldCount; fieldIndex++) {
                cell = cells[fieldIndex];
                if(cell.nodeName.toLowerCase() !== "th") {
                    empty = false;
                    record[fields[fieldIndex].field] = cell.innerHTML;
                }
            }
            if(!empty) {
                data.push(record);
            }
        }

        return data;
    }

    var Node = Model.define({
        init: function(value) {
            var that = this,
                hasChildren = that.hasChildren || value && value.hasChildren,
                data = "items",
                children = {};

            kendo.data.Model.fn.init.call(that, value);

            if (typeof that.children === STRING) {
               data = that.children;
            }

            children = extend({
                schema: {
                    data: data,
                    model: {
                        hasChildren: hasChildren
                    }
                }
            }, that.children);

            children.data = value;

            if (!hasChildren) {
                hasChildren = children.schema.data;
            }

            if (typeof hasChildren === STRING) {
                hasChildren = kendo.getter(hasChildren);
            }

            if (isFunction(hasChildren)) {
                that.hasChildren = !!hasChildren.call(that, that);
            }

            that._childrenOptions = children;

            if (that.hasChildren) {
                that._initChildren();
            }

            that._loaded = !!(value && value[data]);
        },

        _initChildren: function() {
            var that = this;

            if (!(that.children instanceof HierarchicalDataSource)) {
                that.children = new HierarchicalDataSource(that._childrenOptions);
                that.children._parent = function(){
                    return that;
                };

                that.children.bind(CHANGE, function(e){
                    e.node = e.node || that;
                    that.trigger(CHANGE, e);
                });
            }
        },

        append: function(model) {
            this._initChildren();
            this.loaded(true);
            this.children.add(model);
        },

        hasChildren: false,

        level: function() {
            var parentNode = this.parentNode(),
                level = 0;

            while (parentNode) {
                level++;
                parentNode = parentNode.parentNode ? parentNode.parentNode() : null;
            }

            return level;
        },

        load: function() {
            var that = this,
                options = {};

            that._initChildren();

            if (!that._loaded || that.hasChildren) {
                options[that.idField || "id"] = that.id;

                if (!that._loaded) {
                    that.children._data = undefined;
                }

                that.children.one(CHANGE, function() {
                            that._loaded = true;
                        })
                        ._query(options);
            }
        },

        parentNode: function() {
            var array = this.parent();

            return array.parent();
        },

        loaded: function(value) {
            if (value !== undefined) {
                this._loaded = value;
            } else {
                return this._loaded;
            }
        },

        shouldSerialize: function(field) {
            return Model.fn.shouldSerialize.call(this, field) && field !== "children" && field !== "_loaded" && field !== "hasChildren";
        }
    });

    var HierarchicalDataSource = DataSource.extend({
        init: function(options) {
            var node = Node.define({
                children: options
            });

            DataSource.fn.init.call(this, extend(true, {}, { schema: { modelBase: node, model: node } }, options));
        },

        remove: function(node){
            var parentNode = node.parentNode(),
                dataSource = this,
                result;

            if (parentNode) {
                dataSource = parentNode.children;
            }

            result = DataSource.fn.remove.call(dataSource, node);

            if (parentNode && !dataSource.data().length) {
                parentNode.hasChildren = false;
            }

            return result;
        },

        insert: function(index, model) {
            var parentNode = this._parent();

            if (parentNode) {
                parentNode.hasChildren = true;
                parentNode._initChildren();
            }

            return DataSource.fn.insert.call(this, index, model);
        },

        _find: function(method, value) {
            var idx, length, node, data, children;

            node = DataSource.fn[method].call(this, value);

            if (node) {
                return node;
            }

            data = this._flatData(this.data());

            if (!data) {
                return;
            }

            for (idx = 0, length = data.length; idx < length; idx++) {
                children = data[idx].children;

                if (!(children instanceof HierarchicalDataSource)) {
                    continue;
                }

                node = children[method](value);

                if (node) {
                    return node;
                }
            }
        },

        get: function(id) {
            return this._find("get", id);
        },

        getByUid: function(uid) {
            return this._find("getByUid", uid);
        }
    });

    function inferList(list, fields) {
        var items = $(list).children(),
            idx,
            length,
            data = [],
            record,
            textField = fields[0].field,
            urlField = fields[1] && fields[1].field,
            spriteCssClassField = fields[2] && fields[2].field,
            imageUrlField = fields[3] && fields[3].field,
            item,
            id,
            textChild,
            className,
            children;

        for (idx = 0, length = items.length; idx < length; idx++) {
            record = {};
            item = items.eq(idx);

            textChild = item[0].firstChild;
            children = item.children();
            list = children.filter("ul");
            children = children.filter(":not(ul)");

            id = item.attr("data-id");

            if (id) {
                record.id = id;
            }

            if (textChild) {
                record[textField] = textChild.nodeType == 3 ? textChild.nodeValue : children.text();
            }

            if (urlField) {
                record[urlField] = children.find("a").attr("href");
            }

            if (imageUrlField) {
                record[imageUrlField] = children.find("img").attr("src");
            }

            if (spriteCssClassField) {
                className = children.find(".k-sprite").prop("className");
                record[spriteCssClassField] = className && $.trim(className.replace("k-sprite", ""));
            }

            if (list.length) {
                record.items = inferList(list.eq(0), fields);
            }

            if (item.attr("data-hasChildren") == "true") {
                record.hasChildren = true;
            }

            data.push(record);
        }

        return data;
    }

    HierarchicalDataSource.create = function(options) {
        options = options && options.push ? { data: options } : options;

        var dataSource = options || {},
            data = dataSource.data,
            fields = dataSource.fields,
            list = dataSource.list;

        if (!data && fields && !dataSource.transport) {
            if (list) {
                data = inferList(list, fields);
            }
        }

        dataSource.data = data;

        return dataSource instanceof HierarchicalDataSource ? dataSource : new HierarchicalDataSource(dataSource);
    };

    extend(true, kendo.data, {
        readers: {
            json: DataReader
        },
        Query: Query,
        DataSource: DataSource,
        HierarchicalDataSource: HierarchicalDataSource,
        Node: Node,
        ObservableObject: ObservableObject,
        ObservableArray: ObservableArray,
        LocalTransport: LocalTransport,
        RemoteTransport: RemoteTransport,
        Cache: Cache,
        DataReader: DataReader,
        Model: Model
    });
})(jQuery);
(function ($, unefined) {
    var kendo = window.kendo,
        Observable = kendo.Observable,
        ObservableObject = kendo.data.ObservableObject,
        ObservableArray = kendo.data.ObservableArray,
        toString = {}.toString,
        binders = {},
        Class = kendo.Class,
        innerText,
        proxy = $.proxy,
        VALUE = "value",
        SOURCE = "source",
        CHECKED = "checked",
        CHANGE = "change";

    (function() {
        var a = document.createElement("a");
        if (a.innerText !== undefined) {
            innerText = "innerText";
        } else if (a.textContent !== undefined) {
            innerText = "textContent";
        }
    })();

    var Binding = Observable.extend( {
        init: function(source, path) {
            var that = this;

            Observable.fn.init.call(that);

            that.source = source;
            that.path = path;
            that.dependencies = {};
            that.dependencies[path] = true;
            that.observable = that.source instanceof Observable;

            that._access = function(e) {
                that.dependencies[e.field] = true;
            };

            if (that.observable) {
                that._change = function(e) {
                    that.change(e);
                };

                that.source.bind(CHANGE, that._change);
            }
        },

        change: function(e) {
            var dependency,
                idx,
                ch,
                that = this;

            if (that.path === "this") {
                that.trigger(CHANGE, e);
            } else {
                for (dependency in that.dependencies) {
                    idx = dependency.indexOf(e.field);

                    if (idx === 0) {
                       ch = dependency.charAt(e.field.length);

                       if (!ch || ch === "." || ch === "[") {
                            that.trigger(CHANGE, e);
                            break;
                       }
                    }
                }
            }
        },

        start: function() {
            if (this.observable) {
                this.source.bind("get", this._access);
            }
        },

        stop: function() {
            if (this.observable) {
                this.source.unbind("get", this._access);
            }
        },

        get: function() {
            var that = this,
                source = that.source,
                index,
                path = that.path,
                result = source;

            that.start();

            if (that.observable) {
                result = source.get(path);

                // Traverse the observable hierarchy if the binding is not resolved at the current level.
                while (result === undefined && source) {
                    source = source.parent();

                    if (source instanceof ObservableObject) {
                        result = source.get(path);
                    }
                }

                // If the result is a function - invoke it
                if (typeof result === "function") {
                    index = path.lastIndexOf(".");

                    // If the function is a member of a nested observable object make that nested observable the context (this) of the function
                    if (index > 0) {
                        source = source.get(path.substring(0, index));
                    }

                    // Set the context (this) of the function
                    result = proxy(result, source);

                    // Invoke the function
                    result = result(that.source);
                }

                // If the binding is resolved by a parent object
                if (source && source !== that.source) {

                    that.currentSource = source; // save parent object

                    // Listen for changes in the parent object
                    source.unbind(CHANGE, that._change)
                          .bind(CHANGE, that._change);
                }
            }

            that.stop();

            return result;
        },

        set: function(value) {
            var that = this,
                source = that.currentSource || that.source;

            source.set(that.path, value);
        },

        destroy: function() {
            if (this.observable) {
                this.source.unbind(CHANGE, this._change);
            }
        }
    });

    var EventBinding = Binding.extend( {
        get: function() {
            var source = this.source,
                path = this.path,
                handler;

            handler = source.get(path);

            while (!handler && source) {
                source = source.parent();
                if (source instanceof ObservableObject) {
                    handler = source.get(path);
                }
            }

            return proxy(handler, source);
        }
    });

    var TemplateBinding = Binding.extend( {
        init: function(source, path, template) {
            var that = this;

            Binding.fn.init.call(that, source, path);

            that.template = template;
        },

        render: function(value) {
            var html;

            this.start();

            html = kendo.render(this.template, value);

            this.stop();

            return html;
        }
    });

    var Binder = Class.extend({
        init: function(element, bindings, options) {
            this.element = element;
            this.bindings = bindings;
            this.options = options;
        },

        bind: function(binding, attribute) {
            var that = this;

            binding = attribute ? binding[attribute] : binding;

            binding.bind(CHANGE, function(e) {
                that.refresh(attribute || e);
            });

            that.refresh(attribute);
        },

        destroy: function() {
        }
    });

    binders.attr = Binder.extend({
        refresh: function(key) {
            this.element.setAttribute(key, this.bindings.attr[key].get());
        }
    });

    binders.style = Binder.extend({
        refresh: function(key) {
            this.element.style[key] = this.bindings.style[key].get();
        }
    });

    binders.enabled = Binder.extend({
        refresh: function() {
            if (this.bindings.enabled.get()) {
                this.element.removeAttribute("disabled");
            } else {
                this.element.setAttribute("disabled", "disabled");
            }
        }
    });

    binders.disabled = Binder.extend({
        refresh: function() {
            if (this.bindings.disabled.get()) {
                this.element.setAttribute("disabled", "disabled");
            } else {
                this.element.removeAttribute("disabled");
            }
        }
    });

    binders.events = Binder.extend({
        init: function(element, bindings, options) {
            Binder.fn.init.call(this, element, bindings, options);
            this.handlers = {};
        },

        refresh: function(key) {
            var element = $(this.element),
                binding = this.bindings.events[key],
                handler = this.handlers[key];

            if (handler) {
                element.off(key, handler);
            }

            handler = this.handlers[key] = binding.get();

            element.on(key, binding.source, handler);
        },

        destroy: function() {
            var element = $(this.element),
                handler;

            for (handler in this.handlers) {
                element.off(handler, this.handlers[handler]);
            }
        }
    });

    binders.text = Binder.extend({
        refresh: function() {
            var text = this.bindings.text.get();

            if (text == null) {
                text = "";
            }

            this.element[innerText] = text;
        }
    });

    binders.visible = Binder.extend({
        refresh: function() {
            if (this.bindings.visible.get()) {
                this.element.style.display = "";
            } else {
                this.element.style.display = "none";
            }
        }
    });

    binders.invisible = Binder.extend({
        refresh: function() {
            if (!this.bindings.invisible.get()) {
                this.element.style.display = "";
            } else {
                this.element.style.display = "none";
            }
        }
    });

    binders.html = Binder.extend({
        refresh: function() {
            this.element.innerHTML = this.bindings.html.get();
        }
    });

    binders.value = Binder.extend({
        init: function(element, bindings, options) {
            Binder.fn.init.call(this, element, bindings, options);

            this._change = proxy(this.change, this);
            this.eventName = options.valueUpdate || CHANGE;

            $(this.element).on(this.eventName, this._change);

            this._initChange = false;
        },

        change: function() {
            this._initChange = this.eventName != CHANGE;
            this.bindings[VALUE].set(this.element.value);
            this._initChange = false;
        },

        refresh: function() {
            if (!this._initChange) {
                var value = this.bindings[VALUE].get();

                if (value == null) {
                    value = "";
                }

                this.element.value = value;
            }

            this._initChange = false;
        },

        destroy: function() {
            $(this.element).off(this.eventName, this._change);
        }
    });

    binders.source = Binder.extend({
        init: function(element, bindings, options) {
            Binder.fn.init.call(this, element, bindings, options);
        },

        refresh: function(e) {
            var that = this,
                source = that.bindings.source.get();

            if (source instanceof ObservableArray) {
                e = e || {};

                if (e.action == "add") {
                    that.add(e.index, e.items);
                } else if (e.action == "remove") {
                    that.remove(e.index, e.items);
                } else if (e.action != "itemchange") {
                    that.render();
                }
            } else {
                that.render();
            }
        },

        container: function() {
            var element = this.element;

            if (element.nodeName.toLowerCase() == "table") {
                if (!element.tBodies[0]) {
                    element.appendChild(document.createElement("tbody"));
                }
                element = element.tBodies[0];
            }

            return element;
        },

        template: function() {
            var options = this.options,
                template = options.template,
                nodeName = this.container().nodeName.toLowerCase();

            if (!template) {
                if (nodeName == "select") {
                    if (options.valueField || options.textField) {
                        template = kendo.format('<option value="#:{0}#">#:{1}#</option>',
                            options.valueField || options.textField, options.textField || options.valueField);
                    } else {
                        template = "<option>#:data#</option>";
                    }
                } else if (nodeName == "tbody") {
                    template = "<tr><td>#:data#</td></tr>";
                } else if (nodeName == "ul" || nodeName == "ol") {
                    template = "<li>#:data#</li>";
                } else {
                    template = "#:data#";
                }

                template = kendo.template(template);
            }

            return template;
        },

        destroy: function() {
            var source = this.bindings.source.get();

            source.unbind(CHANGE, this._change);
        },

        add: function(index, items) {
            var element = this.container(),
                idx,
                length,
                child,
                clone = element.cloneNode(false),
                reference = element.children[index];

            $(clone).html(kendo.render(this.template(), items));

            if (clone.children.length) {
                for (idx = 0, length = items.length; idx < length; idx++) {
                    child = clone.children[0];
                    element.insertBefore(child, reference || null);
                    bindElement(child, items[idx], this.options.roles);
                }
            }
        },

        remove: function(index, items) {
            var idx,
            element = this.container();

            for (idx = 0; idx < items.length; idx++) {
                element.removeChild(element.children[index]);
            }
        },

        render: function() {
            var source = this.bindings.source.get(),
                 idx,
                 length,
                 element = this.container(),
                 template = this.template(),
                 parent;

            if (!(source instanceof ObservableArray) && toString.call(source) !== "[object Array]") {
                if (source.parent) {
                    parent = source.parent;
                }

                source = new ObservableArray([source]);

                if (source.parent) {
                    source.parent = parent;
                }
            }

            if (this.bindings.template) {
                $(element).html(this.bindings.template.render(source));

                if (element.children.length) {
                    for (idx = 0, length = source.length; idx < length; idx++) {
                        bindElement(element.children[idx], source[idx], this.options.roles);
                    }
                }
            }
            else {
                $(element).html(kendo.render(template, source));
            }
        }
    });

    binders.input = {
        checked: Binder.extend({
            init: function(element, bindings, options) {
                Binder.fn.init.call(this, element, bindings, options);
                this._change = proxy(this.change, this);

                $(this.element).change(this._change);
            },
            change: function() {
                var element = this.element;
                var value = this.value();

                if (element.type == "radio") {
                    this.bindings[CHECKED].set(value);
                } else if (element.type == "checkbox") {
                    var source = this.bindings[CHECKED].get();
                    var index;

                    if (source instanceof ObservableArray) {
                        value = this.element.value;

                        if (value !== "on" && value !== "off") {
                            index = source.indexOf(value);
                            if (index > -1) {
                                source.splice(index, 1);
                            } else {
                                source.push(value);
                            }
                        }
                    } else {
                        this.bindings[CHECKED].set(value);
                    }
                }
            },

            refresh: function() {
                var value = this.bindings[CHECKED].get(),
                    source = value,
                    element = this.element;

                if (element.type == "checkbox") {
                    if (source instanceof ObservableArray) {
                        value = this.element.value;
                        if (source.indexOf(value) >= 0) {
                            value = true;
                        }
                    }

                    element.checked = value === true;
                } else if (element.type == "radio" && value != null) {
                    if (element.value === value.toString()) {
                        element.checked = true;
                    }
                }
            },

            value: function() {
                var element = this.element,
                    value = element.value;

                if (element.type == "checkbox") {
                    value = element.checked;
                }

                return value;
            },
            destroy: function() {
                $(this.element).off(CHANGE, this._change);
            }
        })
    };

    binders.select = {
        value: Binder.extend({
            init: function(target, bindings, options) {
                Binder.fn.init.call(this, target, bindings, options);

                this._change = proxy(this.change, this);
                $(this.element).change(this._change);
            },

            change: function() {
                var values = [],
                    element = this.element,
                    source,
                    field = this.options.valueField || this.options.textField,
                    option,
                    valueIndex,
                    value,
                    idx,
                    length;

                for (idx = 0, length = element.options.length; idx < length; idx++) {
                    option = element.options[idx];

                    if (option.selected) {
                        value = option.attributes.value;

                        if (value && value.specified) {
                            value = option.value;
                        } else {
                            value = option.text;
                        }

                        values.push(value);
                    }
                }

                if (field) {
                    source = this.bindings.source.get();
                    for (valueIndex = 0; valueIndex < values.length; valueIndex++) {
                        for (idx = 0, length = source.length; idx < length; idx++) {
                            if (source[idx].get(field) == values[valueIndex]) {
                                values[valueIndex] = source[idx];
                                break;
                            }
                        }
                    }
                }

                value = this.bindings[VALUE].get();
                if (value instanceof ObservableArray) {
                    value.splice.apply(value, [0, value.length].concat(values));
                } else if (value instanceof ObservableObject || !field) {
                    this.bindings[VALUE].set(values[0]);
                } else {
                    this.bindings[VALUE].set(values[0].get(field));
                }
            },
            refresh: function() {
                var optionIndex,
                    element = this.element,
                    options = element.options,
                    value = this.bindings[VALUE].get(),
                    values = value,
                    field = this.options.valueField || this.options.textField,
                    optionValue;

                if (!(values instanceof ObservableArray)) {
                    values = new ObservableArray([value]);
                }

                for (var valueIndex = 0; valueIndex < values.length; valueIndex++) {
                    value = values[valueIndex];

                    if (field && value instanceof ObservableObject) {
                        value = value.get(field);
                    }

                    for (optionIndex = 0; optionIndex < options.length; optionIndex++) {
                        optionValue = options[optionIndex].value;
                        if (optionValue === "" && value !== "") {
                            optionValue = options[optionIndex].text;
                        }

                        if (optionValue == value) {
                            options[optionIndex].selected = true;
                        }
                    }
                }
            },
            destroy: function() {
                $(this.element).off(CHANGE, this._change);
            }
        })
    };

    binders.widget = {
        events : Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);
                this.widget = widget;
                this.handlers = {};
            },

            refresh: function(key) {
                var binding = this.bindings.events[key],
                    handler = this.handlers[key];

                if (handler) {
                    this.widget.unbind(key, handler);
                }

                handler = binding.get();

                this.handlers[key] = function(e) {
                    e.data = binding.source;

                    handler(e);

                    if (e.data === binding.source) {
                        delete e.data;
                    }
                };

                this.widget.bind(key, this.handlers[key]);
            },

            destroy: function() {
                var handler;

                for (handler in this.handlers) {
                    this.widget.unbind(handler, this.handlers[handler]);
                }
            }
        }),

        checked: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
                this._change = proxy(this.change, this);
                this.widget.bind(CHANGE, this._change);
            },
            change: function() {
                this.bindings[CHECKED].set(this.value());
            },

            refresh: function() {
                this.widget.check(this.bindings[CHECKED].get() === true);
            },

            value: function() {
                var element = this.element,
                    value = element.value;

                if (value == "on" || value == "off") {
                    value = element.checked;
                }

                return value;
            },

            destroy: function() {
                this.widget.unbind(CHANGE, this._change);
            }
        }),

        visible: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
            },

            refresh: function() {
                var visible = this.bindings.visible.get();
                this.widget.wrapper[0].style.display = visible ? "" : "none";
            }
        }),

        invisible: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
            },

            refresh: function() {
                var invisible = this.bindings.invisible.get();
                this.widget.wrapper[0].style.display = invisible ? "none" : "";
            }
        }),

        enabled: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
            },

            refresh: function() {
                if (this.widget.enable) {
                    this.widget.enable(this.bindings.enabled.get());
                }
            }
        }),

        disabled: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
            },

            refresh: function() {
                if (this.widget.enable) {
                    this.widget.enable(!this.bindings.disabled.get());
                }
            }
        }),

        source: Binder.extend({
            init: function(widget, bindings, options) {
                var that = this;

                Binder.fn.init.call(that, widget.element[0], bindings, options);

                that.widget = widget;
                that._dataBinding = proxy(that.dataBinding, that);
                that._dataBound = proxy(that.dataBound, that);
                that._itemChange = proxy(that.itemChange, that);
            },

            itemChange: function(e) {
                bindElement(e.item[0], e.data, (e.ns || kendo.ui).roles);
            },

            dataBinding: function() {
                var idx,
                    length,
                    widget = this.widget,
                    items = widget.items();

                for (idx = 0, length = items.length; idx < length; idx++) {
                    unbindElementTree(items[idx]);
                }
            },

            dataBound: function(e) {
                var idx,
                    length,
                    widget = this.widget,
                    items = widget.items(),
                    dataSource = widget.dataSource,
                    view = dataSource.view(),
                    ns = e.ns || kendo.ui,
                    groups = dataSource.group() || [];

                if (items.length) {
                    if (groups.length) {
                        view = flattenGroups(view);
                    }

                    for (idx = 0, length = view.length; idx < length; idx++) {
                        bindElement(items[idx], view[idx], ns.roles);
                    }
                }
            },

            refresh: function(e) {
                var that = this,
                    source,
                    widget = that.widget;

                e = e || {};

                if (!e.action) {
                    that.destroy();

                    widget.bind("dataBinding", that._dataBinding);
                    widget.bind("dataBound", that._dataBound);
                    widget.bind("itemChange", that._itemChange);

                    if (widget.dataSource instanceof kendo.data.DataSource) {
                        source = that.bindings.source.get();
                        if (source instanceof kendo.data.DataSource) {
                            widget.setDataSource(source);
                        } else {
                            widget.dataSource.data(source);
                        }
                    }
                }
            },

            destroy: function() {
                var widget = this.widget;

                widget.unbind("dataBinding", this._dataBinding);
                widget.unbind("dataBound", this._dataBound);
                widget.unbind("itemChange", this._itemChange);
            }
        }),

        value: Binder.extend({
            init: function(widget, bindings, options) {
                Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
                this._change = $.proxy(this.change, this);
                this.widget.first(CHANGE, this._change);

                var value = this.bindings.value.get();
                this._valueIsObservableObject = value == null || value instanceof ObservableObject;
            },

            change: function() {
                var value = this.widget.value();
                var idx, length;

                var field = this.options.dataValueField || this.options.dataTextField;

                if (field) {
                    var source,
                        isObservableObject = this._valueIsObservableObject;

                    if (this.bindings.source) {
                        source = this.bindings.source.get();
                    }

                    if (value === "" && isObservableObject) {
                        value = null;
                    } else {
                        if (!source || source instanceof kendo.data.DataSource) {
                            source = this.widget.dataSource.view();
                        }

                        for (idx = 0, length = source.length; idx < length; idx++) {
                            if (source[idx].get(field) == value) {
                                if (isObservableObject) {
                                    value = source[idx];
                                } else {
                                    value = source[idx].get(field);
                                }
                                break;
                            }
                        }
                    }
                }

                this.bindings.value.set(value);
            },

            refresh: function() {
                var field = this.options.dataValueField || this.options.dataTextField;
                var value = this.bindings.value.get();

                if (field && value instanceof ObservableObject) {
                    value = value.get(field);
                }

                this.widget.value(value);
            },

            destroy: function() {
                this.widget.unbind(CHANGE, this._change);
            }
        })
    };

    var BindingTarget = Class.extend( {
        init: function(target, options) {
            this.target = target;
            this.options = options;
            this.toDestroy = [];
        },

        bind: function(bindings) {
            var nodeName = this.target.nodeName.toLowerCase(),
                key,
                hasValue,
                hasSource,
                specificBinders = binders[nodeName] || {};

            for (key in bindings) {
                if (key == VALUE) {
                    hasValue = true;
                } else if (key == SOURCE) {
                    hasSource = true;
                } else {
                    this.applyBinding(key, bindings, specificBinders);
                }
            }

            if (hasSource) {
                this.applyBinding(SOURCE, bindings, specificBinders);
            }

            if (hasValue) {
                this.applyBinding(VALUE, bindings, specificBinders);
            }
        },

        applyBinding: function(name, bindings, specificBinders) {
            var binder = specificBinders[name] || binders[name],
                toDestroy = this.toDestroy,
                attribute,
                binding = bindings[name];

            if (binder) {
                binder = new binder(this.target, bindings, this.options);

                toDestroy.push(binder);

                if (binding instanceof Binding) {
                    binder.bind(binding);
                    toDestroy.push(binding);
                } else {
                    for (attribute in binding) {
                        binder.bind(binding, attribute);
                        toDestroy.push(binding[attribute]);
                    }
                }
            } else if (name !== "template") {
                throw new Error("The " + name + " binding is not supported by the " + this.target.nodeName.toLowerCase() + " element");
            }
        },

        destroy: function() {
            var idx,
                length,
                toDestroy = this.toDestroy;

            for (idx = 0, length = toDestroy.length; idx < length; idx++) {
                toDestroy[idx].destroy();
            }
        }
    });

    var WidgetBindingTarget = BindingTarget.extend( {
        bind: function(bindings) {
            var that = this,
                binding,
                hasValue = false,
                hasSource = false;

            for (binding in bindings) {
                if (binding == VALUE) {
                    hasValue = true;
                } else if (binding == SOURCE) {
                    hasSource = true;
                } else {
                    that.applyBinding(binding, bindings);
                }
            }

            if (hasSource) {
                that.applyBinding(SOURCE, bindings);
            }

            if (hasValue) {
                that.applyBinding(VALUE, bindings);
            }
        },

        applyBinding: function(name, bindings) {
            var binder = binders.widget[name],
                toDestroy = this.toDestroy,
                attribute,
                binding = bindings[name];

            if (binder) {
                binder = new binder(this.target, bindings, this.target.options);

                toDestroy.push(binder);


                if (binding instanceof Binding) {
                    binder.bind(binding);
                    toDestroy.push(binding);
                } else {
                    for (attribute in binding) {
                        binder.bind(binding, attribute);
                        toDestroy.push(binding[attribute]);
                    }
                }
            } else {
                throw new Error("The " + name + " binding is not supported by the " + this.target.options.name + " widget");
            }
        }
    });

    function flattenGroups(data) {
        var idx, length, result = [];

        for (idx = 0, length = data.length; idx < length; idx++) {
            if (data[idx].hasSubgroups) {
                result = result.concat(flattenGroups(data[idx].items));
            } else {
                result = result.concat(data[idx].items);
            }
        }
        return result;
    }

    function bindingTargetForRole(role, element, roles) {
        var type = roles[role];

        if (type) {
            return new WidgetBindingTarget(kendo.initWidget(element, type.options, roles));
        }
    }

    var keyValueRegExp = /[A-Za-z0-9_\-]+:(\{([^}]*)\}|[^,}]+)/g,
        whiteSpaceRegExp = /\s/g;

    function parseBindings(bind) {
        var result = {},
            idx,
            length,
            token,
            colonIndex,
            key,
            value,
            tokens;

        tokens = bind.match(keyValueRegExp);

        for (idx = 0, length = tokens.length; idx < length; idx++) {
            token = tokens[idx];
            colonIndex = token.indexOf(":");

            key = token.substring(0, colonIndex);
            value = token.substring(colonIndex + 1);

            if (value.charAt(0) == "{") {
                value = parseBindings(value);
            }

            result[key] = value;
        }

        return result;
    }

    function createBindings(bindings, source, type) {
        var binding,
            result = {};

        for (binding in bindings) {
            result[binding] = new type(source, bindings[binding]);
        }

        return result;
    }

    function bindElement(element, source, roles) {
        var role = element.getAttribute("data-" + kendo.ns + "role"),
            idx,
            bind = element.getAttribute("data-" + kendo.ns + "bind"),
            children = element.children,
            deep = true,
            bindings,
            options = {},
            target;

        if (role || bind) {
            unbindElement(element);
        }

        if (role) {
            target = bindingTargetForRole(role, element, roles);
        }

        if (bind) {
            bind = parseBindings(bind.replace(whiteSpaceRegExp, ""));

            if (!target) {
                options = kendo.parseOptions(element, {textField: "", valueField: "", template: "", valueUpdate: CHANGE});
                options.roles = roles;
                target = new BindingTarget(element, options);
            }

            target.source = source;

            bindings = createBindings(bind, source, Binding);

            if (options.template) {
                bindings.template = new TemplateBinding(source, "", options.template);
            }

            if (bindings.click) {
                bind.events = bind.events || {};
                bind.events.click = bind.click;
                delete bindings.click;
            }

            if (bindings.source) {
                deep = false;
            }

            if (bind.attr) {
                bindings.attr = createBindings(bind.attr, source, Binding);
            }

            if (bind.style) {
                bindings.style = createBindings(bind.style, source, Binding);
            }

            if (bind.events) {
                bindings.events = createBindings(bind.events, source, EventBinding);
            }

            target.bind(bindings);
        }

        if (target) {
            element.kendoBindingTarget = target;
        }

        if (deep && children) {
            for (idx = 0; idx < children.length; idx++) {
                bindElement(children[idx], source, roles);
            }
        }
    }

    function bind(dom, object) {
        var idx,
            length,
            roles = kendo.rolesFromNamespaces([].slice.call(arguments, 2));

        object = kendo.observable(object);
        dom = $(dom);

        for (idx = 0, length = dom.length; idx < length; idx++ ) {
            bindElement(dom[idx], object, roles);
        }
    }

    function unbindElement(element) {
        var bindingTarget = element.kendoBindingTarget;

        if (bindingTarget) {
            bindingTarget.destroy();

            if ($.support.deleteExpando) {
                delete element.kendoBindingTarget;
            } else if (element.removeAttribute) {
                element.removeAttribute("kendoBindingTarget");
            } else {
                element.kendoBindingTarget = null;
            }
        }
    }

    function unbindElementTree(element) {
        var idx,
            length,
            children = element.children;

        unbindElement(element);

        if (children) {
            for (idx = 0, length = children.length; idx < length; idx++) {
                unbindElementTree(children[idx]);
            }
        }
    }

    function unbind(dom) {
        var idx, length;

        dom = $(dom);

        for (idx = 0, length = dom.length; idx < length; idx++ ) {
            unbindElementTree(dom[idx]);
        }
    }

    function notify(widget, namespace) {
        var element = widget.element,
            bindingTarget = element[0].kendoBindingTarget;

        if (bindingTarget) {
            bind(element, bindingTarget.source, namespace);
        }
    }

    kendo.unbind = unbind;
    kendo.bind = bind;
    kendo.data.binders = binders;
    kendo.data.Binder = Binder;
    kendo.notify = notify;

    kendo.observable = function(object) {
        if (!(object instanceof ObservableObject)) {
            object = new ObservableObject(object);
        }

        return object;
    };

})(jQuery);
(function ($, undefined) {

    // Imports ================================================================
    var doc = document,
        kendo = window.kendo,
        dataviz = kendo.dataviz = {},
        Class = kendo.Class,
        template = kendo.template,
        map = $.map,
        noop = $.noop,
        indexOf = $.inArray,
        math = Math,
        deepExtend = kendo.deepExtend;

    var renderTemplate = function(definition) {
        return template(definition, { useWithBlock: false, paramName: "d" });
    };

    var CSS_PREFIX = "k-";

    // Constants ==============================================================
    var ANIMATION_STEP = 10,
        AXIS_LABEL_CLICK = "axisLabelClick",
        BASELINE_MARKER_SIZE = 1,
        BLACK = "#000",
        BOTTOM = "bottom",
        CENTER = "center",
        COORD_PRECISION = 3,
        CLIP = "clip",
        DEFAULT_FONT = "12px sans-serif",
        DEFAULT_HEIGHT = 400,
        DEFAULT_PRECISION = 6,
        DEFAULT_WIDTH = 600,
        DEGREE = math.PI / 180,
        FADEIN = "fadeIn",
        FORMAT_REGEX = /\{\d+:?/,
        HEIGHT = "height",
        ID_PREFIX = "k",
        INITIAL_ANIMATION_DURATION = 600,
        LEFT = "left",
        LINEAR = "linear",
        MAX_VALUE = Number.MAX_VALUE,
        MIN_VALUE = -Number.MAX_VALUE,
        NONE = "none",
        OUTSIDE = "outside",
        RADIAL = "radial",
        RIGHT = "right",
        SWING = "swing",
        TOP = "top",
        UNDEFINED = "undefined",
        UPPERCASE_REGEX = /([A-Z])/g,
        WIDTH = "width",
        WHITE = "#fff",
        X = "x",
        Y = "y",
        ZERO_THRESHOLD = 0.2;

    function getSpacing(value) {
        var spacing = { top: 0, right: 0, bottom: 0, left: 0 };

        if (typeof(value) === "number") {
            spacing[TOP] = spacing[RIGHT] = spacing[BOTTOM] = spacing[LEFT] = value;
        } else {
            spacing[TOP] = value[TOP] || 0;
            spacing[RIGHT] = value[RIGHT] || 0;
            spacing[BOTTOM] = value[BOTTOM] || 0;
            spacing[LEFT] = value[LEFT] || 0;
        }

        return spacing;
    }

    // Geometric primitives ===================================================
    var Point2D = Class.extend({
        init: function(x, y) {
            var point = this;
            point.x = round(x || 0, COORD_PRECISION);
            point.y = round(y || 0, COORD_PRECISION);
        }
    });

    var Box2D = Class.extend({
        init: function(x1, y1, x2, y2) {
            var box = this;
            box.x1 = x1 || 0;
            box.x2 = x2 || 0;
            box.y1 = y1 || 0;
            box.y2 = y2 || 0;
        },

        width: function() {
            return this.x2 - this.x1;
        },

        height: function() {
            return this.y2 - this.y1;
        },

        translate: function(dx, dy) {
            var box = this;

            box.x1 += dx;
            box.x2 += dx;
            box.y1 += dy;
            box.y2 += dy;

            return box;
        },

        move: function(x, y) {
            var box = this,
                height = box.height(),
                width = box.width();

            box.x1 = x;
            box.y1 = y;
            box.x2 = box.x1 + width;
            box.y2 = box.y1 + height;

            return box;
        },

        wrap: function(targetBox) {
            var box = this;

            box.x1 = math.min(box.x1, targetBox.x1);
            box.y1 = math.min(box.y1, targetBox.y1);
            box.x2 = math.max(box.x2, targetBox.x2);
            box.y2 = math.max(box.y2, targetBox.y2);

            return box;
        },

        wrapPoint: function(point) {
            this.wrap(new Box2D(point.x, point.y, point.x, point.y));

            return this;
        },

        snapTo: function(targetBox, axis) {
            var box = this;

            if (axis == X || !axis) {
                box.x1 = targetBox.x1;
                box.x2 = targetBox.x2;
            }

            if (axis == Y || !axis) {
                box.y1 = targetBox.y1;
                box.y2 = targetBox.y2;
            }

            return box;
        },

        alignTo: function(targetBox, anchor) {
            var box = this,
                height = box.height(),
                width = box.width(),
                axis = anchor == TOP || anchor == BOTTOM ? Y : X,
                offset = axis == Y ? height : width;

            if (anchor === CENTER) {
                var targetCenter = targetBox.center();
                var center = box.center();

                box.x1 += targetCenter.x - center.x;
                box.y1 += targetCenter.y - center.y;
            } else if (anchor === TOP || anchor === LEFT) {
                box[axis + 1] = targetBox[axis + 1] - offset;
            } else {
                box[axis + 1] = targetBox[axis + 2];
            }

            box.x2 = box.x1 + width;
            box.y2 = box.y1 + height;

            return box;
        },

        shrink: function(dw, dh) {
            var box = this;

            box.x2 -= dw;
            box.y2 -= dh;

            return box;
        },

        expand: function(dw, dh) {
            this.shrink(-dw, -dh);
            return this;
        },

        pad: function(padding) {
            var box = this,
                spacing = getSpacing(padding);

            box.x1 -= spacing.left;
            box.x2 += spacing.right;
            box.y1 -= spacing.top;
            box.y2 += spacing.bottom;

            return box;
        },

        unpad: function(padding) {
            var box = this,
                spacing = getSpacing(padding);

            spacing.left = -spacing.left;
            spacing.top = -spacing.top;
            spacing.right = -spacing.right;
            spacing.bottom = -spacing.bottom;

            return box.pad(spacing);
        },

        clone: function() {
            var box = this;

            return new Box2D(box.x1, box.y1, box.x2, box.y2);
        },

        center: function() {
            var box = this;

            return {
                x: box.x1 + box.width() / 2,
                y: box.y1 + box.height() / 2
            };
        },

        containsPoint: function(x, y) {
            var box = this;

            return x >= box.x1 && x <= box.x2 &&
                   y >= box.y1 && y <= box.y2;
        },

        points: function() {
            var box = this;

            return [
                new Point2D(box.x1, box.y1),
                new Point2D(box.x2, box.y1),
                new Point2D(box.x2, box.y2),
                new Point2D(box.x1, box.y2)
            ];
        },

        getHash: function() {
            var box = this;

            return [box.x1, box.y1, box.x2, box.y2].join(",");
        }
    });

    var Ring = Class.extend({
        init: function(center, innerRadius, radius, startAngle, angle) {
            var ring = this;

            ring.c = center;
            ring.ir = innerRadius;
            ring.r = radius;
            ring.startAngle = startAngle;
            ring.angle = angle;
        },

        clone: function() {
            var r = this;
            return new Ring(r.c, r.ir, r.r, r.startAngle, r.angle);
        },

        middle: function() {
            return this.startAngle + this.angle / 2;
        },

        radius: function(newRadius, innerRadius) {
            var that = this;

            if (innerRadius) {
                that.ir = newRadius;
            } else {
                that.r = newRadius;
            }

            return that;
        },

        point: function(angle, innerRadius) {
            var ring = this,
                radianAngle = angle * DEGREE,
                ax = math.cos(radianAngle),
                ay = math.sin(radianAngle),
                radius = innerRadius ? ring.ir : ring.r,
                x = ring.c.x - (ax * radius),
                y = ring.c.y - (ay * radius);

            return new Point2D(x, y);
        },

        getBBox: function() {
            var ring = this,
                box = new Box2D(MAX_VALUE, MAX_VALUE, MIN_VALUE, MIN_VALUE),
                sa = round(ring.startAngle % 360),
                ea = round((sa + ring.angle) % 360),
                innerRadius = ring.ir,
                allAngles = [0, 90, 180, 270, sa, ea].sort(numericComparer),
                saIndex = indexOf(sa, allAngles),
                eaIndex = indexOf(ea, allAngles),
                angles,
                i,
                point;

            if (sa == ea) {
                angles = allAngles;
            } else {
                if (saIndex < eaIndex) {
                    angles = allAngles.slice(saIndex, eaIndex + 1);
                } else {
                    angles = [].concat(
                        allAngles.slice(0, eaIndex + 1),
                        allAngles.slice(saIndex, allAngles.length)
                    );
                }
            }

            for (i = 0; i < angles.length; i++) {
                point = ring.point(angles[i]);
                box.wrapPoint(point);
                box.wrapPoint(point, innerRadius);
            }

            if (!innerRadius) {
                box.wrapPoint(ring.c);
            }

            return box;
        },

        expand: function(value) {
            this.r += value;
            return this;
        }
    });

    var Sector = Ring.extend({
        init: function(center, radius, startAngle, angle) {
            Ring.fn.init.call(this, center, 0, radius, startAngle, angle);
        },

        expand: function(value) {
            return Ring.fn.expand.call(this, value);
        },

        clone: function() {
            var sector = this;
            return new Sector(sector.c, sector.r, sector.startAngle, sector.angle);
        },

        radius: function(newRadius) {
            return Ring.fn.radius.call(this, newRadius);
        },

        point: function(angle) {
            return Ring.fn.point.call(this, angle);
        }
    });

    var Pin = Class.extend({
        init: function(options) {
            deepExtend(this, {
                height: 40,
                rotation: 90,
                radius: 10,
                arcAngle: 10
            }, options);
        }
    });

    // View-Model primitives ==================================================
    var ChartElement = Class.extend({
        init: function(options) {
            var element = this;
            element.children = [];

            element.options = deepExtend({}, element.options, options);
        },

        reflow: function(targetBox) {
            var element = this,
                children = element.children,
                box,
                i,
                currentChild;

            for (i = 0; i < children.length; i++) {
                currentChild = children[i];

                currentChild.reflow(targetBox);
                box = box ? box.wrap(currentChild.box) : currentChild.box.clone();
            }

            element.box = box;
        },

        getViewElements: function(view) {
            var element = this,
                options = element.options,
                modelId = options.modelId,
                viewElements = [],
                root,
                children = element.children,
                i,
                child,
                childrenCount = children.length;

            for (i = 0; i < childrenCount; i++) {
                child = children[i];

                if (!child.discoverable) {
                    child.options = deepExtend(child.options, { modelId: modelId });
                }

                viewElements.push.apply(
                    viewElements, child.getViewElements(view));
            }

            if (element.discoverable) {
                root = element.getRoot();
                if (root) {
                    root.modelMap[modelId] = element;
                }
            }

            return viewElements;
        },

        makeDiscoverable: function() {
            var element = this,
                options = element.options;

            options.modelId = uniqueId();
            element.discoverable = true;
        },

        getRoot: function() {
            var parent = this.parent;

            return parent ? parent.getRoot() : null;
        },

        translateChildren: function(dx, dy) {
            var element = this,
                children = element.children,
                childrenCount = children.length,
                i;

            for (i = 0; i < childrenCount; i++) {
                children[i].box.translate(dx, dy);
            }
        },

        append: function() {
            var element = this,
                i,
                length = arguments.length;

            append(element.children, arguments);

            for (i = 0; i < length; i++) {
                arguments[i].parent = element;
            }
        }
    });

    var RootElement = ChartElement.extend({
        init: function(options) {
            var root = this;

            // Logical tree ID to element map
            root.modelMap = {};

            ChartElement.fn.init.call(root, options);
        },

        options: {
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            background: WHITE,
            border: {
                color: BLACK,
                width: 0
            },
            margin: getSpacing(5),
            zIndex: -2
        },

        reflow: function() {
            var root = this,
                options = root.options,
                children = root.children,
                currentBox = new Box2D(0, 0, options.width, options.height);

            root.box = currentBox.unpad(options.margin);

            for (var i = 0; i < children.length; i++) {
                children[i].reflow(currentBox);
                currentBox = boxDiff(currentBox, children[i].box);
            }
        },

        getViewElements: function(view) {
            var root = this,
                options = root.options,
                border = options.border || {},
                box = root.box.clone().pad(options.margin).unpad(border.width),
                elements = [
                        view.createRect(box, {
                            stroke: border.width ? border.color : "",
                            strokeWidth: border.width,
                            dashType: border.dashType,
                            fill: options.background,
                            zIndex: options.zIndex })
                    ];

            return elements.concat(
                ChartElement.fn.getViewElements.call(root, view)
            );
        },

        getRoot: function() {
            return this;
        }
    });

    var BoxElement = ChartElement.extend({
        init: function(options) {
            ChartElement.fn.init.call(this, options);
        },

        options: {
            align: LEFT,
            vAlign: TOP,
            margin: {},
            padding: {},
            border: {
                color: BLACK,
                width: 0
            },
            background: "",
            width: 0,
            height: 0,
            visible: true
        },

        reflow: function(targetBox) {
            var element = this,
                box,
                contentBox,
                options = element.options,
                children = element.children,
                margin = getSpacing(options.margin),
                padding = getSpacing(options.padding),
                border = options.border,
                borderWidth = border.width;

            ChartElement.fn.reflow.call(element, targetBox);

            if (children.length === 0) {
                box = element.box = new Box2D(0, 0, options.width, options.height);
            } else {
                box = element.box;
            }

            contentBox = element.contentBox = box.clone();

            box.pad(padding).pad(borderWidth).pad(margin);

            element.align(targetBox, X, options.align);
            element.align(targetBox, Y, options.vAlign);

            element.paddingBox = box.clone().unpad(margin).unpad(borderWidth);

            element.translateChildren(
                box.x1 - contentBox.x1 + margin.left + borderWidth + padding.left,
                box.y1 - contentBox.y1 + margin.top + borderWidth + padding.top);
        },

        align: function(targetBox, axis, alignment) {
            var element = this,
                box = element.box,
                c1 = axis + 1,
                c2 = axis + 2,
                sizeFunc = axis === X ? WIDTH : HEIGHT,
                size = box[sizeFunc]();

            if (inArray(alignment, [LEFT, TOP])) {
                box[c1] = targetBox[c1];
                box[c2] = box[c1] + size;
            } else if (inArray(alignment, [RIGHT, BOTTOM])) {
                box[c2] = targetBox[c2];
                box[c1] = box[c2] - size;
            } else if (alignment == CENTER) {
                box[c1] = targetBox[c1] + (targetBox[sizeFunc]() - size) / 2;
                box[c2] = box[c1] + size;
            }
        },

        hasBox: function() {
            var options = this.options;
            return options.border.width || options.background;
        },

        getViewElements: function(view, renderOptions) {
            var boxElement = this,
                options = boxElement.options,
                elements = [];

            if (!options.visible) {
                return [];
            }

            if (boxElement.hasBox()) {
                elements.push(
                    view.createRect(
                        boxElement.paddingBox,
                        deepExtend(boxElement.elementStyle(), renderOptions)
                    )
                );
            }

            return elements.concat(
                ChartElement.fn.getViewElements.call(boxElement, view)
            );
        },

        elementStyle: function() {
            var boxElement = this,
                options = boxElement.options,
                border = options.border || {};

            return {
                id: options.id,
                stroke: border.width ? border.color : "",
                strokeWidth: border.width,
                dashType: border.dashType,
                strokeOpacity: options.opacity,
                fill: options.background,
                fillOpacity: options.opacity,
                animation: options.animation,
                zIndex: options.zIndex,
                data: { modelId: options.modelId }
            };
        }
    });

    var Text = ChartElement.extend({
        init: function(content, options) {
            var text = this;

            ChartElement.fn.init.call(text, options);

            // Calculate size
            text.content = content;
            text.reflow(new Box2D());
        },

        options: {
            font: DEFAULT_FONT,
            color: BLACK,
            align: LEFT,
            vAlign: ""
        },

        reflow: function(targetBox) {
            var text = this,
                options = text.options,
                size,
                margin;

            size = options.size =
                measureText(text.content, { font: options.font }, options.rotation);

            text.baseline = size.baseline;

            if (options.align == LEFT) {
                text.box = new Box2D(
                    targetBox.x1, targetBox.y1,
                    targetBox.x1 + size.width, targetBox.y1 + size.height);
            } else if (options.align == RIGHT) {
                text.box = new Box2D(
                    targetBox.x2 - size.width, targetBox.y1,
                    targetBox.x2, targetBox.y1 + size.height);
            } else if (options.align == CENTER) {
                margin = (targetBox.width() - size.width) / 2;
                text.box = new Box2D(
                    round(targetBox.x1 + margin, COORD_PRECISION), targetBox.y1,
                    round(targetBox.x2 - margin, COORD_PRECISION), targetBox.y1 + size.height);
            }

            if (options.vAlign == CENTER) {
                margin = (targetBox.height() - size.height) /2;
                text.box = new Box2D(
                    text.box.x1, targetBox.y1 + margin,
                    text.box.x2, targetBox.y2 - margin);
            } else if (options.vAlign == BOTTOM) {
                text.box = new Box2D(
                    text.box.x1, targetBox.y2 - size.height,
                    text.box.x2, targetBox.y2);
            } else if (options.vAlign == TOP) {
                text.box = new Box2D(
                    text.box.x1, targetBox.y1,
                    text.box.x2, targetBox.y1 + size.height);
            }
        },

        getViewElements: function(view) {
            var text = this,
                options = text.options;

            ChartElement.fn.getViewElements.call(this, view);

            return [
                view.createText(text.content,
                    deepExtend({}, options, {
                        x: text.box.x1, y: text.box.y1,
                        baseline: text.baseline,
                        data: { modelId: options.modelId }
                    })
                )
            ];
        }
    });

    var TextBox = BoxElement.extend({
        init: function(content, options) {
            var textBox = this,
                text;

            BoxElement.fn.init.call(textBox, options);
            options = textBox.options;

            text = new Text(content, deepExtend({ }, options, { align: LEFT, vAlign: TOP }));
            textBox.append(text);

            if (textBox.hasBox()) {
                text.options.id = uniqueId();
            }

            // Calculate size
            textBox.reflow(new Box2D());
        }
    });

    var Title = ChartElement.extend({
        init: function(options) {
            var title = this;
            ChartElement.fn.init.call(title, options);

            title.append(
                new TextBox(title.options.text, deepExtend({}, title.options, {
                    vAlign: title.options.position
                }))
            );
        },

        options: {
            text: "",
            color: BLACK,
            position: TOP,
            align: CENTER,
            margin: getSpacing(5),
            padding: getSpacing(5)
        },

        reflow: function(targetBox) {
            var title = this;

            ChartElement.fn.reflow.call(title, targetBox);
            title.box.snapTo(targetBox, X);
        }
    });

    var AxisLabel = TextBox.extend({
        init: function(value, index, dataItem, options) {
            var label = this,
                text = value;

            if (options.template) {
                label.template = template(options.template);
                text = label.template({ value: value, dataItem: dataItem });
            } else if (options.format) {
                text = label.formatValue(value, options);
            }

            label.text = text;
            label.value = value;
            label.index = index;
            label.dataItem = dataItem;

            TextBox.fn.init.call(label, text,
                deepExtend({ id: uniqueId() }, options)
            );

            label.makeDiscoverable();
        },

        formatValue: function(value, options) {
            return autoFormat(options.format, value);
        },

        click: function(widget, e) {
            var label = this;

            widget.trigger(AXIS_LABEL_CLICK, {
                element: $(e.target),
                value: label.value,
                text: label.text,
                index: label.index,
                dataItem: label.dataItem,
                axis: label.parent.options
            });
        }
    });

    var Axis = ChartElement.extend({
        init: function(options) {
            var axis = this;

            ChartElement.fn.init.call(axis, options);

            if (!axis.options.visible) {
                axis.options = deepExtend({}, axis.options, {
                    labels: {
                        visible: false
                    },
                    line: {
                        visible: false
                    },
                    margin: 0,
                    majorTickSize: 0,
                    minorTickSize: 0
                });
            }

            axis.options.minorTicks = deepExtend({}, {
                color: axis.options.line.color,
                width: axis.options.line.width,
                visible: axis.options.minorTickType != NONE
            }, axis.options.minorTicks, {
                size: axis.options.minorTickSize,
                align: axis.options.minorTickType
            });

            axis.options.majorTicks = deepExtend({}, {
                color: axis.options.line.color,
                width: axis.options.line.width,
                visible: axis.options.majorTickType != NONE
            }, axis.options.majorTicks, {
                size: axis.options.majorTickSize,
                align: axis.options.majorTickType
            });

            axis.createLabels();
            axis.createTitle();
        },

        options: {
            labels: {
                visible: true,
                rotation: 0,
                mirror: false,
                step: 1,
                skip: 0
            },
            line: {
                width: 1,
                color: BLACK,
                visible: true
            },
            title: {
                visible: true,
                position: CENTER
            },
            majorTicks: {
                align: OUTSIDE,
                size: 4
            },
            minorTicks: {
                align: OUTSIDE,
                size: 3
            },
            axisCrossingValue: 0,
            majorTickType: OUTSIDE,
            minorTickType: NONE,
            minorGridLines: {
                visible: false,
                width: 1,
                color: BLACK
            },
            // TODO: Move to line or labels options
            margin: 5,
            visible: true,
            reverse: false,

            _alignLines: true,
            _labelsOnTicks: true
        },

        // abstract labelsCount(): Number
        // abstract createAxisLabel(index, options): AxisLabel

        createLabels: function() {
            var axis = this,
                options = axis.options,
                align = options.vertical ? RIGHT : CENTER,
                labelOptions = deepExtend({ }, options.labels, {
                    align: align, zIndex: options.zIndex,
                    modelId: options.modelId
                }),
                step = labelOptions.step;

            axis.labels = [];

            if (labelOptions.visible) {
                var labelsCount = axis.labelsCount(),
                    label,
                    i;

                for (i = labelOptions.skip; i < labelsCount; i += step) {
                    label = axis.createAxisLabel(i, labelOptions);
                    axis.append(label);
                    axis.labels.push(label);
                }
            }
        },

        lineBox: function() {
            var axis = this,
                options = axis.options,
                box = axis.box,
                vertical = options.vertical,
                labels = axis.labels,
                labelSize = vertical ? HEIGHT : WIDTH,
                labelsOnTicks = options._labelsOnTicks,
                mirror = options.labels.mirror,
                axisX = mirror ? box.x1 : box.x2,
                axisY = mirror ? box.y2 : box.y1,
                startMargin = 0,
                endMargin = 0;

            if (labelsOnTicks && labels.length > 1) {
                startMargin = labels[0].box[labelSize]() / 2;
                endMargin = last(labels).box[labelSize]() / 2;
            }

            return vertical ?
                new Box2D(axisX, box.y1 + startMargin, axisX, box.y2 - endMargin) :
                new Box2D(box.x1 + startMargin, axisY, box.x2 - endMargin, axisY);
        },

        createTitle: function() {
            var axis = this,
                options = axis.options,
                titleOptions = deepExtend({
                    rotation: options.vertical ? -90 : 0,
                    text: "",
                    zIndex: 1
                }, options.title),
                title;

            if (titleOptions.visible && titleOptions.text) {
                title = new TextBox(titleOptions.text, titleOptions);
                axis.append(title);
                axis.title = title;
            }
        },

        renderTicks: function(view) {
            var axis = this,
                ticks = [],
                options = axis.options,
                lineBox = axis.lineBox(),
                mirror = options.labels.mirror,
                tickX, tickY, pos,
                lineOptions;

            function render(tickPositions, unit, tick, visible, skipUnit) {
                var skip = skipUnit / unit, i,
                    count = tickPositions.length;

                if (visible) {
                    for (i = 0; i < count; i++) {
                        if (i % skip === 0) {
                            continue;
                        }

                        tickX = mirror ? lineBox.x2 : lineBox.x2 - tick.size;
                        tickY = mirror ? lineBox.y1 - tick.size : lineBox.y1;
                        pos = tickPositions[i];
                        lineOptions = {
                                strokeWidth: tick.width,
                                stroke: tick.color,
                                align: options._alignLines
                            };

                        if (options.vertical) {
                            ticks.push(view.createLine(
                                tickX, pos, tickX + tick.size, pos, lineOptions));
                        } else {
                            ticks.push(view.createLine(
                                pos, tickY, pos, tickY + tick.size, lineOptions));
                        }
                    }
                }
            }

            render(
                axis.getMajorTickPositions(), options.majorUnit,
                options.majorTicks, options.majorTicks.visible
            );

            render(
                axis.getMinorTickPositions(), options.minorUnit,
                options.minorTicks, options.minorTicks.visible,
                options.majorTicks.visible ? options.majorUnit : 0
            );

            return ticks;
        },

        getViewElements: function(view) {
            var axis = this,
                options = axis.options,
                line = options.line,
                lineBox = axis.lineBox(),
                childElements = ChartElement.fn.getViewElements.call(axis, view),
                lineOptions;

            if (line.width > 0 && line.visible) {
                lineOptions = {
                    strokeWidth: line.width,
                    stroke: line.color,
                    dashType: line.dashType,
                    zIndex: line.zIndex,
                    align: options._alignLines
                };

                childElements.push(view.createLine(
                    lineBox.x1, lineBox.y1, lineBox.x2, lineBox.y2,
                    lineOptions));

                append(childElements, axis.renderTicks(view));
            }

            append(childElements, axis.renderPlotBands(view));

            return childElements;
        },

        getActualTickSize: function () {
            var axis = this,
                options = axis.options,
                tickSize = 0;

            if (options.majorTicks.visible && options.minorTicks.visible) {
                tickSize = math.max(options.majorTicks.size, options.minorTicks.size);
            } else if (options.majorTicks.visible) {
                tickSize = options.majorTicks.size;
            } else if (options.minorTicks.visible) {
                tickSize = options.minorTicks.size;
            }

            return tickSize;
        },

        renderPlotBands: function(view) {
            var axis = this,
                options = axis.options,
                plotBands = options.plotBands || [],
                vertical = options.vertical,
                result = [],
                plotArea = axis.parent,
                slotX,
                slotY,
                from,
                to;

            if (plotBands.length) {
                result = map(plotBands, function(item) {
                    from = defined(item.from) ? item.from : MIN_VALUE;
                    to = defined(item.to) ? item.to : MAX_VALUE;

                    if (vertical) {
                        slotX = plotArea.axisX.lineBox();
                        slotY = axis.getSlot(item.from, item.to);
                    } else {
                        slotX = axis.getSlot(item.from, item.to);
                        slotY = plotArea.axisY.lineBox();
                    }

                    return view.createRect(
                            new Box2D(slotX.x1, slotY.y1, slotX.x2, slotY.y2),
                            { fill: item.color, fillOpacity: item.opacity, zIndex: -1 });
                });
            }

            return result;
        },

        reflow: function(box) {
            var axis = this,
                options = axis.options,
                vertical = options.vertical,
                labels = axis.labels,
                count = labels.length,
                space = axis.getActualTickSize() + options.margin,
                maxLabelHeight = 0,
                maxLabelWidth = 0,
                title = axis.title,
                label,
                i;

            for (i = 0; i < count; i++) {
                label = labels[i];
                maxLabelHeight = math.max(maxLabelHeight, label.box.height());
                maxLabelWidth = math.max(maxLabelWidth, label.box.width());
            }

            if (title) {
                if (vertical) {
                    maxLabelWidth += title.box.width();
                } else {
                    maxLabelHeight += title.box.height();
                }
            }

            if (vertical) {
                axis.box = new Box2D(
                    box.x1, box.y1,
                    box.x1 + maxLabelWidth + space, box.y2
                );
            } else {
                axis.box = new Box2D(
                    box.x1, box.y1,
                    box.x2, box.y1 + maxLabelHeight + space
                );
            }

            axis.arrangeTitle();
            axis.arrangeLabels(maxLabelWidth, maxLabelHeight);
        },

        arrangeLabels: function(maxLabelWidth, maxLabelHeight) {
            var axis = this,
                options = axis.options,
                labelOptions = options.labels,
                labels = axis.labels,
                labelsBetweenTicks = !options._labelsOnTicks,
                vertical = options.vertical,
                lineBox = axis.lineBox(),
                mirror = options.labels.mirror,
                tickPositions = axis.getMajorTickPositions(),
                labelOffset = axis.getActualTickSize() + options.margin,
                labelBox,
                labelY,
                i;

            for (i = 0; i < labels.length; i++) {
                var label = labels[i],
                    tickIx = labelOptions.skip + labelOptions.step * i,
                    labelSize = vertical ? label.box.height() : label.box.width(),
                    labelPos = tickPositions[tickIx] - (labelSize / 2),
                    firstTickPosition,
                    nextTickPosition,
                    middle,
                    labelX;

                if (vertical) {
                    if (labelsBetweenTicks) {
                        firstTickPosition = tickPositions[tickIx];
                        nextTickPosition = tickPositions[tickIx + 1];

                        middle = firstTickPosition + (nextTickPosition - firstTickPosition) / 2;
                        labelPos = middle - (labelSize / 2);
                    }

                    labelX = lineBox.x2;

                    if (mirror) {
                        labelX += labelOffset;
                    } else {
                        labelX -= labelOffset + label.box.width();
                    }

                    labelBox = label.box.move(labelX, labelPos);
                } else {
                    if (labelsBetweenTicks) {
                        firstTickPosition = tickPositions[tickIx];
                        nextTickPosition = tickPositions[tickIx + 1];
                    } else {
                        firstTickPosition = labelPos;
                        nextTickPosition = labelPos + labelSize;
                    }

                    labelY = lineBox.y1;

                    if (mirror) {
                        labelY -= labelOffset + label.box.height();
                    } else {
                        labelY += labelOffset;
                    }

                    labelBox = new Box2D(firstTickPosition, labelY,
                                         nextTickPosition, labelY + label.box.height());
                }

                label.reflow(labelBox);
            }
        },

        arrangeTitle: function() {
            var axis = this,
                options = axis.options,
                mirror = options.labels.mirror,
                vertical = options.vertical,
                title = axis.title;

            if (title) {
                if (vertical) {
                    title.options.align = mirror ? RIGHT : LEFT;
                    title.options.vAlign = title.options.position;
                } else {
                    title.options.align = title.options.position;
                    title.options.vAlign = mirror ? TOP : BOTTOM;
                }

                title.reflow(axis.box);
            }
        },

        alignTo: function(secondAxis) {
            var axis = this,
                lineBox = secondAxis.lineBox(),
                vertical = axis.options.vertical,
                pos = vertical ? Y : X;

            axis.box.snapTo(lineBox, pos);
            if (vertical) {
                axis.box.shrink(0, axis.lineBox().height() - lineBox.height());
            } else {
                axis.box.shrink(axis.lineBox().width() - lineBox.width(), 0);
            }
            axis.box[pos + 1] -= axis.lineBox()[pos + 1] - lineBox[pos + 1];
            axis.box[pos + 2] -= axis.lineBox()[pos + 2] - lineBox[pos + 2];
        }
    });

    var NumericAxis = Axis.extend({
        init: function(seriesMin, seriesMax, options) {
            var axis = this,
                defaultOptions = axis.initDefaults(seriesMin, seriesMax, options);

            Axis.fn.init.call(axis, defaultOptions);
        },

        options: {
            type: "numeric",
            min: 0,
            max: 1,
            vertical: true,
            majorGridLines: {
                visible: true,
                width: 1,
                color: BLACK
            },
            zIndex: 1
        },

        initDefaults: function(seriesMin, seriesMax, options) {
            var axis = this,
                autoMin = axis.autoAxisMin(seriesMin, seriesMax),
                autoMax = axis.autoAxisMax(seriesMin, seriesMax),
                majorUnit = autoMajorUnit(autoMin, autoMax),
                autoOptions = {
                    majorUnit: majorUnit
                },
                userSetLimits;

            if (autoMin < 0) {
                autoMin -= majorUnit;
            }

            if (autoMax > 0) {
                autoMax += majorUnit;
            }

            autoOptions.min = floor(autoMin, majorUnit);
            autoOptions.max = ceil(autoMax, majorUnit);

            if (options) {
                userSetLimits = defined(options.min) || defined(options.max);
                if (userSetLimits) {
                    if (options.min === options.max) {
                        if (options.min > 0) {
                            options.min = 0;
                        } else {
                            options.max = 1;
                        }
                    }
                }

                if (options.majorUnit) {
                    autoOptions.min = floor(autoOptions.min, options.majorUnit);
                    autoOptions.max = ceil(autoOptions.max, options.majorUnit);
                } else if (userSetLimits) {
                    options = deepExtend(autoOptions, options);

                    // Determine an auto major unit after min/max have been set
                    autoOptions.majorUnit = autoMajorUnit(options.min, options.max);
                }
            }

            autoOptions.minorUnit = (options.majorUnit || autoOptions.majorUnit) / 5;

            return deepExtend(autoOptions, options);
        },

        range: function() {
            var options = this.options;
            return { min: options.min, max: options.max };
        },

        autoAxisMax: function(min, max) {
            if (!min && !max) {
                return 1;
            }

            var axisMax;
            if (min <= 0 && max <= 0) {
                max = min == max ? 0 : max;

                var diff = math.abs((max - min) / max);
                if(diff > ZERO_THRESHOLD) {
                    return 0;
                }

                axisMax = max - ((min - max) / 2);
            } else {
                min = min == max ? 0 : min;
                axisMax = max;
            }

            return axisMax;
        },

        autoAxisMin: function(min, max) {
            if (!min && !max) {
                return 0;
            }

            var axisMin;
            if (min >= 0 && max >= 0) {
                min = min == max ? 0 : min;

                var diff = (max - min) / max;
                if(diff > ZERO_THRESHOLD) {
                    return 0;
                }

                axisMin = min - ((max - min) / 2);
            } else {
                max = min == max ? 0 : max;
                axisMin = min;
            }

            return axisMin;
        },

        getDivisions: function(stepValue) {
            var options = this.options,
                range = options.max - options.min;

            return math.floor(round(range / stepValue, COORD_PRECISION)) + 1;
        },

        getTickPositions: function(stepValue) {
            var axis = this,
                options = axis.options,
                vertical = options.vertical,
                reverse = options.reverse,
                lineBox = axis.lineBox(),
                lineSize = vertical ? lineBox.height() : lineBox.width(),
                range = options.max - options.min,
                scale = lineSize / range,
                step = stepValue * scale,
                divisions = axis.getDivisions(stepValue),
                dir = (vertical ? -1 : 1) * (reverse ? -1 : 1),
                startEdge = dir === 1 ? 1 : 2,
                pos = lineBox[(vertical ? Y : X) + startEdge],
                positions = [],
                i;

            for (i = 0; i < divisions; i++) {
                positions.push(round(pos, COORD_PRECISION));
                pos = pos + step * dir;
            }

            return positions;
        },

        getMajorTickPositions: function() {
            var axis = this;

            return axis.getTickPositions(axis.options.majorUnit);
        },

        getMinorTickPositions: function() {
            var axis = this;

            return axis.getTickPositions(axis.options.minorUnit);
        },

        getSlot: function(a, b) {
            var axis = this,
                options = axis.options,
                reverse = options.reverse,
                vertical = options.vertical,
                valueAxis = vertical ? Y : X,
                lineBox = axis.lineBox(),
                lineStart = lineBox[valueAxis + (reverse ? 2 : 1)],
                lineSize = vertical ? lineBox.height() : lineBox.width(),
                dir = reverse ? -1 : 1,
                step = dir * (lineSize / (options.max - options.min)),
                p1,
                p2,
                slotBox = new Box2D(lineBox.x1, lineBox.y1, lineBox.x1, lineBox.y1);

            a = defined(a) ? a : options.axisCrossingValue;
            b = defined(b) ? b : options.axisCrossingValue;
            a = math.max(math.min(a, options.max), options.min);
            b = math.max(math.min(b, options.max), options.min);

            if (vertical) {
                p1 = options.max - math.max(a, b);
                p2 = options.max - math.min(a, b);
            } else {
                p1 = math.min(a, b) - options.min;
                p2 = math.max(a, b) - options.min;
            }

            slotBox[valueAxis + 1] = lineStart + step * (reverse ? p2 : p1);
            slotBox[valueAxis + 2] = lineStart + step * (reverse ? p1 : p2);

            return slotBox;
        },

        getValue: function(point) {
            var axis = this,
                options = axis.options,
                reverse = options.reverse,
                vertical = options.vertical,
                max = options.max * 1,
                min = options.min * 1,
                valueAxis = vertical ? Y : X,
                lineBox = axis.lineBox(),
                lineStart = lineBox[valueAxis + (reverse ? 2 : 1)],
                lineSize = vertical ? lineBox.height() : lineBox.width(),
                dir = reverse ? -1 : 1,
                offset = dir * (point[valueAxis] - lineStart),
                step = (max - min) / lineSize,
                valueOffset = offset * step,
                value;

            if (offset < 0 || offset > lineSize) {
                return null;
            }

            value = vertical ?
                    max - valueOffset :
                    min + valueOffset;

            return round(value, DEFAULT_PRECISION);
        },

        labelsCount: function() {
            return this.getDivisions(this.options.majorUnit);
        },

        createAxisLabel: function(index, labelOptions) {
            var axis = this,
                options = axis.options,
                value = round(options.min + (index * options.majorUnit), DEFAULT_PRECISION);

            return new AxisLabel(value, index, null, labelOptions);
        }
    });

    // View base classes ======================================================
    var ViewElement = Class.extend({
        init: function(options) {
            var element = this;
            element.children = [];
            element.options = deepExtend({}, element.options, options);
        },

        render: function() {
            return this.template(this);
        },

        renderContent: function() {
            var element = this,
                output = "",
                sortedChildren = element.sortChildren(),
                childrenCount = sortedChildren.length,
                i;

            for (i = 0; i < childrenCount; i++) {
                output += sortedChildren[i].render();
            }

            return output;
        },

        sortChildren: function() {
            var element = this,
                children = element.children,
                length,
                i;

            for (i = 0, length = children.length; i < length; i++) {
                children[i]._childIndex = i;
            }

            return children.slice(0).sort(element.compareChildren);
        },

        refresh: $.noop,

        compareChildren: function(a, b) {
            var aValue = a.options.zIndex || 0,
                bValue = b.options.zIndex || 0;

            if (aValue !== bValue) {
                return aValue - bValue;
            }

            return a._childIndex - b._childIndex;
        },

        renderAttr: function (name, value) {
            return defined(value) ? " " + name + "='" + value + "' " : "";
        },

        renderDataAttributes: function() {
            var element = this,
                data = element.options.data,
                key,
                attr,
                output = "";

            for (key in data) {
                attr = "data-" + key.replace(UPPERCASE_REGEX, "-$1").toLowerCase();
                output += element.renderAttr(attr, data[key]);
            }

            return output;
        }
    });

    var ViewBase = ViewElement.extend({
        init: function(options) {
            var view = this;

            ViewElement.fn.init.call(view, options);

            view.definitions = {};
            view.decorators = [];
            view.animations = [];
        },

        renderDefinitions: function() {
            var definitions = this.definitions,
                definitionId,
                output = "";

            for (definitionId in definitions) {
                if (definitions.hasOwnProperty(definitionId)) {
                    output += definitions[definitionId].render();
                }
            }

            return output;
        },

        decorate: function(element) {
            var decorators = this.decorators,
                i,
                length = decorators.length,
                currentDecorator;

            for (i = 0; i < length; i++) {
                currentDecorator = decorators[i];
                this._decorateChildren(currentDecorator, element);
                element = currentDecorator.decorate.call(currentDecorator, element);
            }

            return element;
        },

        _decorateChildren: function(decorator, element) {
            var view = this,
                children = element.children,
                i,
                length = children.length;

            for (i = 0; i < length; i++) {
                view._decorateChildren(decorator, children[i]);
                children[i] = decorator.decorate.call(decorator, children[i]);
            }
        },

        setupAnimations: function() {
            var animations = this.animations,
                i,
                count = animations.length;

            for (i = 0; i < count; i++) {
                animations[i].setup();
            }
        },

        playAnimations: function() {
            var animations = this.animations;

            while (animations.length > 0) {
                animations.shift().play();
            }
        },

        buildGradient: function(options) {
            var view = this,
                cache = view._gradientCache,
                hashCode,
                overlay,
                definition;

            if (!cache) {
                cache = view._gradientCache = [];
            }

            if (options) {
                hashCode = getHash(options);
                overlay = cache[hashCode];
                definition = dataviz.Gradients[options.gradient];
                if (!overlay && definition) {
                    overlay = deepExtend({ id: uniqueId() }, definition, options);
                    cache[hashCode] = overlay;
                }
            }

            return overlay;
        }
    });

    dataviz.Gradients = {
        glass: {
            type: LINEAR,
            rotation: 0,
            stops: [{
                offset: 0,
                color: WHITE,
                opacity: 0
            }, {
                offset: 0.25,
                color: WHITE,
                opacity: 0.3
            }, {
                offset: 1,
                color: WHITE,
                opacity: 0
            }]
        },
        sharpBevel: {
            type: RADIAL,
            stops: [{
                offset: 0,
                color: WHITE,
                opacity: 0.55
            }, {
                offset: 0.65,
                color: WHITE,
                opacity: 0
            }, {
                offset: 0.95,
                color: WHITE,
                opacity: 0.25
            }]
        },
        roundedBevel: {
            type: RADIAL,
            stops: [{
                offset: 0.33,
                color: WHITE,
                opacity: 0.06
            }, {
                offset: 0.83,
                color: WHITE,
                opacity: 0.2
            }, {
                offset: 0.95,
                color: WHITE,
                opacity: 0
            }]
        },
        roundedGlass: {
            type: RADIAL,
            supportVML: false,
            stops: [{
                offset: 0,
                color: WHITE,
                opacity: 0
            }, {
                offset: 0.5,
                color: WHITE,
                opacity: 0.3
            }, {
                offset: 0.99,
                color: WHITE,
                opacity: 0
            }]
        },
        sharpGlass: {
            type: RADIAL,
            supportVML: false,
            stops: [{
                offset: 0,
                color: WHITE,
                opacity: 0.2
            }, {
                offset: 0.15,
                color: WHITE,
                opacity: 0.15
            }, {
                offset: 0.17,
                color: WHITE,
                opacity: 0.35
            }, {
                offset: 0.85,
                color: WHITE,
                opacity: 0.05
            }, {
                offset: 0.87,
                color: WHITE,
                opacity: 0.15
            }, {
                offset: 0.99,
                color: WHITE,
                opacity: 0
            }]
        }
    };

    // Animations =============================================================
    var ElementAnimation = Class.extend({
        init: function(element, options) {
            var anim = this;

            anim.options = deepExtend({}, anim.options, options);
            anim.element = element;
        },

        options: {
            duration: INITIAL_ANIMATION_DURATION,
            easing: SWING
        },

        play: function() {
            var anim = this,
                options = anim.options,
                element = anim.element,
                delay = options.delay || 0,
                start = +new Date() + delay,
                duration = options.duration,
                finish = start + duration,
                domElement = doc.getElementById(element.options.id),
                easing = $.easing[options.easing],
                wallTime,
                time,
                pos,
                easingPos;

            setTimeout(function() {
                var loop = function() {
                    if (anim._stopped) {
                        return;
                    }

                    wallTime = +new Date();
                    time = math.min(wallTime - start, duration);
                    pos = time / duration;
                    easingPos = easing(pos, time, 0, 1, duration);

                    anim.step(easingPos);

                    element.refresh(domElement);

                    if (wallTime < finish) {
                        requestAnimFrame(loop, domElement);
                    }
                };

                loop();
            }, delay);
        },

        abort: function() {
            this._stopped = true;
        },

        setup: noop,

        step: noop
    });

    var FadeAnimation = ElementAnimation.extend({
        options: {
            duration: 200,
            easing: LINEAR
        },

        setup: function() {
            var anim = this,
                options = anim.element.options;

            anim.targetFillOpacity = options.fillOpacity;
            anim.targetStrokeOpacity = options.strokeOpacity;
            options.fillOpacity = options.strokeOpacity = 0;
        },

        step: function(pos) {
            var anim = this,
                options = anim.element.options;

            options.fillOpacity = pos * anim.targetFillOpacity;
            options.strokeOpacity = pos * anim.targetStrokeOpacity;
        }
    });

    var ExpandAnimation = ElementAnimation.extend({
        options: {
            size: 0,
            easing: LINEAR
        },

        setup: function() {
            var points = this.element.points;

            points[1].x = points[2].x = points[0].x;
        },

        step: function(pos) {
            var options = this.options,
                size = interpolateValue(0, options.size, pos),
                points = this.element.points;

            // Expands rectangle to the right
            points[1].x = points[2].x = points[0].x + size;
        }
    });

    var RotationAnimation = ElementAnimation.extend({
        options: {
            easing: LINEAR,
            duration: 900
        },

        setup: function() {
            var anim = this,
                element = anim.element,
                elementOptions = element.options,
                options = anim.options,
                center = options.center,
                start, end;

            if (elementOptions.rotation) {
                start = options.startAngle;
                end = elementOptions.rotation[0];

                options.duration = math.max((math.abs(start - end) / options.speed) * 1000, 1);

                anim.endState = end;
                elementOptions.rotation = [
                    start,
                    center.x,
                    center.y
                ];
            }
        },

        step: function(pos) {
            var anim = this,
                element = anim.element;

            if (element.options.rotation) {
                element.options.rotation[0] = interpolateValue(anim.options.startAngle, anim.endState, pos);
            }
        }
    });

    var BarAnimation = ElementAnimation.extend({
        options: {
            easing: SWING
        },

        setup: function() {
            var anim = this,
                element = anim.element,
                points = element.points,
                options = element.options,
                axis = options.vertical ? Y : X,
                stackBase = options.stackBase,
                aboveAxis = options.aboveAxis,
                startPosition,
                endState = anim.endState = {
                    top: points[0].y,
                    right: points[1].x,
                    bottom: points[3].y,
                    left: points[0].x
                };

            if (axis === Y) {
                startPosition = defined(stackBase) ? stackBase :
                    endState[aboveAxis ? BOTTOM : TOP];
            } else {
                startPosition = defined(stackBase) ? stackBase :
                    endState[aboveAxis ? LEFT : RIGHT];
            }

            anim.startPosition = startPosition;

            updateArray(points, axis, startPosition);
        },

        step: function(pos) {
            var anim = this,
                startPosition = anim.startPosition,
                endState = anim.endState,
                element = anim.element,
                points = element.points;

            if (element.options.vertical) {
                points[0].y = points[1].y =
                    interpolateValue(startPosition, endState.top, pos);

                points[2].y = points[3].y =
                    interpolateValue(startPosition, endState.bottom, pos);
            } else {
                points[0].x = points[3].x =
                    interpolateValue(startPosition, endState.left, pos);

                points[1].x = points[2].x =
                    interpolateValue(startPosition, endState.right, pos);
            }
        }
    });

    var BarIndicatorAnimatin = ElementAnimation.extend({
        options: {
            easing: SWING,
            duration: 1000
        },

        setup: function() {
            var anim = this,
                element = anim.element,
                points = element.points,
                options = element.options.animation,
                vertical = options.vertical,
                reverse = options.reverse,
                axis = anim.axis = vertical ? "y" : "x",
                start, end, pos,
                endPosition = anim.options.endPosition,
                initialState = anim.initialState = {
                    top: points[0].y,
                    right: points[1].x,
                    bottom: points[3].y,
                    left: points[0].x
                },
                initial = !defined(anim.options.endPosition);

            if (vertical) {
                pos = reverse ? "y2" : "y1";
                start = initialState[initial && !reverse ? BOTTOM : TOP];
                end = initial ? initialState[reverse ? BOTTOM : TOP] : endPosition[pos];
            } else {
                pos = reverse ? "x1" : "x2";
                start = initialState[initial && !reverse ? LEFT : RIGHT];
                end = initial ? initialState[reverse ? LEFT : RIGHT] : endPosition[pos];
            }

            anim.start = start;
            anim.end = end;

            if (initial) {
                updateArray(points, axis, anim.start);
            } else if (options.speed) {
                anim.options.duration = math.max((math.abs(anim.start - anim.end) / options.speed) * 1000, 1);
            }
        },

        step: function(pos) {
            var anim = this,
                start = anim.start,
                end = anim.end,
                element = anim.element,
                points = element.points,
                axis = anim.axis;

            if (element.options.animation.vertical) {
                points[0][axis] = points[1][axis] =
                    interpolateValue(start, end, pos);
            } else {
                points[1][axis] = points[2][axis] =
                    interpolateValue(start, end, pos);
            }
        }
    });

    var ArrowAnimation = ElementAnimation.extend({
        options: {
            easing: SWING,
            duration: 1000
        },

        setup: function() {
            var anim = this,
                element = anim.element,
                points = element.points,
                options = element.options.animation,
                vertical = options.vertical,
                reverse = options.reverse,
                axis = vertical ? "y" : "x",
                startPos = axis + (reverse ? "1" : "2"),
                endPos = axis + (reverse ? "2" : "1"),
                startPosition = options.startPosition[vertical ? startPos : endPos],
                halfSize = options.size / 2,
                count = points.length,
                initial = !defined(anim.options.endPosition),
                padding = halfSize,
                point,
                end,
                i;

            anim.axis = axis;
            anim.endPositions = [];
            anim.startPositions = [];

            if (!initial) {
                startPosition = points[1][axis];
                end = anim.options.endPosition[vertical ? endPos : startPos];
                if (options.speed) {
                    anim.options.duration = math.max((math.abs(startPosition - end) / options.speed) * 1000, 1);
                }
            }

            for (i = 0; i < count; i++) {
                point = deepExtend({}, points[i]);
                if (initial) {
                    anim.endPositions[i] = point[axis];
                    points[i][axis] = startPosition - padding;
                } else {
                    anim.endPositions[i] = end - padding;
                }
                anim.startPositions[i] = points[i][axis];
                padding -= halfSize;
            }
        },

        step: function(pos) {
            var anim = this,
                startPositions = anim.startPositions,
                endPositions = anim.endPositions,
                element = anim.element,
                points = element.points,
                axis = anim.axis,
                count = points.length,
                i;

            for (i = 0; i < count; i++) {
                points[i][axis] = interpolateValue(startPositions[i], endPositions[i], pos);
            }
        }
    });

    function animationDecorator(animationName, animationType) {
        return Class.extend({
            init: function(view) {
                this.view = view;
            },

            decorate: function(element) {
                var decorator = this,
                    view = decorator.view,
                    animation = element.options.animation,
                    animationObject;

                if (animation && animation.type === animationName && view.options.transitions) {
                    animationObject = element._animation = new animationType(element, animation);
                    view.animations.push(animationObject);
                }

                return element;
            }
        });
    }

    var FadeAnimationDecorator = animationDecorator(FADEIN, FadeAnimation);

    // Helper functions========================================================
    var Color = function(value) {
        var color = this,
            formats = Color.formats,
            re,
            processor,
            parts,
            i,
            channels;

        if (arguments.length === 1) {
            value = color.resolveColor(value);

            for (i = 0; i < formats.length; i++) {
                re = formats[i].re;
                processor = formats[i].process;
                parts = re.exec(value);

                if (parts) {
                    channels = processor(parts);
                    color.r = channels[0];
                    color.g = channels[1];
                    color.b = channels[2];
                }
            }
        } else {
            color.r = arguments[0];
            color.g = arguments[1];
            color.b = arguments[2];
        }

        color.r = color.normalizeByte(color.r);
        color.g = color.normalizeByte(color.g);
        color.b = color.normalizeByte(color.b);
    };

    Color.prototype = {
        toHex: function() {
            var color = this,
                pad = color.padDigit,
                r = color.r.toString(16),
                g = color.g.toString(16),
                b = color.b.toString(16);

            return "#" + pad(r) + pad(g) + pad(b);
        },

        resolveColor: function(value) {
            value = value || BLACK;

            if (value.charAt(0) == "#") {
                value = value.substr(1, 6);
            }

            value = value.replace(/ /g, "");
            value = value.toLowerCase();
            value = Color.namedColors[value] || value;

            return value;
        },

        normalizeByte: function(value) {
            return (value < 0 || isNaN(value)) ? 0 : ((value > 255) ? 255 : value);
        },

        padDigit: function(value) {
            return (value.length === 1) ? "0" + value : value;
        },

        brightness: function(value) {
            var color = this,
                round = math.round;

            color.r = round(color.normalizeByte(color.r * value));
            color.g = round(color.normalizeByte(color.g * value));
            color.b = round(color.normalizeByte(color.b * value));

            return color;
        }
    };

    Color.formats = [{
            re: /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/,
            process: function(parts) {
                return [
                    parseInt(parts[1], 10), parseInt(parts[2], 10), parseInt(parts[3], 10)
                ];
            }
        }, {
            re: /^(\w{2})(\w{2})(\w{2})$/,
            process: function(parts) {
                return [
                    parseInt(parts[1], 16), parseInt(parts[2], 16), parseInt(parts[3], 16)
                ];
            }
        }, {
            re: /^(\w{1})(\w{1})(\w{1})$/,
            process: function(parts) {
                return [
                    parseInt(parts[1] + parts[1], 16),
                    parseInt(parts[2] + parts[2], 16),
                    parseInt(parts[3] + parts[3], 16)
                ];
            }
        }
    ];

    Color.namedColors = {
        aqua: "00ffff", azure: "f0ffff", beige: "f5f5dc",
        black: "000000", blue: "0000ff", brown: "a52a2a",
        coral: "ff7f50", cyan: "00ffff", darkblue: "00008b",
        darkcyan: "008b8b", darkgray: "a9a9a9", darkgreen: "006400",
        darkorange: "ff8c00", darkred: "8b0000", dimgray: "696969",
        fuchsia: "ff00ff", gold: "ffd700", goldenrod: "daa520",
        gray: "808080", green: "008000", greenyellow: "adff2f",
        indigo: "4b0082", ivory: "fffff0", khaki: "f0e68c",
        lightblue: "add8e6", lightgrey: "d3d3d3", lightgreen: "90ee90",
        lightpink: "ffb6c1", lightyellow: "ffffe0", lime: "00ff00",
        limegreen: "32cd32", linen: "faf0e6", magenta: "ff00ff",
        maroon: "800000", mediumblue: "0000cd", navy: "000080",
        olive: "808000", orange: "ffa500", orangered: "ff4500",
        orchid: "da70d6", pink: "ffc0cb", plum: "dda0dd",
        purple: "800080", red: "ff0000", royalblue: "4169e1",
        salmon: "fa8072", silver: "c0c0c0", skyblue: "87ceeb",
        slateblue: "6a5acd", slategray: "708090", snow: "fffafa",
        steelblue: "4682b4", tan: "d2b48c", teal: "008080",
        tomato: "ff6347", turquoise: "40e0d0", violet: "ee82ee",
        wheat: "f5deb3", white: "ffffff", whitesmoke: "f5f5f5",
        yellow: "ffff00", yellowgreen: "9acd32"
    };

    function measureText(text, style, rotation) {
        var styleHash = getHash(style),
            cacheKey = text + styleHash + rotation,
            cachedResult = measureText.cache[cacheKey],
            size = {
                width: 0,
                height: 0,
                baseline: 0
            };

        if (cachedResult) {
            return cachedResult;
        }

        var measureBox = measureText.measureBox,
            baselineMarker = measureText.baselineMarker.cloneNode(false);

        if (!measureBox) {
            measureBox = measureText.measureBox =
                $("<div style='position: absolute; top: -4000px; left: -4000px;" +
                              "line-height: normal; visibility: hidden;' />")
                .appendTo(doc.body)[0];
        }

        for (var styleKey in style) {
            measureBox.style[styleKey] = style[styleKey];
        }
        measureBox.innerHTML = text;
        measureBox.appendChild(baselineMarker);

        if ((text + "").length) {
            size = {
                width: measureBox.offsetWidth - BASELINE_MARKER_SIZE,
                height: measureBox.offsetHeight,
                baseline: baselineMarker.offsetTop + BASELINE_MARKER_SIZE
            };
        }

        if (rotation) {
            var width = size.width,
                height = size.height,
                cx = width / 2,
                cy = height / 2,
                r1 = rotatePoint(0, 0, cx, cy, rotation),
                r2 = rotatePoint(width, 0, cx, cy, rotation),
                r3 = rotatePoint(width, height, cx, cy, rotation),
                r4 = rotatePoint(0, height, cx, cy, rotation);

            size.normalWidth = width;
            size.normalHeight = height;
            size.width = math.max(r1.x, r2.x, r3.x, r4.x) - math.min(r1.x, r2.x, r3.x, r4.x);
            size.height = math.max(r1.y, r2.y, r3.y, r4.y) - math.min(r1.y, r2.y, r3.y, r4.y);
        }

        measureText.cache[cacheKey] = size;

        return size;
    }

    measureText.cache = {};
    measureText.baselineMarker =
        $("<div class='" + CSS_PREFIX + "baseline-marker' " +
            "style='display: inline-block; vertical-align: baseline;" +
            "width: " + BASELINE_MARKER_SIZE + "px; height: " + BASELINE_MARKER_SIZE + "px;" +
            "overflow: hidden;' />")[0];

    function autoMajorUnit(min, max) {
        var diff = max - min;

        if (diff === 0) {
            if (max === 0) {
                return 0.1;
            }

            diff = math.abs(max);
        }

        var scale = math.pow(10, math.floor(math.log(diff) / math.log(10))),
            relativeValue = round((diff / scale), DEFAULT_PRECISION),
            scaleMultiplier = 1;

        if (relativeValue < 1.904762) {
            scaleMultiplier = 0.2;
        } else if (relativeValue < 4.761904) {
            scaleMultiplier = 0.5;
        } else if (relativeValue < 9.523809) {
            scaleMultiplier = 1;
        } else {
            scaleMultiplier = 2;
        }

        return round(scale * scaleMultiplier, DEFAULT_PRECISION);
    }

    function getHash(object) {
        var hash = [];
        for (var key in object) {
            hash.push(key + object[key]);
        }

        return hash.sort().join(" ");
    }

    var uniqueId = (function() {
        // Implements 32-bit Linear feedback shift register
        var lfsr = 1;

        return function() {
            lfsr = ((lfsr >>> 1) ^ (-(lfsr & 1) & 0xD0000001)) >>> 0;
            return ID_PREFIX + lfsr.toString(16);
        };
    })();

    function rotatePoint(x, y, cx, cy, angle) {
        var theta = angle * DEGREE;

        return {
            x: cx + (x - cx) * math.cos(theta) + (y - cy) * math.sin(theta),
            y: cy - (x - cx) * math.sin(theta) + (y - cy) * math.cos(theta)
        };
    }

    function boxDiff(r, s) {
        if (r.x1 == s.x1 && r.y1 == s.y1 && r.x2 == s.x2 && r.y2 == s.y2) {
            return s;
        }

        var a = math.min(r.x1, s.x1),
            b = math.max(r.x1, s.x1),
            c = math.min(r.x2, s.x2),
            d = math.max(r.x2, s.x2),
            e = math.min(r.y1, s.y1),
            f = math.max(r.y1, s.y1),
            g = math.min(r.y2, s.y2),
            h = math.max(r.y2, s.y2),
            result = [];

        // X = intersection, 0-7 = possible difference areas
        // h +-+-+-+
        // . |5|6|7|
        // g +-+-+-+
        // . |3|X|4|
        // f +-+-+-+
        // . |0|1|2|
        // e +-+-+-+
        // . a b c d

        // we'll always have rectangles 1, 3, 4 and 6
        result[0] = new Box2D(b, e, c, f);
        result[1] = new Box2D(a, f, b, g);
        result[2] = new Box2D(c, f, d, g);
        result[3] = new Box2D(b, g, c, h);

        // decide which corners
        if( r.x1 == a && r.y1 == e || s.x1 == a && s.y1 == e )
        { // corners 0 and 7
            result[4] = new Box2D(a, e, b, f);
            result[5] = new Box2D(c, g, d, h);
        }
        else
        { // corners 2 and 5
            result[4] = new Box2D(c, e, d, f);
            result[5] = new Box2D(a, g, b, h);
        }

        return $.grep(result, function(box) {
            return box.height() > 0 && box.width() > 0;
        })[0];
    }

    function supportsSVG() {
        return doc.implementation.hasFeature(
            "http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");
    }

    var requestAnimFrame =
        window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback, element) {
            setTimeout(callback, ANIMATION_STEP);
        };

    function inArray(value, array) {
        return indexOf(value, array) != -1;
    }

    function last(array) {
        return array[array.length - 1];
    }

    function append(first, second) {
        [].push.apply(first, second);
    }

    function ceil(value, step) {
        return round(math.ceil(value / step) * step, DEFAULT_PRECISION);
    }

    function floor(value, step) {
        return round(math.floor(value / step) * step, DEFAULT_PRECISION);
    }

    function round(value, precision) {
        var power = math.pow(10, precision || 0);
        return math.round(value * power) / power;
    }

    function interpolateValue(start, end, progress) {
        return round(start + (end - start) * progress, COORD_PRECISION);
    }

    function defined(value) {
        return typeof value !== UNDEFINED;
    }

    function numericComparer(a, b) {
        return a - b;
    }

    function updateArray(arr, prop, value) {
        var i,
            length = arr.length;

        for(i = 0; i < length; i++) {
            arr[i][prop] = value;
        }
    }

    function autoFormat(format, value) {
        if (format.match(FORMAT_REGEX)) {
            return kendo.format.apply(this, arguments);
        }

        return kendo.toString(value, format);
    }

    // Exports ================================================================
    /**
     * @name kendo.dataviz
     * @namespace Contains Kendo DataViz.
     */
    deepExtend(kendo.dataviz, {
        init: function(element) {
            kendo.init(element, kendo.dataviz.ui);
        },

        /**
         * @name kendo.dataviz.ui
         * @namespace Contains Kendo DataViz UI widgets.
         */
        ui: {
            roles: {},
            themes: {},
            views: [],
            defaultView: function() {
                var i,
                    views = dataviz.ui.views,
                    length = views.length;

                for (i = 0; i < length; i++) {
                    if (views[i].available()) {
                        return views[i];
                    }
                }

                kendo.logToConsole("Warning: KendoUI DataViz cannot render. Possible causes:\n" +
                                    "- The browser does not support SVG or VML. User agent: " + navigator.userAgent + "\n" +
                                    "- The kendo.dataviz.svg.js or kendo.dataviz.vml.js scripts are not loaded");
            },
            registerView: function(viewType) {
                var defaultView = dataviz.ui.views[0];

                if (!defaultView || viewType.preference > defaultView.preference) {
                    dataviz.ui.views.unshift(viewType);
                } else {
                    dataviz.ui.views.push(viewType);
                }
            },
            plugin: function(widget) {
                kendo.ui.plugin(widget, dataviz.ui);
            }
        },

        AXIS_LABEL_CLICK: AXIS_LABEL_CLICK,
        COORD_PRECISION: COORD_PRECISION,
        DEFAULT_PRECISION: DEFAULT_PRECISION,
        DEFAULT_WIDTH: DEFAULT_WIDTH,
        DEFAULT_HEIGHT: DEFAULT_HEIGHT,
        DEFAULT_FONT: DEFAULT_FONT,
        INITIAL_ANIMATION_DURATION: INITIAL_ANIMATION_DURATION,
        CLIP: CLIP,

        Axis: Axis,
        AxisLabel: AxisLabel,
        Box2D: Box2D,
        BoxElement: BoxElement,
        ChartElement: ChartElement,
        Color: Color,
        ElementAnimation:ElementAnimation,
        ExpandAnimation: ExpandAnimation,
        ArrowAnimation: ArrowAnimation,
        BarAnimation: BarAnimation,
        BarIndicatorAnimatin: BarIndicatorAnimatin,
        FadeAnimation: FadeAnimation,
        FadeAnimationDecorator: FadeAnimationDecorator,
        NumericAxis: NumericAxis,
        Point2D: Point2D,
        Ring: Ring,
        Pin: Pin,
        RootElement: RootElement,
        RotationAnimation: RotationAnimation,
        Sector: Sector,
        Text: Text,
        TextBox: TextBox,
        Title: Title,
        ViewBase: ViewBase,
        ViewElement: ViewElement,

        animationDecorator: animationDecorator,
        append: append,
        autoFormat: autoFormat,
        autoMajorUnit: autoMajorUnit,
        defined: defined,
        getSpacing: getSpacing,
        inArray: inArray,
        interpolateValue: interpolateValue,
        last: last,
        measureText: measureText,
        rotatePoint: rotatePoint,
        round: round,
        ceil: ceil,
        floor: floor,
        supportsSVG: supportsSVG,
        renderTemplate: renderTemplate,
        uniqueId: uniqueId
    });

})(jQuery);
(function () {

    // Imports ================================================================
    var kendo = window.kendo,
        dataviz = kendo.dataviz,
        deepExtend = kendo.deepExtend;

    // Constants ==============================================================
    var BAR_GAP = 1.5,
        BAR_SPACING = 0.4,
        BLACK = "#000",
        SANS = "Arial,Helvetica,sans-serif",
        SANS11 = "11px " + SANS,
        SANS12 = "12px " + SANS,
        SANS16 = "16px " + SANS,
        WHITE = "#fff";

    // Chart themes ============================================================
    var chartBaseTheme = {
            title: {
                font: SANS16
            },
            legend: {
                labels: {
                    font: SANS12
                }
            },
            seriesDefaults: {
                labels: {
                    font: SANS11
                },
                donut: {
                    margin: 1
                },
                bubble: {
                    opacity: 0.6,
                    border: {
                        width: 0
                    },
                    labels: {
                        background: "transparent"
                    }
                },
                bar: {
                    gap: BAR_GAP,
                    spacing: BAR_SPACING
                },
                column: {
                    gap: BAR_GAP,
                    spacing: BAR_SPACING
                }
            },
            axisDefaults: {
                labels: {
                    font: SANS12
                },
                title: {
                    font: SANS16,
                    margin: 5
                }
            },
            tooltip: {
                font: SANS12
            }
        };

    var chartThemes = {
        black: deepExtend({}, chartBaseTheme, {
            title: {
                color: WHITE
            },
            legend: {
                labels: {
                    color: WHITE
                }
            },
            seriesDefaults: {
                labels: {
                    color: WHITE
                },
                pie: {
                    overlay: {
                        gradient: "sharpBevel"
                    }
                },
                donut: {
                    overlay: {
                        gradient: "sharpGlass"
                    }
                },
                line: {
                    markers: {
                        background: "#3d3d3d"
                    }
                },
                scatter: {
                    markers: {
                        background: "#3d3d3d"
                    }
                },
                scatterLine: {
                    markers: {
                        background: "#3d3d3d"
                    }
                },
                area: {
                    opacity: 0.4,
                    markers: {
                        visible: false,
                        size: 6
                    }
                }
            },
            chartArea: {
                background: "#3d3d3d"
            },
            seriesColors: ["#0081da", "#3aafff", "#99c900", "#ffeb3d", "#b20753", "#ff4195"],
            categoryAxis: {
                majorGridLines: {
                    visible: true
                }
            },
            axisDefaults: {
                line: {
                    color: "#8e8e8e"
                },
                labels: {
                    color: WHITE
                },
                majorGridLines: {
                    color: "#545454"
                },
                minorGridLines: {
                    color: "#454545"
                },
                title: {
                    color: WHITE
                }
            },
            tooltip: {
                background: "#3d3d3d",
                color: WHITE,
                opacity: 0.8
            }
        }),

        "default": deepExtend({}, chartBaseTheme, {
            title: {
                color: "#8e8e8e"
            },
            legend: {
                labels: {
                    color: "#232323"
                }
            },
            seriesDefaults: {
                labels: {
                    color: BLACK,
                    background: WHITE,
                    opacity: 0.5
                },
                area: {
                    opacity: 0.4,
                    markers: {
                        visible: false,
                        size: 6
                    }
                }
            },
            seriesColors: ["#ff6800", "#a0a700", "#ff8d00", "#678900", "#ffb53c", "#396000"],
            categoryAxis: {
                majorGridLines: {
                    visible: true
                }
            },
            axisDefaults: {
                line: {
                    color: "#8e8e8e"
                },
                labels: {
                    color: "#232323"
                },
                minorGridLines: {
                    color: "#f0f0f0"
                },
                majorGridLines: {
                    color: "#dfdfdf"
                },
                title: {
                    color: "#232323"
                }
            },
            tooltip: {
                background: WHITE,
                color: BLACK,
                opacity: 0.8
            }
        }),

        blueopal: deepExtend({}, chartBaseTheme, {
            title: {
                color: "#293135"
            },
            legend: {
                labels: {
                    color: "#293135"
                }
            },
            seriesDefaults: {
                labels: {
                    color: BLACK,
                    background: WHITE,
                    opacity: 0.5
                },
                area: {
                    opacity: 0.4,
                    markers: {
                        visible: false,
                        size: 6
                    }
                }
            },
            seriesColors: ["#0069a5", "#0098ee", "#7bd2f6", "#ffb800", "#ff8517", "#e34a00"],
            categoryAxis: {
                majorGridLines: {
                    visible: true
                }
            },
            axisDefaults: {
                line: {
                    color: "#9aabb2"
                },
                labels: {
                    color: "#293135"
                },
                majorGridLines: {
                    color: "#c4d0d5"
                },
                minorGridLines: {
                    color: "#edf1f2"
                },
                title: {
                    color: "#293135"
                }
            },
            tooltip: {
                background: WHITE,
                color: BLACK,
                opacity: 0.8
            }
        }),

        silver: deepExtend({}, chartBaseTheme, {
            title: {
                color: "#4e5968"
            },
            legend: {
                labels: {
                    color: "#4e5968"
                }
            },
            seriesDefaults: {
                labels: {
                    color: "#293135",
                    background: "#eaeaec",
                    opacity: 0.5
                },
                line: {
                    markers: {
                        background: "#eaeaec"
                    }
                },
                scatter: {
                    markers: {
                        background: "#eaeaec"
                    }
                },
                scatterLine: {
                    markers: {
                        background: "#eaeaec"
                    }
                },
                pie: {
                    connectors: {
                        color: "#A6B1C0"
                    }
                },
                donut: {
                    connectors: {
                        color: "#A6B1C0"
                    }
                },
                area: {
                    opacity: 0.4,
                    markers: {
                        visible: false,
                        size: 6
                    }
                }
            },
            chartArea: {
                background: "#eaeaec"
            },
            seriesColors: ["#007bc3", "#76b800", "#ffae00", "#ef4c00", "#a419b7", "#430B62"],
            categoryAxis: {
                majorGridLines: {
                    visible: true
                }
            },
            axisDefaults: {
                line: {
                    color: "#a6b1c0"
                },
                labels: {
                    color: "#4e5968"
                },
                majorGridLines: {
                    color: "#dcdcdf"
                },
                minorGridLines: {
                    color: "#eeeeef"
                },
                title: {
                    color: "#4e5968"
                }
            },
            tooltip: {
                background: WHITE,
                color: "#4e5968",
                opacity: 0.8
            }
        }),

        metro: deepExtend({}, chartBaseTheme, {
            title: {
                color: "#777777"
            },
            legend: {
                labels: {
                    color: "#777777"
                }
            },
            seriesDefaults: {
                labels: {
                    color: BLACK
                },
                area: {
                    opacity: 0.4,
                    markers: {
                        visible: false,
                        size: 6
                    }
                }
            },
            seriesColors: ["#25a0da", "#309b46", "#8ebc00", "#ff6900", "#e61e26", "#d8e404", "#16aba9", "#7e51a1", "#313131", "#ed1691"],
            categoryAxis: {
                majorGridLines: {
                    visible: true
                }
            },
            axisDefaults: {
                line: {
                    color: "#c7c7c7"
                },
                labels: {
                    color: "#777777"
                },
                minorGridLines: {
                    color: "#c7c7c7"
                },
                majorGridLines: {
                    color: "#c7c7c7"
                },
                title: {
                    color: "#777777"
                }
            },
            tooltip: {
                background: WHITE,
                color: BLACK
            }
        })
    };

    // Copy the line/area settings for their vertical counterparts
    for (var themeName in chartThemes) {
        var defaults = chartThemes[themeName].seriesDefaults;
        defaults.verticalLine = deepExtend({}, defaults.line);
        defaults.verticalArea = deepExtend({}, defaults.area);
    }

    // Gauge themes ===========================================================

    var gaugeBaseTheme = {
        scale: {
            labels: {
                font: SANS12
            }
        }
    };

    var gaugeThemes = {
        black: deepExtend({}, gaugeBaseTheme, {
            pointer: {
                color: "#0070e4"
            },
            scale: {
                rangePlaceholderColor: "#1d1d1d",

                labels: {
                    color: WHITE
                },
                minorTicks: {
                    color: WHITE
                },
                majorTicks: {
                    color: WHITE
                },
                line: {
                    color: WHITE
                }
            }
        }),

        blueopal: deepExtend({}, gaugeBaseTheme, {
            pointer: {
                color: "#005c83"
            },
            scale: {
                rangePlaceholderColor: "#daecf4",

                labels: {
                    color: "#293135"
                },
                minorTicks: {
                    color: "#293135"
                },
                majorTicks: {
                    color: "#293135"
                },
                line: {
                    color: "#293135"
                }
            }
        }),

        "default": deepExtend({}, gaugeBaseTheme, {
            pointer: {
                color: "#ea7001"
            },
            scale: {
                rangePlaceholderColor: "#dedede",

                labels: {
                    color: "#2e2e2e"
                },
                minorTicks: {
                    color: "#2e2e2e"
                },
                majorTicks: {
                    color: "#2e2e2e"
                },
                line: {
                    color: "#2e2e2e"
                }
            }
        }),

        metro: deepExtend({}, gaugeBaseTheme, {
            pointer: {
                color: "#8ebc00"
            },
            scale: {
                rangePlaceholderColor: "#e6e6e6",

                labels: {
                    color: "#777"
                },
                minorTicks: {
                    color: "#777"
                },
                majorTicks: {
                    color: "#777"
                },
                line: {
                    color: "#777"
                }
            }
        }),

        silver: deepExtend({}, gaugeBaseTheme, {
            pointer: {
                color: "#0879c0"
            },
            scale: {
                rangePlaceholderColor: "#f3f3f4",

                labels: {
                    color: "#515967"
                },
                minorTicks: {
                    color: "#515967"
                },
                majorTicks: {
                    color: "#515967"
                },
                line: {
                    color: "#515967"
                }
            }
        })
    };

    // Exports ================================================================
    deepExtend(dataviz.ui.themes, {
        chart: chartThemes,
        gauge: gaugeThemes
    });

})(jQuery);

(function ($, undefined) {
    // Imports ================================================================
    var each = $.each,
        grep = $.grep,
        isArray = $.isArray,
        map = $.map,
        math = Math,
        extend = $.extend,
        proxy = $.proxy,
        doc = document,

        kendo = window.kendo,
        Class = kendo.Class,
        DataSource = kendo.data.DataSource,
        Widget = kendo.ui.Widget,
        template = kendo.template,
        deepExtend = kendo.deepExtend,
        getter = kendo.getter,

        dataviz = kendo.dataviz,
        Axis = dataviz.Axis,
        AxisLabel = dataviz.AxisLabel,
        BarAnimation = dataviz.BarAnimation,
        Box2D = dataviz.Box2D,
        BoxElement = dataviz.BoxElement,
        ChartElement = dataviz.ChartElement,
        Color = dataviz.Color,
        ElementAnimation = dataviz.ElementAnimation,
        NumericAxis = dataviz.NumericAxis,
        Point2D = dataviz.Point2D,
        RootElement = dataviz.RootElement,
        Ring = dataviz.Ring,
        Text = dataviz.Text,
        TextBox = dataviz.TextBox,
        Title = dataviz.Title,
        animationDecorator = dataviz.animationDecorator,
        append = dataviz.append,
        autoFormat = dataviz.autoFormat,
        defined = dataviz.defined,
        getSpacing = dataviz.getSpacing,
        inArray = dataviz.inArray,
        interpolateValue = dataviz.interpolateValue,
        last = dataviz.last,
        round = dataviz.round,
        renderTemplate = dataviz.renderTemplate,
        uniqueId = dataviz.uniqueId;

    var CSS_PREFIX = "k-";

    // Constants ==============================================================
    var ABOVE = "above",
        AREA = "area",
        AXIS_LABEL_CLICK = dataviz.AXIS_LABEL_CLICK,
        BAR = "bar",
        BAR_BORDER_BRIGHTNESS = 0.8,
        BELOW = "below",
        BLACK = "#000",
        BOTTOM = "bottom",
        BUBBLE = "bubble",
        CATEGORY = "category",
        CENTER = "center",
        CHANGE = "change",
        CIRCLE = "circle",
        CLICK = "click",
        CLIP = dataviz.CLIP,
        COLUMN = "column",
        COORD_PRECISION = dataviz.COORD_PRECISION,
        DATABOUND = "dataBound",
        DATE = "date",
        DATE_REGEXP = /^\/Date\((.*?)\)\/$/,
        DAYS = "days",
        DEFAULT_FONT = dataviz.DEFAULT_FONT,
        DEFAULT_HEIGHT = dataviz.DEFAULT_HEIGHT,
        DEFAULT_PRECISION = dataviz.DEFAULT_PRECISION,
        DEFAULT_WIDTH = dataviz.DEFAULT_WIDTH,
        DEGREE = math.PI / 180,
        DONUT = "donut",
        DONUT_SECTOR_ANIM_DELAY = 50,
        FADEIN = "fadeIn",
        GLASS = "glass",
        HOURS = "hours",
        INITIAL_ANIMATION_DURATION = dataviz.INITIAL_ANIMATION_DURATION,
        INSIDE_BASE = "insideBase",
        INSIDE_END = "insideEnd",
        INTERPOLATE = "interpolate",
        LEFT = "left",
        LINE = "line",
        LINE_MARKER_SIZE = 8,
        MAX_VALUE = Number.MAX_VALUE,
        MIN_VALUE = -Number.MAX_VALUE,
        MINUTES = "minutes",
        MONTHS = "months",
        MOUSEMOVE_TRACKING = "mousemove.tracking",
        MOUSEOVER = "mouseover",
        NS = ".kendoChart",
        OUTSIDE_END = "outsideEnd",
        OUTLINE_SUFFIX = "_outline",
        PIE = "pie",
        PIE_SECTOR_ANIM_DELAY = 70,
        PLOT_AREA_CLICK = "plotAreaClick",
        PRIMARY = "primary",
        RIGHT = "right",
        ROUNDED_BEVEL = "roundedBevel",
        ROUNDED_GLASS = "roundedGlass",
        SCATTER = "scatter",
        SCATTER_LINE = "scatterLine",
        SERIES_CLICK = "seriesClick",
        SERIES_HOVER = "seriesHover",
        STRING = "string",
        TIME_PER_MINUTE = 60000,
        TIME_PER_HOUR = 60 * TIME_PER_MINUTE,
        TIME_PER_DAY = 24 * TIME_PER_HOUR,
        TIME_PER_MONTH = 31 * TIME_PER_DAY,
        TIME_PER_YEAR = 365 * TIME_PER_DAY,
        TIME_PER_UNIT = {
            "years": TIME_PER_YEAR,
            "months": TIME_PER_MONTH,
            "days": TIME_PER_DAY,
            "hours": TIME_PER_HOUR,
            "minutes": TIME_PER_MINUTE
        },
        TOP = "top",
        TOOLTIP_ANIMATION_DURATION = 150,
        TOOLTIP_OFFSET = 5,
        TOOLTIP_SHOW_DELAY = 100,
        TRIANGLE = "triangle",
        VERTICAL_LINE = "verticalLine",
        VERTICAL_AREA = "verticalArea",
        WHITE = "#fff",
        X = "x",
        Y = "y",
        YEARS = "years",
        ZERO = "zero";

    var CATEGORICAL_CHARTS = [BAR, COLUMN, LINE, VERTICAL_LINE, AREA, VERTICAL_AREA],
        XY_CHARTS = [SCATTER, SCATTER_LINE, BUBBLE];

    var DateLabelFormats = {
        minutes: "HH:mm",
        hours: "HH:mm",
        days: "M/d",
        months: "MMM 'yy",
        years: "yyyy"
    };

    // Chart ==================================================================
    var Chart = Widget.extend({
        init: function(element, userOptions) {
            var chart = this,
                options,
                themeOptions,
                themes = dataviz.ui.themes.chart || {},
                dataSourceOptions = (userOptions || {}).dataSource,
                themeName;

            Widget.fn.init.call(chart, element);
            options = deepExtend({}, chart.options, userOptions);

            themeName = options.theme;
            themeOptions = themeName ? themes[themeName] || themes[themeName.toLowerCase()] : {};

            applyDefaults(options, themeOptions);

            chart.options = deepExtend({}, themeOptions, options);

            applySeriesColors(chart.options);

            chart.bind(chart.events, chart.options);

            chart.element.addClass("k-chart");

            chart.wrapper = chart.element;

            chart._dataChangeHandler = proxy(chart._onDataChanged, chart);

            chart.dataSource = DataSource
                .create(dataSourceOptions)
                .bind(CHANGE, chart._dataChangeHandler);

            chart._redraw();
            chart._attachEvents();

            if (dataSourceOptions && options.autoBind) {
                chart.dataSource.fetch();
            }

            kendo.notify(chart, dataviz.ui);
        },

        setDataSource: function(dataSource) {
            var chart = this;

            if (chart.dataSource) {
                chart.dataSource.unbind(CHANGE, chart._dataChangeHandler);
            }

            chart.dataSource = dataSource;

            dataSource.bind(CHANGE, chart._dataChangeHandler);

            if (chart.options.autoBind) {
                dataSource.fetch();
            }
        },

        events:[
            DATABOUND,
            SERIES_CLICK,
            SERIES_HOVER,
            AXIS_LABEL_CLICK,
            PLOT_AREA_CLICK
        ],

        items: function() {
            return $();
        },

        options: {
            name: "Chart",
            theme: "default",
            chartArea: {},
            title: {
                visible: true
            },
            legend: {
                visible: true,
                labels: {}
            },
            categoryAxis: {
                categories: []
            },
            autoBind: true,
            seriesDefaults: {
                type: COLUMN,
                data: [],
                groupNameTemplate: "#= group.value + (kendo.dataviz.defined(series.name) ? ': ' + series.name : '') #",
                labels: {}
            },
            series: [],
            tooltip: {
                visible: false
            },
            transitions: true
        },

        refresh: function() {
            var chart = this;

            applyDefaults(chart.options);

            if (chart.dataSource) {
                delete chart._sourceSeries;
                chart._onDataChanged();
            } else {
                chart._redraw();
            }
        },

        redraw: function() {
            var chart = this;

            applyDefaults(chart.options);

            chart._redraw();
        },

        _redraw: function() {
            var chart = this,
                options = chart.options,
                element = chart.element,
                model = chart._model = chart._getModel(),
                viewType = dataviz.ui.defaultView(),
                view;

            chart._plotArea = model._plotArea;

            if (viewType) {
                view = chart._view = viewType.fromModel(model);

                element.css("position", "relative");
                chart._viewElement = view.renderTo(element[0]);
                chart._tooltip = new dataviz.Tooltip(element, options.tooltip);
                chart._highlight = new Highlight(view, chart._viewElement);
            }
        },

        svg: function() {
            var model = this._getModel(),
                view = dataviz.SVGView.fromModel(model);

            return view.render();
        },

        _getModel: function() {
            var chart = this,
                options = chart.options,
                element = chart.element,
                model = new RootElement(deepExtend({
                    width: element.width() || DEFAULT_WIDTH,
                    height: element.height() || DEFAULT_HEIGHT,
                    transitions: options.transitions
                    }, options.chartArea)),
                plotArea;

            if (options.title && options.title.visible && options.title.text) {
                model.append(new Title(options.title));
            }

            plotArea = model._plotArea = chart._createPlotArea();
            if (options.legend.visible) {
                model.append(new Legend(plotArea.options.legend));
            }
            model.append(plotArea);
            model.reflow();

            return model;
        },

        _createPlotArea: function() {
            var chart = this,
                options = chart.options,
                series = options.series,
                i,
                length = series.length,
                currentSeries,
                categoricalSeries = [],
                xySeries = [],
                pieSeries = [],
                donutSeries = [],
                plotArea;

            for (i = 0; i < length; i++) {
                currentSeries = series[i];

                if (inArray(currentSeries.type, CATEGORICAL_CHARTS)) {
                    categoricalSeries.push(currentSeries);
                } else if (inArray(currentSeries.type, XY_CHARTS)) {
                    xySeries.push(currentSeries);
                } else if (currentSeries.type === PIE) {
                    pieSeries.push(currentSeries);
                } else if (currentSeries.type === DONUT) {
                    donutSeries.push(currentSeries);
                }
            }

            if (pieSeries.length > 0) {
                plotArea = new PiePlotArea(pieSeries, options);
            } else if (donutSeries.length > 0) {
                plotArea = new DonutPlotArea(donutSeries, options);
            } else if (xySeries.length > 0) {
                plotArea = new XYPlotArea(xySeries, options);
            } else {
                plotArea = new CategoricalPlotArea(categoricalSeries, options);
            }

            return plotArea;
        },

        _attachEvents: function() {
            var chart = this,
                element = chart.element;

            element.on(CLICK + NS, proxy(chart._click, chart));
            element.on(MOUSEOVER + NS, proxy(chart._mouseOver, chart));
        },

        _getChartElement: function(e) {
            var chart = this,
                modelId = $(e.target).data("modelId"),
                model = chart._model,
                element;

            if (modelId) {
                element = model.modelMap[modelId];
            }

            if (element && element.aliasFor) {
                element = element.aliasFor(e, chart._eventCoordinates(e));
            }

            return element;
        },

        _eventCoordinates: function(e) {
            var element = this.element,
                offset = element.offset(),
                paddingLeft = parseInt(element.css("paddingLeft"), 10),
                paddingTop = parseInt(element.css("paddingTop"), 10),
                win = $(window);

            return {
                x: e.clientX - offset.left - paddingLeft + win.scrollLeft(),
                y: e.clientY - offset.top - paddingTop + win.scrollTop()
            };
        },

        _click: function(e) {
            var chart = this,
                element = chart._getChartElement(e);

            while (element) {
                if (element.click) {
                    element.click(chart, e);
                }

                element = element.parent;
            }
        },

        _mouseOver: function(e) {
            var chart = this,
                tooltip = chart._tooltip,
                highlight = chart._highlight,
                tooltipOptions,
                point;

            if (!highlight || highlight.overlayElement === e.target) {
                return;
            }

            point = chart._getChartElement(e);
            if (point && point.hover) {
                point.hover(chart, e);
                chart._activePoint = point;

                tooltipOptions = deepExtend({}, chart.options.tooltip, point.options.tooltip);
                if (tooltipOptions.visible) {
                    tooltip.show(point);
                }

                highlight.show(point);

                $(doc.body).on(MOUSEMOVE_TRACKING, proxy(chart._mouseMove, chart));
            }
        },

        _mouseMove: function(e) {
            var chart = this,
                tooltip = chart._tooltip,
                highlight = chart._highlight,
                coords = chart._eventCoordinates(e),
                point = chart._activePoint,
                tooltipOptions,
                owner,
                seriesPoint;

            if (chart._plotArea.box.containsPoint(coords.x, coords.y)) {
                if (point && point.series && (point.series.type === LINE || point.series.type === AREA)) {
                    owner = point.parent;
                    seriesPoint = owner.getNearestPoint(coords.x, coords.y, point.seriesIx);
                    if (seriesPoint && seriesPoint != point) {
                        seriesPoint.hover(chart, e);
                        chart._activePoint = seriesPoint;

                        tooltipOptions = deepExtend({}, chart.options.tooltip, point.options.tooltip);
                        if (tooltipOptions.visible) {
                            tooltip.show(seriesPoint);
                        }
                        highlight.show(seriesPoint);
                    }
                }
            } else {
                $(doc.body).off(MOUSEMOVE_TRACKING);

                delete chart._activePoint;
                tooltip.hide();
                highlight.hide();
            }
        },

        _onDataChanged: function() {
            var chart = this,
                options = chart.options,
                series = chart._sourceSeries || options.series,
                seriesIx,
                seriesLength = series.length,
                data = chart.dataSource.view(),
                grouped = (chart.dataSource.group() || []).length > 0,
                processedSeries = [],
                currentSeries;

            for (seriesIx = 0; seriesIx < seriesLength; seriesIx++) {
                currentSeries = series[seriesIx];

                if (currentSeries.field || (currentSeries.xField && currentSeries.yField)) {
                    currentSeries.data = data;

                    [].push.apply(processedSeries, grouped ?
                        chart._createGroupedSeries(currentSeries, data) :
                        [ currentSeries ]
                    );
                } else {
                    processedSeries.push(currentSeries);
                }
            }

            chart._sourceSeries = series;
            options.series = processedSeries;

            applySeriesColors(chart.options);

            chart._bindCategories(grouped ? data[0].items : data);

            chart.trigger(DATABOUND);
            chart._redraw();
        },

        _createGroupedSeries: function(series, data) {
            var groupSeries = [],
                nameTemplate,
                group,
                groupIx,
                dataLength = data.length,
                seriesClone;

            if (series.groupNameTemplate) {
                nameTemplate = template(series.groupNameTemplate);
            }

            for (groupIx = 0; groupIx < dataLength; groupIx++) {
                seriesClone = deepExtend({}, series);
                seriesClone.color = undefined;
                groupSeries.push(seriesClone);

                group = data[groupIx];
                seriesClone.data = group.items;

                if (nameTemplate) {
                    seriesClone.name = nameTemplate({
                        series: seriesClone, group: group
                    });
                }
            }

            return groupSeries;
        },

        _bindCategories: function(data) {
            var categoryAxis = this.options.categoryAxis,
                i,
                category,
                row,
                length = data.length;

            if (categoryAxis.field) {
                for (i = 0; i < length; i++) {
                    row = data[i];

                    category = getField(categoryAxis.field, row);
                    if (i === 0) {
                        categoryAxis.categories = [category];
                        categoryAxis.dataItems = [row];
                    } else {
                        categoryAxis.categories.push(category);
                        categoryAxis.dataItems.push(row);
                    }
                }
            }
        },

        destroy: function() {
            var chart = this,
                dataSource = chart.dataSource;

            chart.wrapper.off(NS);
            dataSource.unbind(CHANGE, chart._dataChangeHandler);

            Widget.fn.destroy.call(chart);
        }
    });


    var BarLabel = ChartElement.extend({
        init: function(content, options) {
            var barLabel = this;
            ChartElement.fn.init.call(barLabel, options);

            barLabel.append(new TextBox(content, barLabel.options));
        },

        options: {
            position: OUTSIDE_END,
            margin: getSpacing(3),
            padding: getSpacing(4),
            color: BLACK,
            background: "",
            border: {
                width: 1,
                color: ""
            },
            aboveAxis: true,
            vertical: false,
            animation: {
                type: FADEIN,
                delay: INITIAL_ANIMATION_DURATION
            },
            zIndex: 1
        },

        reflow: function(targetBox) {
            var barLabel = this,
                options = barLabel.options,
                vertical = options.vertical,
                aboveAxis = options.aboveAxis,
                text = barLabel.children[0],
                box = text.box,
                padding = text.options.padding;

            text.options.align = vertical ? CENTER : LEFT;
            text.options.vAlign = vertical ? TOP : CENTER;

            if (options.position == INSIDE_END) {
                if (vertical) {
                    text.options.vAlign = TOP;

                    if (!aboveAxis && box.height() < targetBox.height()) {
                        text.options.vAlign = BOTTOM;
                    }
                } else {
                    text.options.align = aboveAxis ? RIGHT : LEFT;
                }
            } else if (options.position == CENTER) {
                text.options.vAlign = CENTER;
                text.options.align = CENTER;
            } else if (options.position == INSIDE_BASE) {
                if (vertical) {
                    text.options.vAlign = aboveAxis ? BOTTOM : TOP;
                } else {
                    text.options.align = aboveAxis ? LEFT : RIGHT;
                }
            } else if (options.position == OUTSIDE_END) {
                if (vertical) {
                    if (aboveAxis) {
                        targetBox = new Box2D(
                            targetBox.x1, targetBox.y1 - box.height(),
                            targetBox.x2, targetBox.y1
                        );
                    } else {
                        targetBox = new Box2D(
                            targetBox.x1, targetBox.y2,
                            targetBox.x2, targetBox.y2 + box.height()
                        );
                    }
                } else {
                    text.options.align = CENTER;
                    if (aboveAxis) {
                        targetBox = new Box2D(
                            targetBox.x2 + box.width(), targetBox.y1,
                            targetBox.x2, targetBox.y2
                        );
                    } else {
                        targetBox = new Box2D(
                            targetBox.x1 - box.width(), targetBox.y1,
                            targetBox.x1, targetBox.y2
                        );
                    }
                }
            }

            if (vertical) {
                padding.left = padding.right =
                    (targetBox.width() - text.contentBox.width()) / 2;
            } else {
                padding.top = padding.bottom =
                    (targetBox.height() - text.contentBox.height()) / 2;
            }

            text.reflow(targetBox);
        }
    });

    var Legend = ChartElement.extend({
        init: function(options) {
            var legend = this;

            ChartElement.fn.init.call(legend, options);

            legend.createLabels();
        },

        options: {
            position: RIGHT,
            items: [],
            labels: {},
            offsetX: 0,
            offsetY: 0,
            margin: getSpacing(10),
            padding: getSpacing(5),
            border: {
                color: BLACK,
                width: 0
            },
            background: "",
            zIndex: 1
        },

        createLabels: function() {
            var legend = this,
                items = legend.options.items,
                count = items.length,
                label,
                name,
                i;

            for (i = 0; i < count; i++) {
                name = items[i].name;
                    label = new Text(name, legend.options.labels);

                legend.append(label);
            }
        },

        reflow: function(targetBox) {
            var legend = this,
                options = legend.options,
                childrenCount = legend.children.length;

            if (childrenCount === 0) {
                legend.box = targetBox.clone();
                return;
            }

            if (options.position == "custom") {
                legend.customLayout(targetBox);
                return;
            }

            if (options.position == TOP || options.position == BOTTOM) {
                legend.horizontalLayout(targetBox);
            } else {
                legend.verticalLayout(targetBox);
            }
        },

        getViewElements: function(view) {
            var legend = this,
                children = legend.children,
                options = legend.options,
                items = options.items,
                count = items.length,
                markerSize = legend.markerSize(),
                group = view.createGroup({ zIndex: options.zIndex }),
                border = options.border || {},
                padding,
                markerBox,
                labelBox,
                color,
                label,
                box,
                i;

            append(group.children, ChartElement.fn.getViewElements.call(legend, view));

            for (i = 0; i < count; i++) {
                color = items[i].color;
                label = children[i];
                markerBox = new Box2D();
                box = label.box;

                labelBox = labelBox ? labelBox.wrap(box) : box.clone();

                markerBox.x1 = box.x1 - markerSize * 2;
                markerBox.x2 = markerBox.x1 + markerSize;

                if (options.position == TOP || options.position == BOTTOM) {
                    markerBox.y1 = box.y1 + markerSize / 2;
                } else {
                    markerBox.y1 = box.y1 + (box.height() - markerSize) / 2;
                }

                markerBox.y2 = markerBox.y1 + markerSize;

                group.children.push(view.createRect(markerBox, { fill: color, stroke: color }));
            }

            if (children.length > 0) {
                padding = getSpacing(options.padding);
                padding.left += markerSize * 2;
                labelBox.pad(padding);
                group.children.unshift(view.createRect(labelBox, {
                    stroke: border.width ? border.color : "",
                    strokeWidth: border.width,
                    dashType: border.dashType,
                    fill: options.background })
                );
            }

            return [ group ];
        },

        verticalLayout: function(targetBox) {
            var legend = this,
                options = legend.options,
                children = legend.children,
                childrenCount = children.length,
                labelBox = children[0].box.clone(),
                offsetX,
                offsetY,
                margin = getSpacing(options.margin),
                markerSpace = legend.markerSize() * 2,
                label,
                i;

            // Position labels below each other
            for (i = 1; i < childrenCount; i++) {
                label = legend.children[i];
                label.box.alignTo(legend.children[i - 1].box, BOTTOM);
                labelBox.wrap(label.box);
            }

            // Vertical center is calculated relative to the container, not the parent!
            if (options.position == LEFT) {
                offsetX = targetBox.x1 + markerSpace + margin.left;
                offsetY = (targetBox.y2 - labelBox.height()) / 2;
                labelBox.x2 += markerSpace + margin.left + margin.right;
            } else {
                offsetX = targetBox.x2 - labelBox.width() - margin.right;
                offsetY = (targetBox.y2 - labelBox.height()) / 2;
                labelBox.translate(offsetX, offsetY);
                labelBox.x1 -= markerSpace + margin.left;
            }

            legend.translateChildren(offsetX + options.offsetX,
                    offsetY + options.offsetY);

            var labelBoxWidth = labelBox.width();
            labelBox.x1 = math.max(targetBox.x1, labelBox.x1);
            labelBox.x2 = labelBox.x1 + labelBoxWidth;

            labelBox.y1 = targetBox.y1;
            labelBox.y2 = targetBox.y2;

            legend.box = labelBox;
        },

        horizontalLayout: function(targetBox) {
            var legend = this,
                options = legend.options,
                children = legend.children,
                childrenCount = children.length,
                box = children[0].box.clone(),
                markerWidth = legend.markerSize() * 3,
                offsetX,
                offsetY,
                margin = getSpacing(options.margin),
                boxWidth = children[0].box.width() + markerWidth,
                plotAreaWidth = targetBox.width(),
                label,
                labelY = 0,
                i;

            // Position labels next to each other
            for (i = 1; i < childrenCount; i++) {
                label = children[i];

                boxWidth += label.box.width() + markerWidth;
                if (boxWidth > plotAreaWidth - markerWidth) {
                    label.box = new Box2D(box.x1, box.y2,
                        box.x1 + label.box.width(), box.y2 + label.box.height());
                    boxWidth = label.box.width() + markerWidth;
                    labelY = label.box.y1;
                } else {
                    label.box.alignTo(children[i - 1].box, RIGHT);
                    label.box.y2 = labelY + label.box.height();
                    label.box.y1 = labelY;
                    label.box.translate(markerWidth, 0);
                }
                box.wrap(label.box);
            }

            offsetX = (targetBox.width() - box.width() + markerWidth) / 2;
            if (options.position === TOP) {
                offsetY = targetBox.y1 + margin.top;
                box.y2 = targetBox.y1 + box.height() + margin.top + margin.bottom;
                box.y1 = targetBox.y1;
            } else {
                offsetY = targetBox.y2 - box.height() - margin.bottom;
                box.y1 = targetBox.y2 - box.height() - margin.top - margin.bottom;
                box.y2 = targetBox.y2;
            }

            legend.translateChildren(offsetX + options.offsetX,
                    offsetY + options.offsetY);

            box.x1 = targetBox.x1;
            box.x2 = targetBox.x2;

            legend.box = box;
        },

        customLayout: function (targetBox) {
            var legend = this,
                options = legend.options,
                children = legend.children,
                childrenCount = children.length,
                labelBox = children[0].box.clone(),
                markerWidth = legend.markerSize() * 2,
                i;

            // Position labels next to each other
            for (i = 1; i < childrenCount; i++) {
                labelBox = legend.children[i].box;
                labelBox.alignTo(legend.children[i - 1].box, BOTTOM);
                labelBox.wrap(labelBox);
            }

            legend.translateChildren(options.offsetX + markerWidth, options.offsetY);

            legend.box = targetBox;
        },

        markerSize: function() {
            var legend = this,
                children = legend.children;

            if (children.length > 0) {
                return children[0].box.height() / 2;
            } else {
                return 0;
            }
        }
    });

    var CategoryAxis = Axis.extend({
        options: {
            type: CATEGORY,
            categories: [],
            vertical: false,
            majorGridLines: {
                visible: false,
                width: 1,
                color: BLACK
            },
            zIndex: 1,

            _labelsOnTicks: false
        },

        range: function() {
            return { min: 0, max: this.options.categories.length };
        },

        getTickPositions: function(itemsCount) {
            var axis = this,
                options = axis.options,
                vertical = options.vertical,
                size = vertical ? axis.box.height() : axis.box.width(),
                step = size / itemsCount,
                pos = vertical ? axis.box.y1 : axis.box.x1,
                positions = [],
                i;

            for (i = 0; i < itemsCount; i++) {
                positions.push(round(pos, COORD_PRECISION));
                pos += step;
            }

            positions.push(vertical ? axis.box.y2 : axis.box.x2);

            return options.reverse ? positions.reverse() : positions;
        },

        getMajorTickPositions: function() {
            var axis = this;

            return axis.getTickPositions(axis.options.categories.length);
        },

        getMinorTickPositions: function() {
            var axis = this;

            return axis.getTickPositions(axis.options.categories.length * 2);
        },

        getSlot: function(from, to) {
            var axis = this,
                options = axis.options,
                reverse = options.reverse,
                vertical = options.vertical,
                valueAxis = vertical ? Y : X,
                lineBox = axis.lineBox(),
                slotBox = new Box2D(lineBox.x1, lineBox.y1, lineBox.x1, lineBox.y1),
                lineStart = lineBox[valueAxis + (reverse ? 2 : 1)],
                size = vertical ? lineBox.height() : lineBox.width(),
                categoriesLength = math.max(1, options.categories.length),
                step = (reverse ? -1 : 1) * (size / categoriesLength),
                p1,
                p2,
                slotSize;

            from = math.min(math.max(0, from), categoriesLength);
            to = defined(to) ? to : from;
            to = math.max(math.min(categoriesLength, to), from);
            p1 = lineStart + (from * step);
            p2 = p1 + step;
            slotSize = to - from;

            if (slotSize > 0 || (from == to && categoriesLength == from)) {
                p2 = p1 + (slotSize * step);
            }

            slotBox[valueAxis + 1] = reverse ? p2 : p1;
            slotBox[valueAxis + 2] = reverse ? p1 : p2;

            return slotBox;
        },

        getCategory: function(point) {
            var axis = this,
                options = axis.options,
                reverse = options.reverse,
                vertical = options.vertical,
                valueAxis = vertical ? Y : X,
                lineBox = axis.lineBox(),
                lineStart = lineBox[valueAxis + (reverse ? 2 : 1)],
                lineSize = vertical ? lineBox.height() : lineBox.width(),
                intervals = math.max(1, options.categories.length - 1),
                offset = (reverse ? -1 : 1) * (point[valueAxis] - lineStart),
                step = intervals / lineSize,
                categoriesOffset = round(offset * step),
                categoryIx;

            if (offset < 0 || offset > lineSize) {
                return null;
            }

            categoryIx = vertical ?
                intervals - categoriesOffset:
                categoriesOffset;

            return options.categories[categoryIx];
        },

        labelsCount: function() {
            return this.options.categories.length;
        },

        createAxisLabel: function(index, labelOptions) {
            var axis = this,
                options = axis.options,
                dataItem = options.dataItems ? options.dataItems[index] : null,
                category = defined(options.categories[index]) ? options.categories[index] : "";

            return new AxisLabel(category, index, dataItem, labelOptions);
        }
    });

    var AxisDateLabel = AxisLabel.extend({
        formatValue: function(value, options) {
            return kendo.toString(value, options.format, options.culture);
        }
    });

    var DateCategoryAxis = CategoryAxis.extend({
        init: function(options) {
            var axis = this;

            options = options || {};

            deepExtend(options, {
                min: toDate(options.min),
                max: toDate(options.max)
            });

            options = axis.applyDefaults(options);

            if (options.categories.length > 0) {
                axis.groupCategories(options);
            }

            CategoryAxis.fn.init.call(axis, options);
        },

        options: {
            type: DATE,
            labels: {
                dateFormats: DateLabelFormats
            }
        },

        applyDefaults: function(options) {
            var categories = options.categories,
                count = categories.length,
                categoryIx,
                cat,
                diff,
                minDiff = MAX_VALUE,
                lastCat,
                unit;

            for (categoryIx = 0; categoryIx < count; categoryIx++) {
                cat = toDate(categories[categoryIx]);

                if (cat && lastCat) {
                    diff = cat - lastCat;
                    if (diff > 0) {
                        minDiff = math.min(minDiff, diff);

                        if (minDiff >= TIME_PER_YEAR) {
                            unit = YEARS;
                        } else if (minDiff >= TIME_PER_MONTH - TIME_PER_DAY * 3) {
                            unit = MONTHS;
                        } else if (minDiff >= TIME_PER_DAY) {
                            unit = DAYS;
                        } else if (minDiff >= TIME_PER_HOUR) {
                            unit = HOURS;
                        } else {
                            unit = MINUTES;
                        }
                    }
                }

                lastCat = cat;
            }

            if (!options.baseUnit) {
                delete options.baseUnit;
            }

            return deepExtend({ baseUnit: unit || DAYS }, options);
        },

        groupCategories: function(options) {
            var axis = this,
                categories = toDate(options.categories),
                baseUnit = options.baseUnit,
                min = toTime(options.min),
                max = toTime(options.max),
                minCategory = toTime(sparseArrayMin(categories)),
                maxCategory = toTime(sparseArrayMax(categories)),
                start = floorDate(min || minCategory, baseUnit),
                end = ceilDate((max || maxCategory) + 1, baseUnit),
                date,
                nextDate,
                groups = [],
                categoryMap = [],
                categoryIndicies,
                categoryIx,
                categoryDate;

            for (date = start; date < end; date = nextDate) {
                groups.push(date);
                nextDate = addDuration(date, 1, baseUnit);

                categoryIndicies = [];
                for (categoryIx = 0; categoryIx < categories.length; categoryIx++) {
                    categoryDate = toDate(categories[categoryIx]);
                    if (categoryDate && categoryDate >= date && categoryDate < nextDate) {
                        categoryIndicies.push(categoryIx);
                    }
                }

                categoryMap.push(categoryIndicies);
            }

            options.min = groups[0];
            options.max = last(groups);
            options.categories = groups;
            axis.categoryMap = categoryMap;
        },

        createAxisLabel: function(index, labelOptions) {
            var options = this.options,
                dataItem = options.dataItems ? options.dataItems[index] : null,
                date = options.categories[index],
                unitFormat = labelOptions.dateFormats[options.baseUnit];

            labelOptions.format = labelOptions.format || unitFormat;

            return new AxisDateLabel(date, index, dataItem, labelOptions);
        }
    });

    var DateValueAxis = Axis.extend({
        init: function(seriesMin, seriesMax, options) {
            var axis = this;

            options = options || {};

            deepExtend(options, {
                min: toDate(options.min),
                max: toDate(options.max),
                axisCrossingValue: toDate(options.axisCrossingValue)
            });

            options = axis.applyDefaults(toDate(seriesMin), toDate(seriesMax), options);

            Axis.fn.init.call(axis, options);
        },

        options: {
            type: DATE,
            labels: {
                dateFormats: DateLabelFormats
            }
        },

        applyDefaults: function(seriesMin, seriesMax, options) {
            var axis = this,
                min = options.min || seriesMin,
                max = options.max || seriesMax,
                baseUnit = options.baseUnit || axis.timeUnits(max - min),
                baseUnitTime = TIME_PER_UNIT[baseUnit],
                autoMin = floorDate(toTime(min) - 1, baseUnit),
                autoMax = ceilDate(toTime(max) + 1, baseUnit),
                userMajorUnit = options.majorUnit ? options.majorUnit : undefined,
                majorUnit = userMajorUnit || dataviz.ceil(
                                dataviz.autoMajorUnit(autoMin.getTime(), autoMax.getTime()),
                                baseUnitTime
                            ) / baseUnitTime,
                actualUnits = duration(autoMin, autoMax, baseUnit),
                totalUnits = dataviz.ceil(actualUnits, majorUnit),
                unitsToAdd = totalUnits - actualUnits,
                head = math.floor(unitsToAdd / 2),
                tail = unitsToAdd - head;

            if (!options.baseUnit) {
                delete options.baseUnit;
            }

            return deepExtend({
                    baseUnit: baseUnit,
                    min: addDuration(autoMin, -head, baseUnit),
                    max: addDuration(autoMax, tail, baseUnit),
                    minorUnit: majorUnit / 5
                }, options, {
                    majorUnit: majorUnit
                }
            );
        },

        range: function() {
            var options = this.options;
            return { min: options.min, max: options.max };
        },

        getDivisions: function(stepValue) {
            var options = this.options;

            return math.floor(
                duration(options.min, options.max, options.baseUnit) / stepValue + 1
            );
        },

        getTickPositions: function(stepValue) {
            var axis = this,
                options = axis.options,
                vertical = options.vertical,
                reverse = options.reverse,
                lineBox = axis.lineBox(),
                lineSize = vertical ? lineBox.height() : lineBox.width(),
                timeRange = duration(options.min, options.max, options.baseUnit),
                scale = lineSize / timeRange,
                step = stepValue * scale,
                divisions = axis.getDivisions(stepValue),
                dir = (vertical ? -1 : 1) * (reverse ? -1 : 1),
                startEdge = dir === 1 ? 1 : 2,
                pos = lineBox[(vertical ? Y : X) + startEdge],
                positions = [],
                i;

            for (i = 0; i < divisions; i++) {
                positions.push(round(pos, COORD_PRECISION));
                pos = pos + step * dir;
            }

            return positions;
        },

        getMajorTickPositions: function() {
            var axis = this;

            return axis.getTickPositions(axis.options.majorUnit);
        },

        getMinorTickPositions: function() {
            var axis = this;

            return axis.getTickPositions(axis.options.minorUnit);
        },

        getSlot: function(a, b) {
            return NumericAxis.fn.getSlot.call(
                this, toDate(a), toDate(b)
            );
        },

        getValue: function(point) {
            var value = NumericAxis.fn.getValue.call(this, point);

            return value !== null ? toDate(value) : null;
        },

        labelsCount: function() {
            return this.getDivisions(this.options.majorUnit);
        },

        createAxisLabel: function(index, labelOptions) {
            var options = this.options,
                offset =  index * options.majorUnit,
                date = addDuration(options.min, offset, options.baseUnit),
                unitFormat = labelOptions.dateFormats[options.baseUnit];

            labelOptions.format = labelOptions.format || unitFormat;

            return new AxisDateLabel(date, index, null, labelOptions);
        },

        timeUnits: function(delta) {
            var unit = HOURS;

            if (delta >= TIME_PER_YEAR) {
                unit = YEARS;
            } else if (delta >= TIME_PER_MONTH) {
                unit = MONTHS;
            } else if (delta >= TIME_PER_DAY) {
                unit = DAYS;
            }

            return unit;
        }
    });

    var ClusterLayout = ChartElement.extend({
        init: function(options) {
            var cluster = this;
            ChartElement.fn.init.call(cluster, options);
        },

        options: {
            vertical: false,
            gap: 0,
            spacing: 0
        },

        reflow: function(box) {
            var cluster = this,
                options = cluster.options,
                vertical = options.vertical,
                axis = vertical ? Y : X,
                children = cluster.children,
                gap = options.gap,
                spacing = options.spacing,
                count = children.length,
                slots = count + gap + (spacing * (count - 1)),
                slotSize = (vertical ? box.height() : box.width()) / slots,
                position = box[axis + 1] + slotSize * (gap / 2),
                childBox,
                i;

            for (i = 0; i < count; i++) {
                childBox = (children[i].box || box).clone();

                childBox[axis + 1] = position;
                childBox[axis + 2] = position + slotSize;

                children[i].reflow(childBox);
                if (i < count - 1) {
                    position += (slotSize * spacing);
                }

                position += slotSize;
            }
        }
    });

    var StackLayout = ChartElement.extend({
        init: function(options) {
            var stack = this;
            ChartElement.fn.init.call(stack, options);
        },

        options: {
            vertical: true,
            isReversed: false
        },

        reflow: function(targetBox) {
            var stack = this,
                options = stack.options,
                vertical = options.vertical,
                positionAxis = vertical ? X : Y,
                stackAxis = vertical ? Y : X,
                stackBase = targetBox[stackAxis + 2],
                children = stack.children,
                box = stack.box = new Box2D(),
                childrenCount = children.length,
                stackDirection,
                i;

            if (options.isReversed) {
                stackDirection = vertical ? BOTTOM : LEFT;
            } else {
                stackDirection = vertical ? TOP : RIGHT;
            }

            for (i = 0; i < childrenCount; i++) {
                var currentChild = children[i],
                    childBox = currentChild.box.clone();

                childBox.snapTo(targetBox, positionAxis);
                if (currentChild.options) {
                    currentChild.options.stackBase = stackBase;
                }

                if (i === 0) {
                    box = stack.box = childBox.clone();
                } else {
                    childBox.alignTo(children[i - 1].box, stackDirection);
                }

                currentChild.reflow(childBox);

                box.wrap(childBox);
            }
        }
    });

    var PointEventsMixin = {
        click: function(chart, e) {
            var point = this;

            chart.trigger(SERIES_CLICK, {
                value: point.value,
                category: point.category,
                series: point.series,
                dataItem: point.dataItem,
                element: $(e.target)
            });
        },

        hover: function(chart, e) {
            var point = this;

            chart.trigger(SERIES_HOVER, {
                value: point.value,
                category: point.category,
                series: point.series,
                dataItem: point.dataItem,
                element: $(e.target)
            });
        }
    };

    var Bar = ChartElement.extend({
        init: function(value, options) {
            var bar = this;

            ChartElement.fn.init.call(bar, options);

            bar.value = value;
            bar.options.id = uniqueId();
            bar.makeDiscoverable();
        },

        options: {
            color: WHITE,
            border: {
                width: 1
            },
            vertical: true,
            overlay: {
                gradient: GLASS
            },
            aboveAxis: true,
            labels: {
                visible: false
            },
            animation: {
                type: BAR
            },
            opacity: 1
        },

        render: function() {
            var bar = this,
                value = bar.value,
                options = bar.options,
                labels = options.labels,
                labelText = value,
                labelTemplate;

            if (bar._rendered) {
                return;
            } else {
                bar._rendered = true;
            }

            if (labels.visible && value) {
                if (labels.template) {
                    labelTemplate = template(labels.template);
                    labelText = labelTemplate({
                        dataItem: bar.dataItem,
                        category: bar.category,
                        value: bar.value,
                        series: bar.series
                    });
                } else if (labels.format) {
                    labelText = autoFormat(labels.format, labelText);
                }

                bar.append(
                    new BarLabel(labelText,
                        deepExtend({
                            vertical: options.vertical,
                            id: uniqueId()
                        },
                        options.labels
                    ))
                );
            }
        },

        reflow: function(targetBox) {
            this.render();

            var bar = this,
                options = bar.options,
                children = bar.children,
                label = children[0];

            bar.box = targetBox;

            if (label) {
                label.options.aboveAxis = options.aboveAxis;
                label.reflow(targetBox);
            }
        },

        getViewElements: function(view) {
            var bar = this,
                options = bar.options,
                vertical = options.vertical,
                border = options.border.width > 0 ? {
                    stroke: bar.getBorderColor(),
                    strokeWidth: options.border.width,
                    dashType: options.border.dashType
                } : {},
                box = bar.box,
                rectStyle = deepExtend({
                    id: options.id,
                    fill: options.color,
                    fillOpacity: options.opacity,
                    strokeOpacity: options.opacity,
                    vertical: options.vertical,
                    aboveAxis: options.aboveAxis,
                    stackBase: options.stackBase,
                    animation: options.animation,
                    data: { modelId: options.modelId }
                }, border),
                elements = [];

            if (box.width() > 0 && box.height() > 0) {
                if (options.overlay) {
                    rectStyle.overlay = deepExtend({
                        rotation: vertical ? 0 : 90
                    }, options.overlay);
                }

                elements.push(view.createRect(box, rectStyle));
            }

            append(elements, ChartElement.fn.getViewElements.call(bar, view));

            return elements;
        },

        highlightOverlay: function(view, options){
            var bar = this,
                box = bar.box;

            options = deepExtend({ data: { modelId: bar.options.modelId } }, options);

            return view.createRect(box, options);
        },

        getBorderColor: function() {
            var bar = this,
                options = bar.options,
                color = options.color,
                borderColor = options.border.color;

            if (!defined(borderColor)) {
                borderColor =
                    new Color(color).brightness(BAR_BORDER_BRIGHTNESS).toHex();
            }

            return borderColor;
        },

        tooltipAnchor: function(tooltipWidth, tooltipHeight) {
            var bar = this,
                options = bar.options,
                box = bar.box,
                vertical = options.vertical,
                aboveAxis = options.aboveAxis,
                x,
                y;

            if (vertical) {
                x = box.x2 + TOOLTIP_OFFSET;
                y = aboveAxis ? box.y1 : box.y2 - tooltipHeight;
            } else {
                if (options.isStacked) {
                    x = box.x2 - tooltipWidth;
                    y = box.y1 - tooltipHeight - TOOLTIP_OFFSET;
                } else {
                    x = box.x2 + TOOLTIP_OFFSET;
                    y = box.y1;
                }
            }

            return new Point2D(x, y);
        },

        formatValue: function(format) {
            var point = this;

            return point.owner.formatPointValue(point, format);
        }
    });
    deepExtend(Bar.fn, PointEventsMixin);

    var CategoricalChart = ChartElement.extend({
        init: function(plotArea, options) {
            var chart = this;

            ChartElement.fn.init.call(chart, options);

            chart.plotArea = plotArea;

            // Value axis ranges grouped by axis name, e.g.:
            // primary: { min: 0, max: 1 }
            chart.valueAxisRanges = {};

            chart.points = [];
            chart.categoryPoints = [];
            chart.seriesPoints = [];

            chart.render();
        },

        options: {
            series: [],
            invertAxes: false,
            isStacked: false
        },

        render: function() {
            var chart = this;

            chart.traverseDataPoints(proxy(chart.addValue, chart));
        },

        addValue: function(data, category, categoryIx, series, seriesIx) {
            var chart = this,
                value = data.value,
                point,
                categoryPoints = chart.categoryPoints[categoryIx],
                seriesPoints = chart.seriesPoints[seriesIx];

            if (!categoryPoints) {
                chart.categoryPoints[categoryIx] = categoryPoints = [];
            }

            if (!seriesPoints) {
                chart.seriesPoints[seriesIx] = seriesPoints = [];
            }

            chart.updateRange(value, categoryIx, series);

            point = chart.createPoint(data, category, categoryIx, series, seriesIx);
            if (point) {
                point.category = category;
                point.series = series;
                point.seriesIx = seriesIx;
                point.owner = chart;
                point.dataItem = series.data[categoryIx];
            }

            chart.points.push(point);
            seriesPoints.push(point);
            categoryPoints.push(point);
        },

        updateRange: function(value, categoryIx, series) {
            var chart = this,
                axisName = series.axis || PRIMARY,
                axisRange = chart.valueAxisRanges[axisName];

            if (defined(value)) {
                axisRange = chart.valueAxisRanges[axisName] =
                    axisRange || { min: MAX_VALUE, max: MIN_VALUE };

                axisRange.min = math.min(axisRange.min, value);
                axisRange.max = math.max(axisRange.max, value);
            }
        },

        seriesValueAxis: function(series) {
            return this.plotArea.namedValueAxes[(series || {}).axis || PRIMARY];
        },

        reflow: function(targetBox) {
            var chart = this,
                options = chart.options,
                invertAxes = options.invertAxes,
                plotArea = chart.plotArea,
                pointIx = 0,
                categorySlots = chart.categorySlots = [],
                chartPoints = chart.points,
                categoryAxis = plotArea.categoryAxis,
                valueAxis,
                axisCrossingValue,
                point;

            chart.traverseDataPoints(function(data, category, categoryIx, currentSeries) {
                var value = data.value;

                valueAxis = chart.seriesValueAxis(currentSeries);
                axisCrossingValue = valueAxis.options.axisCrossingValue;
                point = chartPoints[pointIx++];

                if (point && point.plotValue) {
                    value = point.plotValue;
                }

                var categorySlot = chart.categorySlot(categoryAxis, categoryIx, valueAxis),
                    valueSlot = chart.valueSlot(valueAxis, value),
                    slotX = invertAxes ? valueSlot : categorySlot,
                    slotY = invertAxes ? categorySlot : valueSlot,
                    pointSlot = new Box2D(slotX.x1, slotY.y1, slotX.x2, slotY.y2),
                    aboveAxis = valueAxis.options.reverse ?
                                    value < axisCrossingValue : value >= axisCrossingValue;

                if (point) {
                    point.options.aboveAxis = aboveAxis;
                    point.reflow(pointSlot);
                }

                if (!categorySlots[categoryIx]) {
                    categorySlots[categoryIx] = categorySlot;
                }
            });

            chart.reflowCategories(categorySlots);

            chart.box = targetBox;
        },

        reflowCategories: function() { },

        valueSlot: function(valueAxis, value) {
            return valueAxis.getSlot(value);
        },

        categorySlot: function(categoryAxis, categoryIx) {
            return categoryAxis.getSlot(categoryIx);
        },

        traverseDataPoints: function(callback) {
            var chart = this,
                options = chart.options,
                series = options.series,
                categories = chart.plotArea.options.categoryAxis.categories || [],
                count = categoriesCount(series),
                valueFields = chart.valueFields(),
                bindableFields = chart.bindableFields(),
                categoryIx,
                seriesIx,
                pointData,
                currentCategory,
                currentSeries,
                seriesCount = series.length;

            for (categoryIx = 0; categoryIx < count; categoryIx++) {
                for (seriesIx = 0; seriesIx < seriesCount; seriesIx++) {
                    currentCategory = categories[categoryIx];
                    currentSeries = series[seriesIx];
                    pointData = bindPoint(currentSeries, categoryIx, valueFields, bindableFields);

                    callback(pointData, currentCategory, categoryIx, currentSeries, seriesIx);
                }
            }
        },

        valueFields: function() {
            return ["value"];
        },

        bindableFields: function() {
            return [];
        },

        formatPointValue: function(point, format) {
            return autoFormat(format, point.value);
        }
    });

    var BarChart = CategoricalChart.extend({
        init: function(plotArea, options) {
            var chart = this;

            chart._groupTotals = {};
            chart._groups = [];

            CategoricalChart.fn.init.call(chart, plotArea, options);
        },

        render: function() {
            var chart = this;

            CategoricalChart.fn.render.apply(chart);
            chart.computeAxisRanges();
        },

        createPoint: function(data, category, categoryIx, series, seriesIx) {
            var barChart = this,
                value = data.value,
                options = barChart.options,
                children = barChart.children,
                isStacked = barChart.options.isStacked,
                labelOptions = deepExtend({}, series.labels),
                bar,
                cluster;

            if (isStacked) {
                if (labelOptions.position == OUTSIDE_END) {
                    labelOptions.position = INSIDE_END;
                }
            }

            bar = new Bar(value,
                deepExtend({}, {
                    vertical: !options.invertAxes,
                    overlay: series.overlay,
                    labels: labelOptions,
                    isStacked: isStacked
                }, series, {
                    color: data.fields.color || undefined
                }));

            cluster = children[categoryIx];
            if (!cluster) {
                cluster = new ClusterLayout({
                    vertical: options.invertAxes,
                    gap: options.gap,
                    spacing: options.spacing
                });
                barChart.append(cluster);
            }

            if (isStacked) {
                var stackWrap = barChart.getStackWrap(series, cluster),
                    positiveStack,
                    negativeStack;

                if (stackWrap.children.length === 0) {
                    positiveStack = new StackLayout({
                        vertical: !options.invertAxes
                    });
                    negativeStack = new StackLayout({
                        vertical: !options.invertAxes,
                        isReversed: true
                    });

                    stackWrap.append(positiveStack, negativeStack);
                } else {
                    positiveStack = stackWrap.children[0];
                    negativeStack = stackWrap.children[1];
                }

                if (value > 0) {
                    positiveStack.append(bar);
                } else {
                    negativeStack.append(bar);
                }
            } else {
                cluster.append(bar);
            }

            return bar;
        },

        getStackWrap: function(series, cluster) {
            var wraps = cluster.children,
                stackGroup = series.stack,
                stackWrap,
                i,
                length = wraps.length;

            if (typeof stackGroup === STRING) {
                for (i = 0; i < length; i++) {
                    if (wraps[i]._stackGroup === stackGroup) {
                        stackWrap = wraps[i];
                        break;
                    }
                }
            } else {
                stackWrap = wraps[0];
            }

            if (!stackWrap) {
                stackWrap = new ChartElement();
                stackWrap._stackGroup = stackGroup;
                cluster.append(stackWrap);
            }

            return stackWrap;
        },

        updateRange: function(value, categoryIx, series) {
            var chart = this,
                isStacked = chart.options.isStacked,
                totals = chart.groupTotals(series.stack),
                positive = totals.positive,
                negative = totals.negative;

            if (defined(value)) {
                if (isStacked) {
                    incrementSlot(value > 0 ? positive : negative, categoryIx, value);
                } else {
                    CategoricalChart.fn.updateRange.apply(chart, arguments);
                }
            }
        },

        computeAxisRanges: function() {
            var chart = this,
                isStacked = chart.options.isStacked,
                axisName,
                categoryTotals;

            if (isStacked) {
                axisName = chart.options.series[0].axis || PRIMARY;
                categoryTotals = chart.categoryTotals();
                chart.valueAxisRanges[axisName] = {
                    min: sparseArrayMin(categoryTotals.negative.concat(0)),
                    max: sparseArrayMax(categoryTotals.positive.concat(0))
                };
            }
        },

        seriesValueAxis: function(series) {
            var chart = this,
                options = chart.options;

            return CategoricalChart.fn.seriesValueAxis.call(
                chart,
                options.isStacked ? chart.options.series[0] : series
            );
        },

        valueSlot: function(valueAxis, value) {
            return valueAxis.getSlot(value, this.options.isStacked ? 0 : undefined);
        },

        categorySlot: function(categoryAxis, categoryIx, valueAxis) {
            var chart = this,
                options = chart.options,
                categorySlot = categoryAxis.getSlot(categoryIx),
                stackAxis,
                zeroSlot;

            if (options.isStacked) {
                zeroSlot = valueAxis.getSlot(0, 0);
                stackAxis = options.invertAxes ? X : Y;
                categorySlot[stackAxis + 1] = categorySlot[stackAxis + 2] = zeroSlot[stackAxis + 1];
            }

            return categorySlot;
        },

        reflow: function(targetBox) {
            var chart = this;

            chart.setStacksDirection();

            CategoricalChart.fn.reflow.call(chart, targetBox);
        },

        setStacksDirection: function() {
            var chart = this,
                options = chart.options,
                series = options.series,
                count = categoriesCount(series),
                clusters = chart.children,
                categoryIx,
                seriesIx,
                currentSeries,
                valueAxis,
                seriesCount = series.length;

            for (seriesIx = 0; seriesIx < seriesCount; seriesIx++) {
                currentSeries = series[seriesIx];
                valueAxis = chart.seriesValueAxis(currentSeries);

                for (categoryIx = 0; categoryIx < count; categoryIx++) {
                    var cluster = clusters[categoryIx],
                        stackWrap = chart.getStackWrap(currentSeries, cluster),
                        stacks = stackWrap.children,
                        positiveStack = stacks[0],
                        negativeStack = stacks[1];

                    if (positiveStack && negativeStack) {
                        positiveStack.options.isReversed = valueAxis.options.reverse;
                        negativeStack.options.isReversed = !valueAxis.options.reverse;
                    }
                }
            }
        },

        reflowCategories: function(categorySlots) {
            var chart = this,
                children = chart.children,
                childrenLength = children.length,
                i;

            for (i = 0; i < childrenLength; i++) {
                children[i].reflow(categorySlots[i]);
            }
        },

        groupTotals: function(stackGroup) {
            var chart = this,
                groupName = typeof stackGroup === STRING ? stackGroup : "default",
                totals = chart._groupTotals[groupName];

            if (!totals) {
                totals = chart._groupTotals[groupName] = {
                    positive: [],
                    negative: []
                };

                chart._groups.push(groupName);
            }

            return totals;
        },

        categoryTotals: function() {
            var chart = this,
                groups = chart._groups,
                groupTotals = chart._groupTotals,
                name,
                totals,
                categoryTotals = { positive: [], negative: [] },
                i,
                length = groups.length;

            for (i = 0; i < length; i++) {
                name = groups[i];
                totals = groupTotals[name];
                append(categoryTotals.positive, totals.positive);
                append(categoryTotals.negative, totals.negative);
            }

            return categoryTotals;
        },

        bindableFields: function() {
            return ["color"];
        }
    });

    var ShapeElement = BoxElement.extend({
        init: function(options) {
            var marker = this;

            BoxElement.fn.init.call(marker, options);
        },

        options: {
            type: CIRCLE,
            align: CENTER,
            vAlign: CENTER
        },

        getViewElements: function(view, renderOptions) {
            var marker = this,
                options = marker.options,
                type = options.type,
                box = marker.paddingBox,
                element,
                elementOptions,
                halfWidth = box.width() / 2;

            if (!options.visible || !marker.hasBox()) {
                return [];
            }

            elementOptions = deepExtend(marker.elementStyle(), renderOptions);

            if (type === TRIANGLE) {
                element = view.createPolyline([
                    new Point2D(box.x1 + halfWidth, box.y1),
                    new Point2D(box.x1, box.y2),
                    new Point2D(box.x2, box.y2)
                ], true, elementOptions);
            } else if (type === CIRCLE) {
                element = view.createCircle(new Point2D(
                    round(box.x1 + halfWidth, COORD_PRECISION),
                    round(box.y1 + box.height() / 2, COORD_PRECISION)
                ), halfWidth, elementOptions);
            } else {
                element = view.createRect(box, elementOptions);
            }

            return [ element ];
        }
    });

    var LinePoint = ChartElement.extend({
        init: function(value, options) {
            var point = this;

            ChartElement.fn.init.call(point, options);

            point.value = value;
            point.options.id = uniqueId();
            point.makeDiscoverable();
        },

        options: {
            aboveAxis: true,
            vertical: true,
            markers: {
                visible: true,
                background: WHITE,
                size: LINE_MARKER_SIZE,
                type: CIRCLE,
                border: {
                    width: 2
                },
                opacity: 1
            },
            labels: {
                visible: false,
                position: ABOVE,
                margin: getSpacing(3),
                padding: getSpacing(4),
                animation: {
                    type: FADEIN,
                    delay: INITIAL_ANIMATION_DURATION
                }
            }
        },

        render: function() {
            var point = this,
                options = point.options,
                markers = options.markers,
                labels = options.labels,
                markerBackground = markers.background,
                markerBorder = deepExtend({}, markers.border),
                labelText = point.value;

            if (point._rendered) {
                return;
            } else {
                point._rendered = true;
            }

            if (!defined(markerBorder.color)) {
                markerBorder.color =
                    new Color(markerBackground).brightness(BAR_BORDER_BRIGHTNESS).toHex();
            }

            point.marker = new ShapeElement({
                id: point.options.id,
                visible: markers.visible,
                type: markers.type,
                width: markers.size,
                height: markers.size,
                background: markerBackground,
                border: markerBorder,
                opacity: markers.opacity,
                zIndex: markers.zIndex,
                animation: markers.animation
            });

            point.append(point.marker);

            if (labels.visible) {
                if (labels.template) {
                    var labelTemplate = template(labels.template);
                    labelText = labelTemplate({
                        dataItem: point.dataItem,
                        category: point.category,
                        value: point.value,
                        series: point.series
                    });
                } else if (labels.format) {
                    labelText = point.formatValue(labels.format);
                }
                point.label = new TextBox(labelText,
                    deepExtend({
                        id: uniqueId(),
                        align: CENTER,
                        vAlign: CENTER,
                        margin: {
                            left: 5,
                            right: 5
                        }
                    }, labels)
                );
                point.append(point.label);
            }
        },

        markerBox: function() {
            return this.marker.box;
        },

        reflow: function(targetBox) {
            var point = this,
                options = point.options,
                vertical = options.vertical,
                aboveAxis = options.aboveAxis,
                childBox;

            point.render();

            point.box = targetBox;
            childBox = targetBox.clone();

            if (vertical) {
                if (aboveAxis) {
                    childBox.y1 -= childBox.height();
                } else {
                    childBox.y2 += childBox.height();
                }
            } else {
                if (aboveAxis) {
                    childBox.x1 += childBox.width();
                } else {
                    childBox.x2 -= childBox.width();
                }
            }

            point.marker.reflow(childBox);
            point.reflowLabel(childBox);
        },

        reflowLabel: function(box) {
            var point = this,
                options = point.options,
                marker = point.marker,
                label = point.label,
                anchor = options.labels.position;

            if (label) {
                anchor = anchor === ABOVE ? TOP : anchor;
                anchor = anchor === BELOW ? BOTTOM : anchor;

                label.reflow(box);
                label.box.alignTo(marker.box, anchor);
                label.reflow(label.box);
            }
        },

        highlightOverlay: function(view, options) {
            var element = this,
                marker = element.marker;

            options = deepExtend({ data: { modelId: element.options.modelId } }, options);

            return marker.getViewElements(view, deepExtend(options, {
                fill: marker.options.border.color,
                fillOpacity: 1,
                strokeOpacity: 0
            }))[0];
        },

        tooltipAnchor: function(tooltipWidth, tooltipHeight) {
            var point = this,
                markerBox = point.marker.box,
                aboveAxis = point.options.aboveAxis;

            return new Point2D(
                markerBox.x2 + TOOLTIP_OFFSET,
                aboveAxis ? markerBox.y1 - tooltipHeight : markerBox.y2
            );
        },

        formatValue: function(format) {
            var point = this;

            return point.owner.formatPointValue(point, format);
        }
    });
    deepExtend(LinePoint.fn, PointEventsMixin);

    var Bubble = LinePoint.extend({
        init: function(value, options) {
            var point = this;

            LinePoint.fn.init.call(point, value, options);

            point.category = value.category;
        },

        options: {
            labels: {
                position: CENTER
            },
            highlight: {
                opacity: 1,
                border: {
                    width: 1
                }
            }
        },

        highlightOverlay: function(view) {
            var element = this,
                options = element.options,
                highlight = options.highlight,
                borderWidth = highlight.border.width,
                markers = options.markers,
                center = element.box.center(),
                radius = markers.size / 2 - borderWidth / 2,
                borderColor =
                    new Color(markers.background)
                    .brightness(BAR_BORDER_BRIGHTNESS)
                    .toHex();

            return view.createCircle(center, radius, {
                data: { modelId: element.options.modelId },
                stroke: borderColor,
                strokeWidth: borderWidth
            });
        },

        toggleHighlight: function(view, on) {
            var element = this,
                opacity = element.options.highlight.opacity;

            element.highlighted = !element.highlighted;

            var marker = element.marker.getViewElements(view, {
                fillOpacity: element.highlighted ? opacity : undefined
            })[0];

            marker.refresh(doc.getElementById(this.options.id));

        }
    });

    var LineSegment = ChartElement.extend({
        init: function(linePoints, series, seriesIx) {
            var segment = this;

            ChartElement.fn.init.call(segment);

            segment.linePoints = linePoints;
            segment.series = series;
            segment.seriesIx = seriesIx;
            segment.options.id = uniqueId();

            segment.makeDiscoverable();
        },

        options: {},

        points: function(visualPoints) {
            var segment = this,
                linePoints = segment.linePoints.concat(visualPoints || []),
                points = [],
                i,
                length = linePoints.length,
                pointCenter;

            for (i = 0; i < length; i++) {
                pointCenter = linePoints[i].markerBox().center();
                points.push(new Point2D(pointCenter.x, pointCenter.y));
            }

            return points;
        },

        getViewElements: function(view) {
            var segment = this,
                series = segment.series;

            ChartElement.fn.getViewElements.call(segment, view);

            return [
                view.createPolyline(segment.points(), false, {
                    id: segment.options.id,
                    stroke: series.color,
                    strokeWidth: series.width,
                    strokeOpacity: series.opacity,
                    fill: "",
                    dashType: series.dashType,
                    data: { modelId: segment.options.modelId },
                    zIndex: -1
                })
            ];
        },

        aliasFor: function(e, coords) {
            var segment = this,
                seriesIx = segment.seriesIx;

            return segment.parent.getNearestPoint(coords.x, coords.y, seriesIx);
        }
    });

    var LineChartMixin = {
        renderSegments: function() {
            var chart = this,
                options = chart.options,
                series = options.series,
                seriesPoints = chart.seriesPoints,
                currentSeries,
                seriesIx,
                seriesCount = seriesPoints.length,
                currentSeriesPoints,
                linePoints,
                point,
                pointIx,
                pointCount,
                segments = [];

            for (seriesIx = 0; seriesIx < seriesCount; seriesIx++) {
                currentSeriesPoints = seriesPoints[seriesIx];
                pointCount = currentSeriesPoints.length;
                currentSeries = series[seriesIx];
                linePoints = [];

                for (pointIx = 0; pointIx < pointCount; pointIx++) {
                    point = currentSeriesPoints[pointIx];
                    if (point) {
                        linePoints.push(point);
                    } else if (currentSeries.missingValues !== INTERPOLATE) {
                        if (linePoints.length > 1) {
                            segments.push(
                                chart.createSegment(
                                    linePoints, currentSeries, seriesIx, last(segments)
                                )
                            );
                        }
                        linePoints = [];
                    }
                }

                if (linePoints.length > 1) {
                    segments.push(
                        chart.createSegment(
                            linePoints, currentSeries, seriesIx, last(segments)
                        )
                    );
                }
            }

            chart._segments = segments;
            chart.append.apply(chart, segments);
        },

        createSegment: function(linePoints, currentSeries, seriesIx) {
            return new LineSegment(linePoints, currentSeries, seriesIx);
        },

        getNearestPoint: function(x, y, seriesIx) {
            var chart = this,
                invertAxes = chart.options.invertAxes,
                axis = invertAxes ? Y : X,
                pos = invertAxes ? y : x,
                points = chart.seriesPoints[seriesIx],
                nearestPointDistance = MAX_VALUE,
                pointsLength = points.length,
                currentPoint,
                pointBox,
                pointDistance,
                nearestPoint,
                i;

            for (i = 0; i < pointsLength; i++) {
                currentPoint = points[i];

                if (currentPoint && defined(currentPoint.value) && currentPoint.value !== null) {
                    pointBox = currentPoint.box;
                    pointDistance = math.abs(pointBox.center()[axis] - pos);

                    if (pointDistance < nearestPointDistance) {
                        nearestPoint = currentPoint;
                        nearestPointDistance = pointDistance;
                    }
                }
            }

            return nearestPoint;
        }
    };

    var LineChart = CategoricalChart.extend({
        init: function(plotArea, options) {
            var chart = this;

            chart._stackAxisRange = { min: MAX_VALUE, max: MIN_VALUE };
            chart._categoryTotals = [];
            chart.makeDiscoverable();

            CategoricalChart.fn.init.call(chart, plotArea, options);
        },

        render: function() {
            var chart = this;

            CategoricalChart.fn.render.apply(chart);

            chart.computeAxisRanges();
            chart.renderSegments();
        },

        createPoint: function(data, category, categoryIx, series, seriesIx) {
            var chart = this,
                value = data.value,
                options = chart.options,
                isStacked = options.isStacked,
                categoryPoints = chart.categoryPoints[categoryIx],
                stackPoint,
                plotValue = 0;

            if (!defined(value) || value === null) {
                if (series.missingValues === ZERO) {
                    value = 0;
                } else {
                    return null;
                }
            }

            var point = new LinePoint(value,
                deepExtend({
                    vertical: !options.invertAxes,
                    markers: {
                        border: {
                            color: series.color
                        }
                    }
                }, series)
            );

            if (isStacked) {
                stackPoint = lastValue(categoryPoints);
                if (stackPoint) {
                    plotValue = stackPoint.plotValue;
                }

                point.plotValue = value + plotValue;
            }

            chart.append(point);

            return point;
        },

        updateRange: function(value, categoryIx, series) {
            var chart = this,
                isStacked = chart.options.isStacked,
                stackAxisRange = chart._stackAxisRange,
                totals = chart._categoryTotals;

            if (defined(value)) {
                if (isStacked) {
                    incrementSlot(totals, categoryIx, value);

                    stackAxisRange.min = math.min(stackAxisRange.min, sparseArrayMin(totals));
                    stackAxisRange.max = math.max(stackAxisRange.max, sparseArrayMax(totals));
                } else {
                    CategoricalChart.fn.updateRange.apply(chart, arguments);
                }
            }
        },

        computeAxisRanges: function() {
            var chart = this,
                isStacked = chart.options.isStacked,
                axisName;

            if (isStacked) {
                axisName = chart.options.series[0].axis || PRIMARY;
                chart.valueAxisRanges[axisName] = chart._stackAxisRange;
            }
        },

        getViewElements: function(view) {
            var chart = this,
                elements = CategoricalChart.fn.getViewElements.call(chart, view),
                group = view.createGroup({
                    animation: {
                        type: CLIP
                    }
                });

            group.children = elements;
            return [group];
        }
    });
    deepExtend(LineChart.fn, LineChartMixin);

    var AreaSegment = LineSegment.extend({
        init: function(linePoints, stackPoints, currentSeries, seriesIx) {
            var segment = this;

            segment.stackPoints = stackPoints;

            LineSegment.fn.init.call(segment, linePoints, currentSeries, seriesIx);
        },

        points: function() {
            var segment = this,
                chart = segment.parent,
                stack = chart.options.isStacked && segment.seriesIx > 0,
                plotArea = chart.plotArea,
                invertAxes = chart.options.invertAxes,
                axisLineBox = plotArea.categoryAxis.lineBox(),
                end = invertAxes ? axisLineBox.x1 : axisLineBox.y1,
                stackPoints = segment.stackPoints,
                points = LineSegment.fn.points.call(segment, stackPoints),
                firstPoint,
                lastPoint;

            if (!stack && points.length > 1) {
                firstPoint = points[0];
                lastPoint = last(points);

                if (invertAxes) {
                    points.unshift(new Point2D(end, firstPoint.y));
                    points.push(new Point2D(end, lastPoint.y));
                } else {
                    points.unshift(new Point2D(firstPoint.x, end));
                    points.push(new Point2D(lastPoint.x, end));
                }
            }

            return points;
        },

        getViewElements: function(view) {
            var segment = this,
                series = segment.series,
                lineOptions = deepExtend({
                        color: series.color,
                        opacity: series.opacity
                    }, series.line
                );

            ChartElement.fn.getViewElements.call(segment, view);

            return [
                view.createPolyline(segment.points(), true, {
                    id: segment.options.id,
                    stroke: lineOptions.color,
                    strokeWidth: lineOptions.width,
                    strokeOpacity: lineOptions.opacity,
                    dashType: lineOptions.dashType,
                    fillOpacity: series.opacity,
                    fill: series.color,
                    stack: series.stack,
                    data: { modelId: segment.options.modelId },
                    zIndex: -1
                })
            ];
        }
    });

    var AreaChart = LineChart.extend({
        createSegment: function(linePoints, currentSeries, seriesIx, prevSegment) {
            var chart = this,
                options = chart.options,
                stackPoints;

            if (options.isStacked && seriesIx > 0) {
                stackPoints = prevSegment.linePoints.slice(0).reverse();
            }

            return new AreaSegment(linePoints, stackPoints, currentSeries, seriesIx);
        }
    });

    var ScatterChart = ChartElement.extend({
        init: function(plotArea, options) {
            var chart = this;

            ChartElement.fn.init.call(chart, options);

            chart.plotArea = plotArea;

            // X and Y axis ranges grouped by name, e.g.:
            // primary: { min: 0, max: 1 }
            chart.xAxisRanges = {};
            chart.yAxisRanges = {};

            chart.points = [];
            chart.seriesPoints = [];

            chart.render();
        },

        options: {
            series: [],
            tooltip: {
                format: "{0}, {1}"
            },
            labels: {
                format: "{0}, {1}"
            }
        },

        render: function() {
            var chart = this;

            chart.traverseDataPoints(proxy(chart.addValue, chart));
        },

        addValue: function(value, fields) {
            var chart = this,
                point,
                x = value.x,
                y = value.y,
                seriesIx = fields.seriesIx,
                seriesPoints = chart.seriesPoints[seriesIx];

            chart.updateRange(value, fields.series);

            if (defined(x) && x !== null && defined(y) && y !== null) {
                point = chart.createPoint(value, fields.series, seriesIx, fields);
                if (point) {
                    extend(point, fields);
                }
            }

            chart.points.push(point);
            seriesPoints.push(point);
        },

        updateRange: function(value, series) {
            var chart = this,
                x = value.x,
                y = value.y,
                xAxisName = series.xAxis || PRIMARY,
                yAxisName = series.yAxis || PRIMARY,
                xAxisRange = chart.xAxisRanges[xAxisName],
                yAxisRange = chart.yAxisRanges[yAxisName];

            if (defined(x) && x !== null) {
                xAxisRange = chart.xAxisRanges[xAxisName] =
                    xAxisRange || { min: MAX_VALUE, max: MIN_VALUE };

                xAxisRange.min = math.min(xAxisRange.min, x);
                xAxisRange.max = math.max(xAxisRange.max, x);
            }

            if (defined(y) && y !== null) {
                yAxisRange = chart.yAxisRanges[yAxisName] =
                    yAxisRange || { min: MAX_VALUE, max: MIN_VALUE };

                yAxisRange.min = math.min(yAxisRange.min, y);
                yAxisRange.max = math.max(yAxisRange.max, y);
            }
        },

        createPoint: function(value, series, seriesIx) {
            var chart = this,
                point;

            point = new LinePoint(value,
                deepExtend({
                    markers: {
                        border: {
                            color: series.color
                        },
                        opacity: series.opacity
                    },
                    tooltip: {
                        format: chart.options.tooltip.format
                    },
                    labels: {
                        format: chart.options.labels.format
                    }
                }, series)
            );

            chart.append(point);

            return point;
        },

        seriesAxes: function(series) {
            var plotArea = this.plotArea,
                xAxis = series.xAxis || PRIMARY,
                yAxis = series.yAxis || PRIMARY;

            return {
                x: plotArea.namedXAxes[xAxis],
                y: plotArea.namedYAxes[yAxis]
            };
        },

        reflow: function(targetBox) {
            var chart = this,
                chartPoints = chart.points,
                pointIx = 0,
                point,
                seriesAxes;

            chart.traverseDataPoints(function(value, fields) {
                point = chartPoints[pointIx++];
                seriesAxes = chart.seriesAxes(fields.series);

                var slotX = seriesAxes.x.getSlot(value.x, value.x),
                    slotY = seriesAxes.y.getSlot(value.y, value.y),
                    pointSlot = new Box2D(slotX.x1, slotY.y1, slotX.x2, slotY.y2);

                if (point) {
                    point.reflow(pointSlot);
                }
            });

            chart.box = targetBox;
        },

        getViewElements: function(view) {
            var chart = this,
                elements = ChartElement.fn.getViewElements.call(chart, view),
                group = view.createGroup({
                    animation: {
                        type: CLIP
                    }
                });

            group.children = elements;
            return [group];
        },

        traverseDataPoints: function(callback) {
            var chart = this,
                options = chart.options,
                series = options.series,
                seriesPoints = chart.seriesPoints,
                valueFields = chart.valueFields(),
                bindableFields = chart.bindableFields(),
                pointIx,
                seriesIx,
                currentSeries,
                currentSeriesPoints,
                pointData,
                value,
                fields;

            for (seriesIx = 0; seriesIx < series.length; seriesIx++) {
                currentSeries = series[seriesIx];

                currentSeriesPoints = seriesPoints[seriesIx];
                if (!currentSeriesPoints) {
                    seriesPoints[seriesIx] = [];
                }

                for (pointIx = 0; pointIx < currentSeries.data.length; pointIx++) {
                    pointData = bindPoint(currentSeries, pointIx, valueFields, bindableFields);
                    value = pointData.value;
                    fields = pointData.fields;

                   callback(value, deepExtend({
                       pointIx: pointIx,
                       series: currentSeries,
                       seriesIx: seriesIx,
                       dataItem: currentSeries.data[pointIx],
                       owner: chart
                   }, fields));
                }
            }
        },

        valueFields: function() {
            return ["x", "y"];
        },

        bindableFields: function() {
            return [];
        },

        formatPointValue: function(point, format) {
            var value = point.value;
            return autoFormat(format, value.x, value.y);
        }
    });

    var ScatterLineChart = ScatterChart.extend({
        render: function() {
            var chart = this;

            ScatterChart.fn.render.call(chart);

            chart.renderSegments();
        }
    });
    deepExtend(ScatterLineChart.fn, LineChartMixin);

    var BubbleChart = ScatterChart.extend({
        options: {
            tooltip: {
                format: "{3}"
            },
            labels: {
                format: "{3}"
            }
        },

        addValue: function(value, fields) {
            var chart = this,
                color,
                series = fields.series,
                negativeValues = series.negativeValues,
                seriesColors = chart.plotArea.options.seriesColors || [],
                visible = true;

            color = fields.color || series.color ||
                seriesColors[fields.pointIx % seriesColors.length];

            if (value.size < 0) {
                color = negativeValues.color || color;
                visible = negativeValues.visible;
            }

            fields.color = color;

            if (visible) {
                ScatterChart.fn.addValue.call(this, value, fields);
            }
        },

        reflow: function(box) {
            var chart = this;

            chart.updateBubblesSize(box);
            ScatterChart.fn.reflow.call(chart, box);
        },

        createPoint: function(value, series, seriesIx, fields) {
            var chart = this,
                point,
                pointsCount = series.data.length,
                delay = fields.pointIx * (INITIAL_ANIMATION_DURATION / pointsCount),
                animationOptions = {
                    delay: delay,
                    duration: INITIAL_ANIMATION_DURATION - delay,
                    type: BUBBLE
                };

            point = new Bubble(value, deepExtend({
                    tooltip: {
                        format: chart.options.tooltip.format
                    },
                    labels: {
                        format: chart.options.labels.format,
                        animation: animationOptions
                    }
                },
                series,
                {
                    color: fields.color,
                    markers: {
                        type: CIRCLE,
                        background: fields.color,
                        border: series.border,
                        opacity: series.opacity,
                        animation: animationOptions
                    }
                })
            );

            chart.append(point);

            return point;
        },

        updateBubblesSize: function(box) {
            var chart = this,
                options = chart.options,
                series = options.series,
                boxSize = math.min(box.width(), box.height()),
                seriesIx,
                pointIx;

            for (seriesIx = 0; seriesIx < series.length; seriesIx++) {
                var currentSeries = series[seriesIx],
                    seriesPoints = chart.seriesPoints[seriesIx],
                    seriesMaxSize = chart.maxSize(seriesPoints),
                    minSize = currentSeries.minSize || math.max(boxSize * 0.02, 10),
                    maxSize = currentSeries.maxSize || boxSize * 0.2,
                    minR = minSize / 2,
                    maxR = maxSize / 2,
                    minArea = math.PI * minR * minR,
                    maxArea = math.PI * maxR * maxR,
                    areaRange = maxArea - minArea,
                    areaRatio = areaRange / seriesMaxSize;

                for (pointIx = 0; pointIx < seriesPoints.length; pointIx++) {
                    var point = seriesPoints[pointIx],
                        area = math.abs(point.value.size) * areaRatio,
                        r = math.sqrt((minArea + area) / math.PI);

                    deepExtend(point.options, {
                        markers: {
                            size: r * 2,
                            zIndex: maxR - r
                        },
                        labels: {
                            zIndex: maxR - r + 1
                        }
                    });
                }
            }
        },

        maxSize: function(seriesPoints) {
            var length = seriesPoints.length,
                max = 0,
                i,
                size;

            for (i = 0; i < length; i++) {
                size = seriesPoints[i].value.size;
                max = math.max(max, math.abs(size));
            }

            return max;
        },

        valueFields: function() {
            return ["x", "y", "size"];
        },

        bindableFields: function() {
            return ["color", "category", "visibleInLegend"];
        },

        getViewElements: function(view) {
            var chart = this;

            return ChartElement.fn.getViewElements.call(chart, view);
        },

        formatPointValue: function(point, format) {
            var value = point.value;
            return autoFormat(format, value.x, value.y, value.size, point.category);
        }
    });

    var PieSegment = ChartElement.extend({
        init: function(value, sector, options) {
            var segment = this;

            segment.value = value;
            segment.sector = sector;
            segment.makeDiscoverable();

            ChartElement.fn.init.call(segment, options);
        },

        options: {
            color: WHITE,
            overlay: {
                gradient: ROUNDED_BEVEL
            },
            border: {
                width: 0.5
            },
            labels: {
                visible: false,
                distance: 35,
                font: DEFAULT_FONT,
                margin: getSpacing(0.5),
                align: CIRCLE,
                zIndex: 1,
                position: OUTSIDE_END
            },
            animation: {
                type: PIE
            },
            highlight: {
                visible: true,
                border: {
                    width: 1
                }
            }
        },

        render: function() {
            var segment = this,
                options = segment.options,
                labels = options.labels,
                labelText = segment.value,
                labelTemplate;

            if (segment._rendered) {
                return;
            } else {
                segment._rendered = true;
            }

            if (labels.template) {
                labelTemplate = template(labels.template);
                labelText = labelTemplate({
                    dataItem: segment.dataItem,
                    category: segment.category,
                    value: segment.value,
                    series: segment.series,
                    percentage: segment.percentage
                });
            } else if (labels.format) {
                labelText = autoFormat(labels.format, labelText);
            }

            if (labels.visible && labelText) {
                segment.label = new TextBox(labelText, deepExtend({}, labels, {
                        id: uniqueId(),
                        align: CENTER,
                        vAlign: "",
                        animation: {
                            type: FADEIN,
                            delay: segment.animationDelay
                        }
                    }));

                segment.append(segment.label);
            }
        },

        reflow: function(targetBox) {
            var segment = this;

            segment.render();

            segment.box = targetBox;

            segment.reflowLabel();
        },

        reflowLabel: function() {
            var segment = this,
                sector = segment.sector.clone(),
                options = segment.options,
                label = segment.label,
                labelsOptions = options.labels,
                labelsDistance = labelsOptions.distance,
                lp,
                x1,
                angle = sector.middle(),
                labelWidth,
                labelHeight;

            if (label) {
                labelHeight = label.box.height();
                labelWidth = label.box.width();
                if (labelsOptions.position == CENTER) {
                    sector.r = math.abs((sector.r - labelHeight) / 2) + labelHeight;
                    lp = sector.point(angle);
                    label.reflow(new Box2D(lp.x, lp.y - labelHeight / 2, lp.x, lp.y));
                } else if (labelsOptions.position == INSIDE_END) {
                    sector.r = sector.r - labelHeight / 2;
                    lp = sector.point(angle);
                    label.reflow(new Box2D(lp.x, lp.y - labelHeight / 2, lp.x, lp.y));
                } else {
                    lp = sector.clone().expand(labelsDistance).point(angle);
                    if (lp.x >= sector.c.x) {
                        x1 = lp.x + labelWidth;
                        label.orientation = RIGHT;
                    } else {
                        x1 = lp.x - labelWidth;
                        label.orientation = LEFT;
                    }
                    label.reflow(new Box2D(x1, lp.y - labelHeight, lp.x, lp.y));
                }
            }
        },

        getViewElements: function(view) {
            var segment = this,
                sector = segment.sector,
                options = segment.options,
                borderOptions = options.border || {},
                border = borderOptions.width > 0 ? {
                    stroke: borderOptions.color,
                    strokeWidth: borderOptions.width,
                    dashType: borderOptions.dashType
                } : {},
                elements = [],
                overlay = options.overlay;

            if (overlay) {
                overlay = deepExtend({}, options.overlay, {
                    r: sector.r,
                    ir: sector.ir,
                    cx: sector.c.x,
                    cy: sector.c.y,
                    bbox: sector.getBBox()
                });
            }

            if (segment.value) {
                elements.push(segment.createSegment(view, sector, deepExtend({
                    id: options.id,
                    fill: options.color,
                    overlay: overlay,
                    fillOpacity: options.opacity,
                    strokeOpacity: options.opacity,
                    animation: deepExtend(options.animation, {
                        delay: segment.animationDelay
                    }),
                    data: { modelId: options.modelId },
                    zIndex: options.zIndex,
                    singleSegment: (segment.options.data || []).length === 1
                }, border)));
            }

            append(elements,
                ChartElement.fn.getViewElements.call(segment, view)
            );

            return elements;
        },

        createSegment: function(view, sector, options) {
            if (options.singleSegment) {
                return view.createCircle(sector.c, sector.r, options);
            } else {
                return view.createSector(sector, options);
            }
        },

        highlightOverlay: function(view, options) {
            var segment = this,
                highlight = segment.options.highlight || {},
                border = highlight.border || {},
                outlineId = segment.options.id + OUTLINE_SUFFIX,
                element;

            options = deepExtend({}, options, { id: outlineId });

            if (segment.value !== 0) {
                element = segment.createSegment(view, segment.sector, deepExtend({}, options, {
                    fill: highlight.color,
                    fillOpacity: highlight.opacity,
                    strokeOpacity: border.opacity,
                    strokeWidth: border.width,
                    stroke: border.color,
                    data: { modelId: segment.options.modelId }
                }));
            }

            return element;
        },

        tooltipAnchor: function(tooltipWidth, tooltipHeight) {
            var point = this,
                sector = point.sector.clone().expand(15),
                w = tooltipWidth / 2,
                h = tooltipHeight / 2,
                midAndle = sector.middle(),
                pointAngle = midAndle * DEGREE,
                lp = sector.point(midAndle),
                cx = lp.x - w,
                cy = lp.y - h,
                sa = math.sin(pointAngle),
                ca = math.cos(pointAngle);

            if (math.abs(sa) < 0.9) {
                cx += w * -ca / math.abs(ca);
            }

            if (math.abs(ca) < 0.9) {
                cy += h * -sa / math.abs(sa);
            }

            return new Point2D(cx, cy);
        },

        formatValue: function(format) {
            var point = this;

            return point.owner.formatPointValue(point, format);
        }
    });
    deepExtend(PieSegment.fn, PointEventsMixin);

    var PieChart = ChartElement.extend({
        init: function(plotArea, options) {
            var chart = this;

            ChartElement.fn.init.call(chart, options);

            chart.plotArea = plotArea;
            chart.segments = [];
            chart.legendItems = [];
            chart.render();
        },

        options: {
            startAngle: 90,
            connectors: {
                width: 1,
                color: "#939393",
                padding: 4
            }
        },

        render: function() {
            var chart = this;

            chart.traverseDataPoints(proxy(chart.addValue, chart));
        },

        traverseDataPoints: function(callback) {
            var chart = this,
                options = chart.options,
                colors = chart.plotArea.options.seriesColors || [],
                startAngle = options.startAngle,
                colorsCount = colors.length,
                series = options.series,
                seriesCount = series.length,
                overlayId = uniqueId(),
                valueFields = chart.valueFields(),
                bindableFields = chart.bindableFields(),
                currentSeries,
                pointData,
                fields,
                seriesIx,
                angle,
                data,
                anglePerValue,
                value,
                explode,
                total,
                currentAngle,
                i;

            for (seriesIx = 0; seriesIx < seriesCount; seriesIx++) {
                currentSeries = series[seriesIx];
                data = currentSeries.data;
                total = chart.pointsTotal(currentSeries);
                anglePerValue = 360 / total;
                currentAngle = startAngle;
                if (seriesIx != seriesCount - 1) {
                    if (currentSeries.labels.position == OUTSIDE_END) {
                        currentSeries.labels.position = CENTER;
                    }
                }

                for (i = 0; i < data.length; i++) {
                    pointData = bindPoint(currentSeries, i, valueFields, bindableFields);
                    value = pointData.value;
                    fields = pointData.fields;
                    angle = round(value * anglePerValue, DEFAULT_PRECISION);
                    explode = data.length != 1 && !!fields.explode;
                    currentSeries.color = fields.color || colors[i % colorsCount];

                    callback(value, new Ring(null, 0, 0, currentAngle, angle), {
                        owner: chart,
                        category: fields.category || "",
                        categoryIx: i,
                        series: currentSeries,
                        seriesIx: seriesIx,
                        dataItem: data[i],
                        percentage: value / total,
                        explode: explode,
                        visibleInLegend: fields.visibleInLegend,
                        overlay: {
                            id: overlayId + seriesIx
                        },
                        zIndex: seriesCount - seriesIx,
                        animationDelay: chart.animationDelay(i, seriesIx, seriesCount)
                    });

                    currentAngle += angle;
                }
            }
        },

        valueFields: function() {
            return ["value"];
        },

        bindableFields: function() {
            return ["category", "color", "explode", "visibleInLegend"];
        },

        addValue: function(value, sector, fields) {
            var chart = this,
                segment;

            chart.createLegendItem(value, fields);

            if (!value) {
                return;
            }
            segment = new PieSegment(value, sector, fields.series);
            segment.options.id = uniqueId();
            extend(segment, fields);
            chart.append(segment);
            chart.segments.push(segment);
        },

        createLegendItem: function(value, point) {
            var chart = this,
                options = (chart.options.legend || {}).labels || {},
                text, labelTemplate;

            if (point && point.visibleInLegend !== false) {
                text = point.category || "";
                if ((options || {}).template) {
                    labelTemplate = template(options.template);
                    text = labelTemplate({
                        text: text,
                        series: point.series,
                        dataItem: point.dataItem,
                        percentage: point.percentage,
                        value: value
                    });
                }

                chart.legendItems.push({
                    name: text,
                    color: point.series.color
                });
            }
        },

        pointsTotal: function(series) {
            var chart = this,
                valueFields = chart.valueFields(),
                data = series.data,
                length = data.length,
                sum = 0,
                i;

            for(i = 0; i < length; i++) {
                sum += bindPoint(series, i, valueFields).value;
            }

            return sum;
        },

        reflow: function(targetBox) {
            var chart = this,
                options = chart.options,
                box = targetBox.clone(),
                space = 5,
                minWidth = math.min(box.width(), box.height()),
                halfMinWidth = minWidth / 2,
                defaultPadding = minWidth - minWidth * 0.85,
                padding = defined(options.padding) ? options.padding : defaultPadding,
                newBox = new Box2D(box.x1, box.y1,
                    box.x1 + minWidth, box.y1 + minWidth),
                newBoxCenter = newBox.center(),
                seriesConfigs = chart.seriesConfigs || [],
                boxCenter = box.center(),
                segments = chart.segments,
                count = segments.length,
                seriesCount = options.series.length,
                leftSideLabels = [],
                rightSideLabels = [],
                seriesConfig,
                seriesIndex,
                label,
                segment,
                sector,
                r, i, c;

            padding = padding > halfMinWidth - space ? halfMinWidth - space : padding,
            newBox.translate(boxCenter.x - newBoxCenter.x, boxCenter.y - newBoxCenter.y);
            r = halfMinWidth - padding;
            c = new Point2D(
                r + newBox.x1 + padding,
                r + newBox.y1 + padding
            );

            for (i = 0; i < count; i++) {
                segment = segments[i];

                sector = segment.sector;
                sector.r = r;
                sector.c = c;
                seriesIndex = segment.seriesIx;
                if (seriesConfigs.length) {
                    seriesConfig = seriesConfigs[seriesIndex];
                    sector.ir = seriesConfig.ir;
                    sector.r = seriesConfig.r;
                }

                if (seriesIndex == seriesCount - 1 && segment.explode) {
                    sector.c = sector.clone().radius(sector.r * 0.15).point(sector.middle());
                }

                segment.reflow(newBox);

                label = segment.label;
                if (label) {
                    if (label.options.position === OUTSIDE_END) {
                        if (seriesIndex == seriesCount - 1) {
                            if (label.orientation === RIGHT) {
                                rightSideLabels.push(label);
                            } else {
                                leftSideLabels.push(label);
                            }
                        }
                    }
                }
            }

            if (leftSideLabels.length > 0) {
                leftSideLabels.sort(chart.labelComparator(true));
                chart.leftLabelsReflow(leftSideLabels);
            }

            if (rightSideLabels.length > 0) {
                rightSideLabels.sort(chart.labelComparator(false));
                chart.rightLabelsReflow(rightSideLabels);
            }

            chart.box = newBox;
        },

        leftLabelsReflow: function(labels) {
            var chart = this,
                distances = chart.distanceBetweenLabels(labels);

            chart.distributeLabels(distances, labels);
        },

        rightLabelsReflow: function(labels) {
            var chart = this,
                distances = chart.distanceBetweenLabels(labels);

            chart.distributeLabels(distances, labels);
        },

        distanceBetweenLabels: function(labels) {
            var chart = this,
                segments = chart.segments,
                segment = segments[segments.length - 1],
                sector = segment.sector,
                firstBox = labels[0].box,
                secondBox,
                count = labels.length - 1,
                distances = [],
                distance,
                lr = sector.r + segment.options.labels.distance,
                i;

            distance = round(firstBox.y1 - (sector.c.y - lr - firstBox.height() - firstBox.height() / 2));
            distances.push(distance);
            for (i = 0; i < count; i++) {
                firstBox = labels[i].box;
                secondBox = labels[i + 1].box;
                distance = round(secondBox.y1 - firstBox.y2);
                distances.push(distance);
            }
            distance = round(sector.c.y + lr - labels[count].box.y2 - labels[count].box.height() / 2);
            distances.push(distance);

            return distances;
        },

        distributeLabels: function(distances, labels) {
            var chart = this,
                count = distances.length,
                remaining,
                left,
                right,
                i;

            for (i = 0; i < count; i++) {
                left = right = i;
                remaining = -distances[i];
                while(remaining > 0 && (left >= 0 || right < count)) {
                    remaining = chart._takeDistance(distances, i, --left, remaining);
                    remaining = chart._takeDistance(distances, i, ++right, remaining);
                }
            }

            chart.reflowLabels(distances, labels);
        },

        _takeDistance: function(distances, anchor, position, amount) {
            if (distances[position] > 0) {
                var available = math.min(distances[position], amount);
                amount -= available;
                distances[position] -= available;
                distances[anchor] += available;
            }

            return amount;
        },

        reflowLabels: function(distances, labels) {
            var chart = this,
                segments = chart.segments,
                segment = segments[segments.length - 1],
                sector = segment.sector,
                labelsCount = labels.length,
                labelOptions = segment.options.labels,
                labelDistance = labelOptions.distance,
                boxY = sector.c.y - (sector.r + labelDistance) - labels[0].box.height(),
                label,
                boxX,
                box,
                i;

            distances[0] += 2;
            for (i = 0; i < labelsCount; i++) {
                label = labels[i];
                boxY += distances[i];
                box = label.box;
                boxX = chart.hAlignLabel(
                    box.x2,
                    sector.clone().expand(labelDistance),
                    boxY,
                    boxY + box.height(),
                    label.orientation == RIGHT);

                if (label.orientation == RIGHT) {
                    if (labelOptions.align !== CIRCLE) {
                        boxX = sector.r + sector.c.x + labelDistance;
                    }
                    label.reflow(new Box2D(boxX + box.width(), boxY,
                        boxX, boxY));
                } else {
                    if (labelOptions.align !== CIRCLE) {
                        boxX = sector.c.x - sector.r - labelDistance;
                    }
                    label.reflow(new Box2D(boxX - box.width(), boxY,
                        boxX, boxY));
                }

                boxY += box.height();
            }
        },

        getViewElements: function(view) {
            var chart = this,
                options = chart.options,
                connectors = options.connectors,
                segments = chart.segments,
                connectorLine,
                sector,
                count = segments.length,
                space = 4,
                angle,
                lines = [],
                points,
                segment,
                seriesIx,
                label,
                i;

            for (i = 0; i < count; i++) {
                segment = segments[i];
                sector = segment.sector;
                angle = sector.middle();
                label = segment.label;
                seriesIx = { seriesId: segment.seriesIx };

                if (label) {
                    points = [];
                    if (label.options.position === OUTSIDE_END && segment.value !== 0) {
                        var box = label.box,
                            centerPoint = sector.c,
                            start = sector.point(angle),
                            middle = new Point2D(box.x1, box.center().y),
                            sr,
                            end,
                            crossing;

                        start = sector.clone().expand(connectors.padding).point(angle);
                        points.push(start);
                        if (label.orientation == RIGHT) {
                            end = new Point2D(box.x1 - connectors.padding, box.center().y);
                            crossing = intersection(centerPoint, start, middle, end);
                            middle = new Point2D(end.x - space, end.y);
                            crossing = crossing || middle;
                            crossing.x = math.min(crossing.x, middle.x);

                            if (chart.pointInCircle(crossing, sector.c, sector.r + space) ||
                                crossing.x < sector.c.x) {
                                sr = sector.c.x + sector.r + space;
                                if (segment.options.labels.align !== COLUMN) {
                                    if (sr < middle.x) {
                                        points.push(new Point2D(sr, start.y));
                                    } else {
                                        points.push(new Point2D(start.x + space * 2, start.y));
                                    }
                                } else {
                                    points.push(new Point2D(sr, start.y));
                                }
                                points.push(new Point2D(middle.x, end.y));
                            } else {
                                crossing.y = end.y;
                                points.push(crossing);
                            }
                        } else {
                            end = new Point2D(box.x2 + connectors.padding, box.center().y);
                            crossing = intersection(centerPoint, start, middle, end);
                            middle = new Point2D(end.x + space, end.y);
                            crossing = crossing || middle;
                            crossing.x = math.max(crossing.x, middle.x);

                            if (chart.pointInCircle(crossing, sector.c, sector.r + space) ||
                                crossing.x > sector.c.x) {
                                sr = sector.c.x - sector.r - space;
                                if (segment.options.labels.align !== COLUMN) {
                                    if (sr > middle.x) {
                                        points.push(new Point2D(sr, start.y));
                                    } else {
                                        points.push(new Point2D(start.x - space * 2, start.y));
                                    }
                                } else {
                                    points.push(new Point2D(sr, start.y));
                                }
                                points.push(new Point2D(middle.x, end.y));
                            } else {
                                crossing.y = end.y;
                                points.push(crossing);
                            }
                        }

                        points.push(end);
                        connectorLine = view.createPolyline(points, false, {
                            id: uniqueId(),
                            stroke: connectors.color,
                            strokeWidth: connectors.width,
                            animation: {
                                type: FADEIN,
                                delay: segment.animationDelay
                            },
                            data: { modelId: segment.options.modelId }
                        });

                        lines.push(connectorLine);
                    }
                }
            }

            append(lines,
                ChartElement.fn.getViewElements.call(chart, view));

            return lines;
        },

        labelComparator: function (reverse) {
            reverse = (reverse) ? -1 : 1;

            return function(a, b) {
                a = (a.parent.sector.middle() + 270) % 360;
                b = (b.parent.sector.middle() + 270) % 360;
                return (a - b) * reverse;
            };
        },

        hAlignLabel: function(originalX, sector, y1, y2, direction) {
            var cx = sector.c.x,
                cy = sector.c.y,
                r = sector.r,
                t = math.min(math.abs(cy - y1), math.abs(cy - y2));

            if (t > r) {
                return originalX;
            } else {
                return cx + math.sqrt((r * r) - (t * t)) * (direction ? 1 : -1);
            }
        },

        pointInCircle: function(point, c, r) {
            return sqr(c.x - point.x) + sqr(c.y - point.y) < sqr(r);
        },

        formatPointValue: function(point, format) {
            return autoFormat(format, point.value);
        },

        animationDelay: function(categoryIndex, seriesIndex, seriesCount) {
            return categoryIndex * PIE_SECTOR_ANIM_DELAY;
        }
    });

    var DonutSegment = PieSegment.extend({
        options: {
            overlay: {
                gradient: ROUNDED_GLASS
            },
            labels: {
                position: CENTER
            },
            animation: {
                type: PIE
            }
        },

        reflowLabel: function() {
            var segment = this,
                sector = segment.sector.clone(),
                options = segment.options,
                label = segment.label,
                labelsOptions = options.labels,
                lp,
                angle = sector.middle(),
                labelHeight;

            if (label) {
                labelHeight = label.box.height();
                if (labelsOptions.position == CENTER) {
                    sector.r -= (sector.r - sector.ir) / 2;
                    lp = sector.point(angle);
                    label.reflow(new Box2D(lp.x, lp.y - labelHeight / 2, lp.x, lp.y));
                } else {
                    PieSegment.fn.reflowLabel.call(segment);
                }
            }
        },

        createSegment: function(view, sector, options) {
            return view.createRing(sector, options);
        }
    });
    deepExtend(DonutSegment.fn, PointEventsMixin);

    var DonutChart = PieChart.extend({
        options: {
            startAngle: 90,
            connectors: {
                width: 1,
                color: "#939393",
                padding: 4
            }
        },

        addValue: function(value, sector, fields) {
            var chart = this,
                segment;

            chart.createLegendItem(value, fields);

            if (!value) {
                return;
            }

            segment = new DonutSegment(value, sector, fields.series);
            segment.options.id = uniqueId();
            extend(segment, fields);
            chart.append(segment);
            chart.segments.push(segment);
        },

        reflow: function(targetBox) {
            var chart = this,
                options = chart.options,
                box = targetBox.clone(),
                space = 5,
                minWidth = math.min(box.width(), box.height()),
                halfMinWidth = minWidth / 2,
                defaultPadding = minWidth - minWidth * 0.85,
                padding = defined(options.padding) ? options.padding : defaultPadding,
                series = options.series,
                currentSeries,
                seriesCount = series.length,
                seriesWithoutSize = 0,
                holeSize,
                totalSize,
                size,
                margin = 0,
                i, r, ir = 0,
                currentSize = 0;

            chart.seriesConfigs = [];
            padding = padding > halfMinWidth - space ? halfMinWidth - space : padding,
            totalSize = halfMinWidth - padding;

            for (i = 0; i < seriesCount; i++) {
                currentSeries = series[i];
                if (i === 0) {
                    if (defined(currentSeries.holeSize)) {
                        holeSize = currentSeries.holeSize;
                        totalSize -= currentSeries.holeSize;
                    }
                }

                if (defined(currentSeries.size)) {
                    totalSize -= currentSeries.size;
                } else {
                    seriesWithoutSize++;
                }

                if (defined(currentSeries.margin) && i != seriesCount - 1) {
                    totalSize -= currentSeries.margin;
                }
            }

            if (!defined(holeSize)) {
                currentSize = (halfMinWidth - padding) / (seriesCount + 0.75);
                holeSize = currentSize * 0.75;
                totalSize -= holeSize;
            }

            ir = holeSize;

            for (i = 0; i < seriesCount; i++) {
                currentSeries = series[i];
                size = defined(currentSeries.size) ? currentSeries.size : totalSize / seriesWithoutSize;
                ir += margin;
                r = ir + size;
                chart.seriesConfigs.push({ ir: ir, r: r });
                margin = currentSeries.margin || 0;
                ir = r;
            }

            PieChart.fn.reflow.call(chart, targetBox);
        },

        animationDelay: function(categoryIndex, seriesIndex, seriesCount) {
            return categoryIndex * DONUT_SECTOR_ANIM_DELAY +
                (INITIAL_ANIMATION_DURATION * (seriesIndex + 1) / (seriesCount + 1));
        }
    });

    var PlotAreaBase = ChartElement.extend({
        init: function(series, options) {
            var plotArea = this;

            ChartElement.fn.init.call(plotArea, options);

            plotArea.series = series;
            plotArea.charts = [];
            plotArea.options.legend.items = [];
            plotArea.axes = [];

            plotArea.options.id = uniqueId();
            plotArea.makeDiscoverable();
            plotArea.render();
        },

        options: {
            series: [],
            plotArea: {
                margin: {}
            },
            background: "",
            border: {
                color: BLACK,
                width: 0
            },
            legend: {}
        },

        appendChart: function(chart) {
            var plotArea = this;

            plotArea.charts.push(chart);
            plotArea.addToLegend(chart);
            plotArea.append(chart);
        },

        addToLegend: function(chart) {
            var series = chart.options.series,
                count = series.length,
                data = [],
                i, currentSeries, text, labelTemplate,
                labels = this.options.legend.labels || {};

            if (chart.legendItems) {
                data = chart.legendItems;
            } else {
                for (i = 0; i < count; i++) {
                    currentSeries = series[i];
                    if (currentSeries.visibleInLegend !== false) {
                        text = currentSeries.name || "";
                        if (labels.template) {
                            labelTemplate = template(labels.template);
                            text = labelTemplate({
                                text: text,
                                series: currentSeries
                            });
                        }
                        data.push({ name: text, color: currentSeries.color });
                    }
                }
            }

            append(this.options.legend.items, data);
        },

        reflow: function(targetBox) {
            var plotArea = this,
                options = plotArea.options.plotArea,
                margin = getSpacing(options.margin);

            plotArea.box = targetBox.clone().unpad(margin);

            if (plotArea.axes.length > 0) {
                plotArea.reflowAxes();
                plotArea.box = plotArea.axisBox();
            }

            plotArea.reflowCharts();
        },

        axisCrossingValues: function(axis, crossingAxes) {
            var options = axis.options,
                crossingValues = [].concat(options.axisCrossingValue),
                valuesToAdd = crossingAxes.length - crossingValues.length,
                defaultValue = crossingValues[0] || 0,
                i;

            for (i = 0; i < valuesToAdd; i++) {
                crossingValues.push(defaultValue);
            }

            return crossingValues;
        },

        alignAxisTo: function(axis, targetAxis, crossingValue, targetCrossingValue) {
            var slot = axis.getSlot(crossingValue, crossingValue),
                slotEdge = axis.options.reverse ? 2 : 1,
                targetSlot = targetAxis.getSlot(targetCrossingValue, targetCrossingValue),
                targetEdge = targetAxis.options.reverse ? 2 : 1;

            axis.reflow(
                axis.box.translate(
                    targetSlot[X + targetEdge] - slot[X + slotEdge],
                    targetSlot[Y + targetEdge] - slot[Y + slotEdge]
                )
            );
        },

        alignAxes: function(xAxes, yAxes) {
            var plotArea = this,
                xAnchor = xAxes[0],
                yAnchor = yAxes[0],
                xAnchorCrossings = plotArea.axisCrossingValues(xAnchor, yAxes),
                yAnchorCrossings = plotArea.axisCrossingValues(yAnchor, xAxes),
                leftAnchor,
                rightAnchor,
                topAnchor,
                bottomAnchor,
                axis,
                i;

            // TODO: Refactor almost-identical loops
            for (i = 0; i < yAxes.length; i++) {
                axis = yAxes[i];
                plotArea.alignAxisTo(axis, xAnchor, yAnchorCrossings[i], xAnchorCrossings[i]);

                if (round(axis.lineBox().x1) === round(xAnchor.lineBox().x1)) {
                    if (leftAnchor) {
                        axis.reflow(axis.box
                            .alignTo(leftAnchor.box, LEFT)
                            .translate(-axis.options.margin, 0)
                        );
                    }

                    leftAnchor = axis;
                }

                if (round(axis.lineBox().x2) === round(xAnchor.lineBox().x2)) {
                    if (!axis._mirrored) {
                        axis.options.labels.mirror = !axis.options.labels.mirror;
                        axis._mirrored = true;
                    }
                    plotArea.alignAxisTo(axis, xAnchor, yAnchorCrossings[i], xAnchorCrossings[i]);

                    if (rightAnchor) {
                        axis.reflow(axis.box
                            .alignTo(rightAnchor.box, RIGHT)
                            .translate(axis.options.margin, 0)
                        );
                    }

                    rightAnchor = axis;
                }

                if (i !== 0) {
                    axis.alignTo(yAnchor);
                }
            }

            for (i = 0; i < xAxes.length; i++) {
                axis = xAxes[i];
                plotArea.alignAxisTo(axis, yAnchor, xAnchorCrossings[i], yAnchorCrossings[i]);

                if (round(axis.lineBox().y1) === round(yAnchor.lineBox().y1)) {
                    if (!axis._mirrored) {
                        axis.options.labels.mirror = !axis.options.labels.mirror;
                        axis._mirrored = true;
                    }
                    plotArea.alignAxisTo(axis, yAnchor, xAnchorCrossings[i], yAnchorCrossings[i]);

                    if (topAnchor) {
                        axis.reflow(axis.box
                            .alignTo(topAnchor.box, TOP)
                            .translate(0, -axis.options.margin)
                        );
                    }

                    topAnchor = axis;
                }

                if (round(axis.lineBox().y2, COORD_PRECISION) === round(yAnchor.lineBox().y2, COORD_PRECISION)) {
                    if (bottomAnchor) {
                        axis.reflow(axis.box
                            .alignTo(bottomAnchor.box, BOTTOM)
                            .translate(0, axis.options.margin)
                        );
                    }

                    bottomAnchor = axis;
                }

                if (i !== 0) {
                    axis.alignTo(xAnchor);
                }
            }
        },

        axisBox: function() {
            var plotArea = this,
                axes = plotArea.axes,
                box = axes[0].box.clone(),
                i,
                length = axes.length;

            for (i = 1; i < length; i++) {
                box.wrap(axes[i].box);
            }

            return box;
        },

        shrinkAxes: function() {
            var plotArea = this,
                box = plotArea.box,
                axisBox = plotArea.axisBox(),
                overflowY = axisBox.height() - box.height(),
                overflowX = axisBox.width() - box.width(),
                axes = plotArea.axes,
                currentAxis,
                vertical,
                i,
                length = axes.length;

            // Shrink all axes so they don't overflow out of the bounding box
            for (i = 0; i < length; i++) {
                currentAxis = axes[i];
                vertical = currentAxis.options.vertical;

                currentAxis.reflow(
                    currentAxis.box.shrink(
                        vertical ? 0 : overflowX,
                        vertical ? overflowY : 0
                    )
                );
            }
        },

        shrinkAdditionalAxes: function(xAxes, yAxes) {
            var plotArea = this,
                axes = plotArea.axes,
                xAnchor = xAxes[0],
                yAnchor = yAxes[0],
                anchorLineBox = xAnchor.lineBox().clone().wrap(yAnchor.lineBox()),
                overflowX,
                overflowY,
                currentAxis,
                vertical,
                lineBox,
                i,
                length = axes.length;

            for (i = 0; i < length; i++) {
                currentAxis = axes[i];
                vertical = currentAxis.options.vertical;
                lineBox = currentAxis.lineBox();

                overflowX = math.max(0, lineBox.x2 - anchorLineBox.x2) +
                            math.max(0, anchorLineBox.x1 - lineBox.x1);

                overflowY = math.max(0, lineBox.y2 - anchorLineBox.y2) +
                            math.max(0, anchorLineBox.y1 - lineBox.y1);

                currentAxis.reflow(
                    currentAxis.box.shrink(
                        vertical ? 0 : overflowX,
                        vertical ? overflowY : 0
                    )
                );
            }
        },

        fitAxes: function() {
            var plotArea = this,
                axes = plotArea.axes,
                box = plotArea.box,
                axisBox = plotArea.axisBox(),
                offsetX = box.x1 - axisBox.x1,
                offsetY = box.y1 - axisBox.y1,
                currentAxis,
                i,
                length = axes.length;

            for (i = 0; i < length; i++) {
                currentAxis = axes[i];

                currentAxis.reflow(
                    currentAxis.box.translate(offsetX, offsetY)
                );
            }
        },

        reflowAxes: function() {
            var plotArea = this,
                axes = plotArea.axes,
                xAxes = grep(axes, (function(axis) { return !axis.options.vertical; })),
                yAxes = grep(axes, (function(axis) { return axis.options.vertical; })),
                i,
                length = axes.length;

            for (i = 0; i < length; i++) {
                axes[i].reflow(plotArea.box);
            }

            plotArea.alignAxes(xAxes, yAxes);
            plotArea.shrinkAdditionalAxes(xAxes, yAxes);
            plotArea.alignAxes(xAxes, yAxes);
            plotArea.shrinkAxes();
            plotArea.alignAxes(xAxes, yAxes);
            plotArea.fitAxes();
        },

        reflowCharts: function() {
            var plotArea = this,
                charts = plotArea.charts,
                count = charts.length,
                box = plotArea.box,
                i;

            for (i = 0; i < count; i++) {
                charts[i].reflow(box);
            }

            plotArea.box = box;
        },

        renderGridLines: function(view, axis, secondaryAxis) {
            var plotArea = this,
                options = axis.options,
                vertical = options.vertical,
                crossingSlot = axis.getSlot(options.axisCrossingValue),
                secAxisPos = round(crossingSlot[vertical ? "y1" : "x1"]),
                lineBox = secondaryAxis.lineBox(),
                lineStart = lineBox[vertical ? "x1" : "y1"],
                lineEnd = lineBox[vertical ? "x2" : "y2" ],
                majorTicks = axis.getMajorTickPositions(),
                gridLines = [],
                gridLine = function (pos, options) {
                    return {
                        pos: pos,
                        options: options
                    };
                };

            if (options.majorGridLines.visible) {
                gridLines = map(majorTicks, function(pos) {
                                return gridLine(pos, options.majorGridLines);
                            });
            }

            if (options.minorGridLines.visible) {
                gridLines = gridLines.concat(
                    map(axis.getMinorTickPositions(), function(pos) {
                        if (options.majorGridLines.visible) {
                            if (!inArray(pos, majorTicks)) {
                                return gridLine(pos, options.minorGridLines);
                            }
                        } else {
                            return gridLine(pos, options.minorGridLines);
                        }
                    }
                ));
            }

            return map(gridLines, function(line) {
                var gridLineOptions = {
                        data: { modelId: plotArea.options.modelId },
                        strokeWidth: line.options.width,
                        stroke: line.options.color,
                        dashType: line.options.dashType
                    },
                    linePos = round(line.pos);

                if (secAxisPos === linePos && secondaryAxis.options.line.visible) {
                    return null;
                }

                if (vertical) {
                    return view.createLine(
                        lineStart, linePos, lineEnd, linePos,
                        gridLineOptions);
                } else {
                    return view.createLine(
                        linePos, lineStart, linePos, lineEnd,
                        gridLineOptions);
                }
            });
        },

        backgroundBox: function() {
            var plotArea = this,
                axes = plotArea.axes,
                axesCount = axes.length,
                lineBox,
                box,
                i,
                j,
                axisA,
                axisB;

            for (i = 0; i < axesCount; i++) {
                axisA = axes[i];

                for (j = 0; j < axesCount; j++) {
                    axisB = axes[j];

                    if (axisA.options.vertical !== axisB.options.vertical) {
                        lineBox = axisA.lineBox().clone().wrap(axisB.lineBox());

                        if (!box) {
                            box = lineBox;
                        } else {
                            box = box.wrap(lineBox);
                        }
                    }
                }
            }

            return box || plotArea.box;
        },

        getViewElements: function(view) {
            var plotArea = this,
                bgBox = plotArea.backgroundBox(),
                options = plotArea.options,
                userOptions = options.plotArea,
                axisY = plotArea.axisY,
                axisX = plotArea.axisX,
                gridLinesY = axisY ? plotArea.renderGridLines(view, axisY, axisX) : [],
                gridLinesX = axisX ? plotArea.renderGridLines(view, axisX, axisY) : [],
                childElements = ChartElement.fn.getViewElements.call(plotArea, view),
                border = userOptions.border || {},
                elements = [
                    view.createRect(bgBox, {
                        fill: userOptions.background,
                        fillOpacity: userOptions.opacity,
                        zIndex: -2,
                        strokeWidth: 0.1
                    }),
                    view.createRect(bgBox, {
                        id: options.id,
                        data: { modelId: options.modelId },
                        stroke: border.width ? border.color : "",
                        strokeWidth: border.width,
                        fill: WHITE,
                        fillOpacity: 0,
                        zIndex: -1,
                        dashType: border.dashType
                    })
                ];

            return [].concat(gridLinesY, gridLinesX, childElements, elements);
        }
    });

    var CategoricalPlotArea = PlotAreaBase.extend({
        init: function(series, options) {
            var plotArea = this,
                axisOptions = deepExtend({}, plotArea.options, options);

            plotArea.namedValueAxes = {};
            plotArea.valueAxisRangeTracker = new AxisGroupRangeTracker(axisOptions.valueAxis);

            if (series.length > 0) {
                plotArea.invertAxes = inArray(
                    series[0].type, [BAR, VERTICAL_LINE, VERTICAL_AREA]
                );
            }

            PlotAreaBase.fn.init.call(plotArea, series, options);
        },

        options: {
            categoryAxis: {
                categories: []
            },
            valueAxis: {}
        },

        render: function() {
            var plotArea = this,
                series = plotArea.series;

            plotArea.createCategoryAxis();

            if (equalsIgnoreCase(plotArea.categoryAxis.options.type, DATE)) {
                plotArea.aggregateDateSeries();
            }

            series = plotArea.series;
            plotArea.createAreaChart(grep(series, function(s) {
                return inArray(s.type, [AREA, VERTICAL_AREA]);
            }));

            plotArea.createBarChart(grep(series, function(s) {
                return inArray(s.type, [BAR, COLUMN]);
            }));

            plotArea.createLineChart(grep(series, function(s) {
                return inArray(s.type, [LINE, VERTICAL_LINE]);
            }));

            plotArea.createValueAxes();
        },

        aggregateDateSeries: function() {
            var plotArea = this,
                series = plotArea.series,
                processedSeries = [],
                categoryAxis = plotArea.categoryAxis,
                categories = categoryAxis.options.categories,
                categoryMap = categoryAxis.categoryMap,
                groupIx,
                categoryIndicies,
                seriesIx,
                currentSeries,
                seriesClone,
                srcData,
                data,
                aggregate,
                srcValues,
                i,
                categoryIx,
                pointData,
                value;

            for (seriesIx = 0; seriesIx < series.length; seriesIx++) {
                currentSeries = series[seriesIx];
                seriesClone = deepExtend({}, currentSeries);
                aggregate = plotArea.seriesAggregate(seriesClone);

                srcData = seriesClone.data;

                seriesClone.data = data = [];

                for (groupIx = 0; groupIx < categories.length; groupIx++) {
                    categoryIndicies = categoryMap[groupIx];
                    srcValues = [];

                    for (i = 0; i < categoryIndicies.length; i++) {
                        categoryIx = categoryIndicies[i];
                        pointData = bindPoint(currentSeries, categoryIx, ["value"]);
                        value = pointData.value;

                        if (defined(value)) {
                            srcValues.push(pointData.value);
                        }
                    }

                    if (srcValues.length > 1) {
                        data[groupIx] = aggregate(srcValues, currentSeries);
                    } else {
                        data[groupIx] = srcData[categoryIndicies[0]];
                    }
                }

                processedSeries.push(seriesClone);
            }

            plotArea.series = processedSeries;
        },

        seriesAggregate: function(series) {
            var aggregate = series.aggregate;
            if (typeof aggregate === STRING) {
                aggregate = Aggregates[aggregate];
            }

            return aggregate || Aggregates.max;
        },

        appendChart: function(chart) {
            var plotArea = this,
                options = plotArea.options,
                series = chart.options.series,
                categories = options.categoryAxis.categories,
                categoriesToAdd = math.max(0, categoriesCount(series) - categories.length);

            append(categories, new Array(categoriesToAdd));

            plotArea.valueAxisRangeTracker.update(chart.valueAxisRanges);

            PlotAreaBase.fn.appendChart.call(plotArea, chart);
        },

        createBarChart: function(series) {
            if (series.length === 0) {
                return;
            }

            var plotArea = this,
                firstSeries = series[0],
                barChart = new BarChart(plotArea, {
                    series: series,
                    invertAxes: plotArea.invertAxes,
                    isStacked: firstSeries.stack && series.length > 1,
                    gap: firstSeries.gap,
                    spacing: firstSeries.spacing
                });

            plotArea.appendChart(barChart);
        },

        createLineChart: function(series) {
            if (series.length === 0) {
                return;
            }

            var plotArea = this,
                firstSeries = series[0],
                lineChart = new LineChart(plotArea, {
                    invertAxes: plotArea.invertAxes,
                    isStacked: firstSeries.stack && series.length > 1,
                    series: series
                });

            plotArea.appendChart(lineChart);
        },

        createAreaChart: function(series) {
            if (series.length === 0) {
                return;
            }

            var plotArea = this,
                firstSeries = series[0],
                areaChart = new AreaChart(plotArea, {
                    invertAxes: plotArea.invertAxes,
                    isStacked: firstSeries.stack && series.length > 1,
                    series: series
                });

            plotArea.appendChart(areaChart);
        },

        createCategoryAxis: function() {
            var plotArea = this,
                options = plotArea.options,
                invertAxes = plotArea.invertAxes,
                categoryAxisOptions = options.categoryAxis,
                categories = categoryAxisOptions.categories,
                categoriesCount = categories.length,
                axisType  = categoryAxisOptions.type || "",
                dateCategory = categories[0] instanceof Date,
                categoryAxis;

            if (equalsIgnoreCase(axisType, DATE) || (!axisType && dateCategory)) {
                categoryAxis = new DateCategoryAxis(deepExtend({
                        vertical: invertAxes
                    },
                    categoryAxisOptions)
                );
            } else {
                categoryAxis = new CategoryAxis(deepExtend({
                        vertical: invertAxes,
                        axisCrossingValue: invertAxes ? categoriesCount : 0
                    },
                    categoryAxisOptions)
                );
            }

            if (invertAxes) {
                plotArea.axisY = categoryAxis;
            } else {
                plotArea.axisX = categoryAxis;
            }

            plotArea.categoryAxis = categoryAxis;
            plotArea.axes.push(categoryAxis);
            plotArea.append(plotArea.categoryAxis);
        },

        createValueAxes: function() {
            var plotArea = this,
                options = plotArea.options,
                range,
                invertAxes = plotArea.invertAxes,
                axis,
                axisName,
                namedValueAxes = plotArea.namedValueAxes,
                valueAxisOptions = [].concat(options.valueAxis),
                primaryValueAxis;

            each(valueAxisOptions, function() {
                axisName = this.name || PRIMARY;
                range = plotArea.valueAxisRangeTracker.query(axisName);

                axis = namedValueAxes[axisName] =
                    new NumericAxis(range.min, range.max, deepExtend({
                        vertical: !invertAxes
                    },
                    this)
                );

                plotArea.axes.push(axis);
                plotArea.append(axis);
            });

            primaryValueAxis = plotArea.getPrimaryValueAxis();

            // TODO: Consider removing axisX and axisY aliases
            if (invertAxes) {
                plotArea.axisX = primaryValueAxis;
            } else {
                plotArea.axisY = primaryValueAxis;
            }
        },

        click: function(chart, e) {
            var plotArea = this,
                coords = chart._eventCoordinates(e),
                point = new Point2D(coords.x, coords.y),
                categoryAxis = plotArea.categoryAxis,
                allAxes = plotArea.axes,
                i,
                length = allAxes.length,
                axis,
                currentValue,
                category = categoryAxis.getCategory(point),
                values = [];

            for (i = 0; i < length; i++) {
                axis = allAxes[i];
                if (axis != categoryAxis) {
                    currentValue = axis.getValue(point);
                    if (currentValue !== null) {
                        values.push(currentValue);
                    }
                }
            }

            if (defined(category) && values.length > 0) {
                chart.trigger(PLOT_AREA_CLICK, {
                    element: $(e.target),
                    category: category,
                    value: singleItemOrArray(values)
                });
            }
        },

        getPrimaryValueAxis: function() {
            var plotArea = this,
                axes = plotArea.axes,
                primaryValueAxis = plotArea.namedValueAxes[PRIMARY],
                axesCount = axes.length,
                axis, i;

            for (i = 0; i < axesCount && !primaryValueAxis; i++) {
                axis = axes[i];

                if (!equalsIgnoreCase(axis.options.type, CATEGORY)) {
                    primaryValueAxis = axis;
                    break;
                }
            }

            return primaryValueAxis;
        }
    });

    var AxisGroupRangeTracker = Class.extend({
        init: function(axisOptions) {
            var tracker = this;

            tracker.axisRanges = {},
            tracker.axisOptions = [].concat(axisOptions),
            tracker.defaultRange = { min: 0, max: 1 };
        },

        update: function(chartAxisRanges) {
            var tracker = this,
                axisRanges = tracker.axisRanges,
                axisOptions = tracker.axisOptions,
                range,
                chartRange,
                i,
                axis,
                axisName,
                length = axisOptions.length;

            if (!chartAxisRanges) {
                return;
            }

            for (i = 0; i < length; i++) {
                axis = axisOptions[i];
                axisName = axis.name || PRIMARY;
                range = axisRanges[axisName];
                chartRange = chartAxisRanges[axisName];
                if (chartRange) {
                    axisRanges[axisName] = range =
                        range || { min: MAX_VALUE, max: MIN_VALUE };

                    range.min = math.min(range.min, chartRange.min);
                    range.max = math.max(range.max, chartRange.max);
                }
            }
        },

        query: function(axisName) {
            var tracker = this;

            return tracker.axisRanges[axisName] || deepExtend({}, tracker.defaultRange);
        }
    });

    var XYPlotArea = PlotAreaBase.extend({
        init: function(series, options) {
            var plotArea = this,
                axisOptions = deepExtend({}, plotArea.options, options);

            plotArea.namedXAxes = {};
            plotArea.namedYAxes = {};

            plotArea.xAxisRangeTracker = new AxisGroupRangeTracker(axisOptions.xAxis);
            plotArea.yAxisRangeTracker = new AxisGroupRangeTracker(axisOptions.yAxis);

            PlotAreaBase.fn.init.call(plotArea, series, options);
        },

        options: {
            xAxis: {},
            yAxis: {}
        },

        render: function() {
            var plotArea = this,
                series = plotArea.series;

            plotArea.createScatterChart(grep(series, function(s) {
                return s.type === SCATTER;
            }));

            plotArea.createScatterLineChart(grep(series, function(s) {
                return s.type === SCATTER_LINE;
            }));

            plotArea.createBubbleChart(grep(series, function(s) {
                return s.type === BUBBLE;
            }));

            plotArea.createAxes();
        },

        appendChart: function(chart) {
            var plotArea = this;

            plotArea.xAxisRangeTracker.update(chart.xAxisRanges);
            plotArea.yAxisRangeTracker.update(chart.yAxisRanges);

            PlotAreaBase.fn.appendChart.call(plotArea, chart);
        },

        createScatterChart: function(series) {
            var plotArea = this;

            if (series.length > 0) {
                plotArea.appendChart(
                    new ScatterChart(plotArea, { series: series })
                );
            }
        },

        createScatterLineChart: function(series) {
            var plotArea = this;

            if (series.length > 0) {
                plotArea.appendChart(
                    new ScatterLineChart(plotArea, { series: series })
                );
            }
        },

        createBubbleChart: function(series) {
            var plotArea = this;

            if (series.length > 0) {
                plotArea.appendChart(
                    new BubbleChart(plotArea, { series: series })
                );
            }
        },

        createXYAxis: function(options, vertical) {
            var plotArea = this,
                axisName = options.name || PRIMARY,
                namedAxes = vertical ? plotArea.namedYAxes : plotArea.namedXAxes,
                rangeTracker = vertical ? plotArea.yAxisRangeTracker : plotArea.xAxisRangeTracker,
                range = rangeTracker.query(axisName),
                axisOptions = deepExtend({}, options, { vertical: vertical }),
                axis,
                seriesIx,
                series = plotArea.series,
                currentSeries,
                firstPointValue,
                dateData;

            for (seriesIx = 0; seriesIx < series.length; seriesIx++) {
                currentSeries = series[seriesIx];
                if (currentSeries[vertical ? "yAxis" : "xAxis"] == axisOptions.name) {
                    firstPointValue = bindPoint(currentSeries, 0, ["x", "y"]).value;
                    dateData = firstPointValue[vertical ? "y" : "x"] instanceof Date;

                    break;
                }
            }

            if (equalsIgnoreCase(axisOptions.type, DATE) || (!axisOptions.type && dateData)) {
                axis = new DateValueAxis(range.min, range.max, axisOptions);
            } else {
                axis = new NumericAxis(range.min, range.max, axisOptions);
            }
            namedAxes[axisName] = axis;
            plotArea.append(axis);
            plotArea.axes.push(axis);
        },

        createAxes: function() {
            var plotArea = this,
                options = plotArea.options,
                xAxesOptions = [].concat(options.xAxis),
                yAxesOptions = [].concat(options.yAxis);

            each(xAxesOptions, function() {
                plotArea.createXYAxis(this, false);
            });

            each(yAxesOptions, function() {
                plotArea.createXYAxis(this, true);
            });

            // TODO: Remove axisX and axisY aliases
            plotArea.axisX = plotArea.namedXAxes.primary || plotArea.namedXAxes[xAxesOptions[0].name];
            plotArea.axisY = plotArea.namedYAxes.primary || plotArea.namedYAxes[yAxesOptions[0].name];
        },

        click: function(chart, e) {
            var plotArea = this,
                coords = chart._eventCoordinates(e),
                point = new Point2D(coords.x, coords.y),
                allAxes = plotArea.axes,
                i,
                length = allAxes.length,
                axis,
                xValues = [],
                yValues = [],
                currentValue,
                values;

            for (i = 0; i < length; i++) {
                axis = allAxes[i];
                values = axis.options.vertical ? yValues : xValues;
                currentValue = axis.getValue(point);
                if (currentValue !== null) {
                    values.push(currentValue);
                }
            }

            if (xValues.length > 0 && yValues.length > 0) {
                chart.trigger(PLOT_AREA_CLICK, {
                    element: $(e.target),
                    x: singleItemOrArray(xValues),
                    y: singleItemOrArray(yValues)
                });
            }
        }
    });

    var PiePlotArea = PlotAreaBase.extend({
        render: function() {
            var plotArea = this,
                series = plotArea.series;

            plotArea.createPieChart(series);
        },

        createPieChart: function(series) {
            var plotArea = this,
                firstSeries = series[0],
                pieChart = new PieChart(plotArea, {
                    series: series,
                    padding: firstSeries.padding,
                    startAngle: firstSeries.startAngle,
                    connectors: firstSeries.connectors,
                    legend: plotArea.options.legend
                });

            plotArea.appendChart(pieChart);
        }
    });

    var DonutPlotArea = PiePlotArea.extend({
        render: function() {
            var plotArea = this,
                series = plotArea.series;

            plotArea.createDonutChart(series);
        },

        createDonutChart: function(series) {
            var plotArea = this,
                firstSeries = series[0],
                donutChart = new DonutChart(plotArea, {
                    series: series,
                    padding: firstSeries.padding,
                    startAngle: firstSeries.startAngle,
                    connectors: firstSeries.connectors,
                    legend: plotArea.options.legend
                });

            plotArea.appendChart(donutChart);
        }
    });

    var PieAnimation = ElementAnimation.extend({
        options: {
            easing: "easeOutElastic",
            duration: INITIAL_ANIMATION_DURATION
        },

        setup: function() {
            var element = this.element,
                sector = element.config,
                startRadius;

            if (element.options.singleSegment) {
                sector = element;
            }

            this.endRadius = sector.r;
            startRadius = this.startRadius = sector.ir || 0;
            sector.r = startRadius;
        },

        step: function(pos) {
            var animation = this,
                element = animation.element,
                endRadius = animation.endRadius,
                sector = element.config,
                startRadius = animation.startRadius;

            if (element.options.singleSegment) {
                sector = element;
            }

            sector.r = interpolateValue(startRadius, endRadius, pos);
        }
    });

    var BubbleAnimation = ElementAnimation.extend({
        options: {
            easing: "easeOutElastic",
            duration: INITIAL_ANIMATION_DURATION
        },

        setup: function() {
            var circle = this.element;

            circle.endRadius = circle.radius;
            circle.radius = 0;
        },

        step: function(pos) {
            var circle = this.element,
                endRadius = circle.endRadius;

            circle.radius = interpolateValue(0, endRadius, pos);
        }
    });

    var BarAnimationDecorator = animationDecorator(BAR, BarAnimation),
        PieAnimationDecorator = animationDecorator(PIE, PieAnimation),
        BubbleAnimationDecorator = animationDecorator(BUBBLE, BubbleAnimation);

    var Highlight = Class.extend({
        init: function(view, viewElement, options) {
            var highlight = this;
            highlight.options = deepExtend({}, highlight.options, options);

            highlight.view = view;
            highlight.viewElement = viewElement;
        },

        options: {
            fill: WHITE,
            fillOpacity: 0.2,
            stroke: WHITE,
            strokeWidth: 1,
            strokeOpacity: 0.2
        },

        show: function(point) {
            var highlight = this,
                view = highlight.view,
                viewElement = highlight.viewElement,
                overlay,
                overlayElement;

            highlight.hide();

            if (point.highlightOverlay) {
                overlay = point.highlightOverlay(view, highlight.options);

                if (overlay) {
                    overlayElement = view.renderElement(overlay);
                    viewElement.appendChild(overlayElement);

                    highlight.overlayElement = overlayElement;
                    highlight.visible = true;
                }
            }

            if (point.toggleHighlight) {
                point.toggleHighlight(view);
                highlight.point = point;
                highlight.visible = true;
            }
        },

        hide: function() {
            var highlight = this,
                overlayElement = highlight.overlayElement;

            if (overlayElement) {
                if (overlayElement.parentNode) {
                    overlayElement.parentNode.removeChild(overlayElement);
                }

                delete highlight.overlayElement;
            }

            if (highlight.point) {
                highlight.point.toggleHighlight(highlight.view);
                delete highlight.point;
            }

            highlight.visible = false;
        }
    });

    var Tooltip = Class.extend({
        init: function(chartElement, options) {
            var tooltip = this;

            tooltip.options = deepExtend({}, tooltip.options, options);
            options = tooltip.options;

            tooltip.chartElement = chartElement;
            tooltip.chartPadding = {
                top: parseInt(chartElement.css("paddingTop"), 10),
                left: parseInt(chartElement.css("paddingLeft"), 10)
            };

            tooltip.template = Tooltip.template;
            if (!tooltip.template) {
                tooltip.template = Tooltip.template = renderTemplate(
                    "<div class='" + CSS_PREFIX + "tooltip' " +
                    "style='display:none; position: absolute; font: #= d.font #;" +
                    "border: #= d.border.width #px solid;" +
                    "opacity: #= d.opacity #; filter: alpha(opacity=#= d.opacity * 100 #);'>" +
                    "</div>"
                );
            }

            tooltip.element = $(tooltip.template(tooltip.options)).appendTo(chartElement);
        },

        options: {
            background: BLACK,
            color: WHITE,
            border: {
                width: 3
            },
            opacity: 1,
            animation: {
                duration: TOOLTIP_ANIMATION_DURATION
            }
        },

        show: function(point) {
            var tooltip = this;

            tooltip.point = point;
            tooltip.showTimeout =
                setTimeout(proxy(tooltip._show, tooltip), TOOLTIP_SHOW_DELAY);
        },

        _show: function() {
            var tooltip = this,
                point = tooltip.point,
                element = tooltip.element,
                options = tooltip.options,
                chartPadding = tooltip.chartPadding,
                anchor,
                tooltipTemplate,
                content,
                tooltipOptions,
                top,
                left;

            if (!point) {
                return;
            }
            content = point.value.toString();

            tooltipOptions = deepExtend({}, tooltip.options, point.options.tooltip);

            if (tooltipOptions.template) {
                tooltipTemplate = template(tooltipOptions.template);
                content = tooltipTemplate({
                    value: point.value,
                    category: point.category,
                    series: point.series,
                    dataItem: point.dataItem,
                    percentage: point.percentage
                });
            } else if (tooltipOptions.format) {
                content = point.formatValue(tooltipOptions.format);
            }

            element.html(content);

            anchor = point.tooltipAnchor(element.outerWidth(), element.outerHeight());
            top = round(anchor.y + chartPadding.top) + "px";
            left = round(anchor.x + chartPadding.left) + "px";

            if (!tooltip.visible) {
                tooltip.element.css({ top: top, left: left });
            }

            tooltip.element
                .css({
                   backgroundColor: tooltipOptions.background,
                   borderColor: tooltipOptions.border.color || point.options.color,
                   color: tooltipOptions.color,
                   opacity: tooltipOptions.opacity,
                   borderWidth: tooltipOptions.border.width
                })
                .stop(true, true)
                .show()
                .animate({
                    left: left,
                    top: top
                }, options.animation.duration);

            tooltip.visible = true;
        },

        hide: function() {
            var tooltip = this;

            clearTimeout(tooltip.showTimeout);

            if (tooltip.visible) {
                tooltip.element.fadeOut();

                tooltip.point = null;
                tooltip.visible = false;
            }
        }
    });

    var Aggregates = {
        max: function(values) {
            return math.max.apply(math, values);
        },

        min: function(values) {
            return math.min.apply(math, values);
        },

        sum: function(values) {
            var i,
                length = values.length,
                sum = 0;

            for (i = 0; i < length; i++) {
                sum += values[i];
            }

            return sum;
        },

        count: function(values) {
            return values.length;
        },

        avg: function(values) {
            return Aggregates.sum(values) / Aggregates.count(values);
        }
    };

    function sparseArrayMin(arr) {
        return sparseArrayLimits(arr).min;
    }

    function sparseArrayMax(arr) {
        return sparseArrayLimits(arr).max;
    }

    function sparseArrayLimits(arr) {
        var min = MAX_VALUE,
            max = MIN_VALUE,
            i,
            length = arr.length,
            n;

        for (i = 0; i < length; i++) {
            n = arr[i];
            if (defined(n)) {
                min = math.min(min, n);
                max = math.max(max, n);
            }
        }

        return { min: min, max: max };
    }

    function intersection(a1, a2, b1, b2) {
        var result,
            ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x),
            u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y),
            ua;

        if (u_b !== 0) {
            ua = (ua_t / u_b);

            result = new Point2D(
                a1.x + ua * (a2.x - a1.x),
                a1.y + ua * (a2.y - a1.y)
            );
        }

        return result;
    }

    function applySeriesDefaults(options, themeOptions) {
        var series = options.series,
            i,
            seriesLength = series.length,
            seriesType,
            seriesDefaults = options.seriesDefaults,
            commonDefaults = deepExtend({}, options.seriesDefaults),
            themeSeriesDefaults = themeOptions ? deepExtend({}, themeOptions.seriesDefaults) : {},
            commonThemeDefaults = deepExtend({}, themeSeriesDefaults);

        cleanupNestedSeriesDefaults(commonDefaults);
        cleanupNestedSeriesDefaults(commonThemeDefaults);

        for (i = 0; i < seriesLength; i++) {
            seriesType = series[i].type || options.seriesDefaults.type;

            series[i] = deepExtend(
                {},
                commonThemeDefaults,
                themeSeriesDefaults[seriesType],
                { tooltip: options.tooltip },
                commonDefaults,
                seriesDefaults[seriesType],
                series[i]);
        }
    }

    function cleanupNestedSeriesDefaults(seriesDefaults) {
        delete seriesDefaults.bar;
        delete seriesDefaults.column;
        delete seriesDefaults.line;
        delete seriesDefaults.verticalLine;
        delete seriesDefaults.pie;
        delete seriesDefaults.area;
        delete seriesDefaults.verticalArea;
        delete seriesDefaults.scatter;
        delete seriesDefaults.scatterLine;
        delete seriesDefaults.bubble;
    }

    function applySeriesColors(options) {
        var series = options.series,
            i,
            seriesLength = series.length,
            colors = options.seriesColors || [];

        for (i = 0; i < seriesLength; i++) {
            series[i].color = series[i].color || colors[i % colors.length];
        }
    }

    function applyAxisDefaults(options, themeOptions) {
        var themeAxisDefaults = deepExtend({}, (themeOptions || {}).axisDefaults);

        each(["category", "value", "x", "y"], function() {
            var axisName = this + "Axis",
                axes = [].concat(options[axisName]);

            axes = $.map(axes, function(axisOptions) {
                var axisColor = (axisOptions || {}).color;
                return deepExtend({},
                    themeAxisDefaults,
                    themeAxisDefaults[axisName],
                    options.axisDefaults,
                    { line: { color: axisColor }, labels: { color: axisColor }, title: { color: axisColor } },
                    axisOptions
                );
            });

            options[axisName] = axes.length > 1 ? axes : axes[0];
        });
    }

    function applyDefaults(options, themeOptions) {
        applyAxisDefaults(options, themeOptions);
        applySeriesDefaults(options, themeOptions);
    }

    function incrementSlot(slots, index, value) {
        slots[index] = (slots[index] || 0) + value;
    }

    function categoriesCount(series) {
        var seriesCount = series.length,
            categories = 0,
            i;

        for (i = 0; i < seriesCount; i++) {
            categories = math.max(categories, series[i].data.length);
        }

        return categories;
    }

    function sqr(value) {
        return value * value;
    }

    extend($.easing, {
        easeOutElastic: function (n, d, first, diff) {
            var s = 1.70158,
                p = 0,
                a = diff;

            if ( n === 0 ) {
                return first;
            }

            if ( n === 1) {
                return first + diff;
            }

            if (!p) {
                p = 0.5;
            }

            if (a < math.abs(diff)) {
                a=diff;
                s = p / 4;
            } else {
                s = p / (2 * math.PI) * math.asin(diff / a);
            }

            return a * math.pow(2,-10 * n) *
                   math.sin((n * 1 - s) * (1.1 * math.PI) / p) +
                   diff + first;
        }
    });

    function getField(field, row) {
        if (row === null) {
            return null;
        }

        var get = getField.cache[field] =
                getField.cache[field] || getter(field, true);

        return get(row);
    }
    getField.cache = {};

    function toDate(value) {
        if (isArray(value)) {
            return map(value, toDate);
        } else if (value) {
            if (value instanceof Date) {
                return value;
            } else {
                if (typeof value === STRING) {
                    var date = DATE_REGEXP.exec(value);
                    return new Date(date ? parseInt(date[1], 10) : value);
                } else {
                    return new Date(value);
                }
            }
        }
    }

    function toTime(value) {
        if (isArray(value)) {
            return map(value, toTime);
        } else if (value) {
            return toDate(value).getTime();
        }
    }

    function addDuration(date, value, unit) {
        date = toDate(date);

        if (unit === YEARS) {
            return new Date(date.getFullYear() + value, 0, 1);
        } else if (unit === MONTHS) {
            return new Date(date.getFullYear(), date.getMonth() + value, 1);
        } else if (unit === DAYS) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate() + value);
        } else if (unit === HOURS) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                            date.getHours() + value);
        } else if (unit === MINUTES) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                            date.getHours(), date.getMinutes() + value);
        }

        return date;
    }

    function floorDate(date, unit) {
        date = toDate(date);

        return addDuration(date, 0, unit);
    }

    function ceilDate(date, unit) {
        date = toDate(date);

        if (floorDate(date, unit).getTime() === date.getTime()) {
            return date;
        }

        return addDuration(date, 1, unit);
    }

    function dateDiff(a, b) {
        var diff = a.getTime() - b,
            offsetDiff = a.getTimezoneOffset() - b.getTimezoneOffset();

        return diff - (offsetDiff * TIME_PER_MINUTE);
    }

    function duration(a, b, unit) {
        var diff;

        if (unit === YEARS) {
            diff = b.getFullYear() - a.getFullYear();
        } else if (unit === MONTHS) {
            diff = duration(a, b, YEARS) * 12 + b.getMonth() - a.getMonth();
        } else if (unit === DAYS) {
            diff = math.floor(dateDiff(b, a) / TIME_PER_DAY);
        } else {
            diff = math.floor((b - a) / TIME_PER_UNIT[unit]);
        }

        return diff;
    }

    function bindPoint(series, pointIx, valueFields, pointFields) {
        var pointData = series.data[pointIx],
            fieldData,
            fields = {},
            srcValueFields,
            srcPointFields,
            value,
            result = { value: pointData };

        if (defined(pointData))
        {
            if (isArray(pointData)) {
                fieldData = pointData.slice(valueFields.length);
                value = bindFromArray(pointData, valueFields);
                fields = bindFromArray(fieldData, pointFields);
            } else if (typeof pointData === "object") {
                srcValueFields = mapSeriesFields(series, valueFields);
                srcPointFields = mapSeriesFields(series, pointFields);

                value = bindFromObject(pointData, valueFields, srcValueFields);
                fields = bindFromObject(pointData, pointFields, srcPointFields);
            }
        } else {
            value = bindFromObject({}, valueFields);
        }

        if (defined(value)) {
            if (valueFields.length === 1) {
                value = value[valueFields[0]];
            }

            result.value = value;
        }

        result.fields = fields;

        return result;
    }

    function bindFromArray(array, fields) {
        var value = {},
            i,
            length;

        if (fields) {
            length = math.min(fields.length, array.length);

            for (i = 0; i < length; i++) {
                value[fields[i]] = array[i];
            }
        }

        return value;
    }

    function bindFromObject(object, fields, srcFields) {
        var value = {},
            i,
            length,
            fieldName,
            srcFieldName;

        if (fields) {
            length = fields.length;
            srcFields = srcFields || fields;

            for (i = 0; i < length; i++) {
                fieldName = fields[i];
                srcFieldName = srcFields[i];
                value[fieldName] = getField(srcFieldName, object);
            }
        }

        return value;
    }

    function mapSeriesFields(series, fields) {
        var i,
            length,
            fieldName,
            sourceFields,
            sourceFieldName;

        if (fields) {
            length = fields.length;
            sourceFields = [];

            for (i = 0; i < length; i++) {
                fieldName = fields[i];
                sourceFieldName = fieldName === "value" ? "field" : fieldName + "Field";

                sourceFields.push(series[sourceFieldName] || fieldName);
            }
        }

        return sourceFields;
    }

    function singleItemOrArray(array) {
        return array.length === 1 ? array[0] : array;
    }

    function equalsIgnoreCase(a, b) {
        if (a && b) {
            return a.toLowerCase() === b.toLowerCase();
        }

        return a === b;
    }

    function lastValue(array) {
        var i = array.length,
            value;

        while (i--) {
            value = array[i];
            if (defined(value) && value !== null) {
                return value;
            }
        }
    }

    // Exports ================================================================

    dataviz.ui.plugin(Chart);

    deepExtend(dataviz, {
        Aggregates: Aggregates,
        AreaChart: AreaChart,
        Bar: Bar,
        BarAnimationDecorator: BarAnimationDecorator,
        BarChart: BarChart,
        BarLabel: BarLabel,
        BubbleAnimationDecorator: BubbleAnimationDecorator,
        BubbleChart: BubbleChart,
        CategoricalPlotArea: CategoricalPlotArea,
        CategoryAxis: CategoryAxis,
        ClusterLayout: ClusterLayout,
        DateCategoryAxis: DateCategoryAxis,
        DateValueAxis: DateValueAxis,
        DonutChart: DonutChart,
        DonutPlotArea: DonutPlotArea,
        DonutSegment: DonutSegment,
        Highlight: Highlight,
        Legend: Legend,
        LineChart: LineChart,
        LinePoint: LinePoint,
        PieAnimation: PieAnimation,
        PieAnimationDecorator: PieAnimationDecorator,
        PieChart: PieChart,
        PiePlotArea: PiePlotArea,
        PieSegment: PieSegment,
        ScatterChart: ScatterChart,
        ScatterLineChart: ScatterLineChart,
        ShapeElement: ShapeElement,
        StackLayout: StackLayout,
        Tooltip: Tooltip,
        XYPlotArea: XYPlotArea,

        addDuration: addDuration,
        categoriesCount: categoriesCount,
        ceilDate: ceilDate,
        duration: duration,
        floorDate: floorDate,
        bindPoint: bindPoint,
        toDate: toDate
    });

})(jQuery);
(function ($, undefined) {

    // Imports ================================================================
    var doc = document,
        math = Math,

        kendo = window.kendo,
        Widget = kendo.ui.Widget,
        deepExtend = kendo.deepExtend,

        dataviz = kendo.dataviz,
        Axis = dataviz.Axis,
        Box2D = dataviz.Box2D,
        ChartElement = dataviz.ChartElement,
        NumericAxis = dataviz.NumericAxis,
        Pin = dataviz.Pin,
        Ring = dataviz.Ring,
        RootElement = dataviz.RootElement,
        RotationAnimation = dataviz.RotationAnimation,
        BarIndicatorAnimatin = dataviz.BarIndicatorAnimatin,
        ArrowAnimation = dataviz.ArrowAnimation,
        append = dataviz.append,
        animationDecorator = dataviz.animationDecorator,
        autoMajorUnit = dataviz.autoMajorUnit,
        getSpacing = dataviz.getSpacing,
        defined = dataviz.defined,
        rotatePoint = dataviz.rotatePoint,
        Point2D = dataviz.Point2D,
        round = dataviz.round,
        uniqueId = dataviz.uniqueId;

    // Constants ==============================================================
    var ANGULAR_SPEED = 150,
        ARROW = "arrow",
        ARROW_POINTER = "arrowPointer",
        BAR_INDICATOR = "barIndicator",
        BLACK = "#000",
        CAP_SIZE = 0.05,
        COORD_PRECISION = dataviz.COORD_PRECISION,
        MAX_VALUE = Number.MAX_VALUE,
        MIN_VALUE = -Number.MAX_VALUE,
        DEFAULT_HEIGHT = 200,
        DEFAULT_LINE_WIDTH = 0.5,
        DEFAULT_WIDTH = 200,
        DEFAULT_MIN_WIDTH = 60,
        DEFAULT_MIN_HEIGHT = 60,
        DEGREE = math.PI / 180,
        INSIDE = "inside",
        NEEDLE = "needle",
        OUTSIDE = "outside",
        RADIAL_POINTER = "radialPointer",
        ROTATION_ORIGIN = 90;

    // Gauge ==================================================================
    var Pointer = ChartElement.extend({
        init: function (scale, options) {
            var pointer = this,
                scaleOptions = scale.options;

            ChartElement.fn.init.call(pointer, options);

            options = pointer.options;

            if (!options.id) {
                options.id = uniqueId();
            }

            options.fill = options.color;

            pointer.scale = scale;

            if (defined(options.value)){
                options.value = math.min(math.max(options.value, scaleOptions.min), scaleOptions.max);
            } else {
                options.value = scaleOptions.min;
            }
        },

        options: {
            color: BLACK
        },

        value: function(newValue) {
            var pointer = this,
                options = pointer.options,
                value = options.value,
                scaleOptions = pointer.scale.options;

            if (arguments.length === 0) {
                return value;
            }

            options._oldValue = options.value;
            options.value = math.min(math.max(newValue, scaleOptions.min), scaleOptions.max);

            pointer.repaint();
        }
    });

    var RadialPointer = Pointer.extend({
        options: {
            shape: NEEDLE,
            cap: {
                size: CAP_SIZE
            },
            arrow: {
                width: 16,
                height: 14
            },
            animation: {
                type: RADIAL_POINTER,
                speed: ANGULAR_SPEED
            }
        },

        reflow: function() {
            var pointer = this,
                options = pointer.options,
                scale = pointer.scale,
                ring = scale.ring,
                c = ring.c,
                capSize = ring.r * options.cap.size;

            pointer.box = new Box2D(
                c.x - capSize, c.y - capSize,
                c.x + capSize, c.y + capSize
            );
        },

        repaint: function() {
            var pointer = this,
                scale = pointer.scale,
                options = pointer.options,
                needle = pointer.elements[0],
                animationOptions = options.animation,
                minSlotAngle = scale.slotAngle(scale.options.min),
                oldAngle = scale.slotAngle(options._oldValue) - minSlotAngle,
                animation = needle._animation;

            needle.options.rotation[0] = scale.slotAngle(options.value) - minSlotAngle;

            if (animation) {
                animation.abort();
            }

            if (animationOptions.transitions === false) {
                needle.refresh(doc.getElementById(options.id));
            } else {
                animation = needle._animation = new RotationAnimation(needle, deepExtend(animationOptions, {
                    startAngle: oldAngle,
                    reverse: scale.options.reverse
                }));
                animation.setup();
                animation.play();
            }
        },

        _renderNeedle: function(view, box, center, pointRotation) {
            var pointer = this,
                options = pointer.options,
                scale = pointer.scale,
                capSize = scale.ring.r * options.cap.size;

            return [
                view.createPolyline([
                    rotatePoint((box.x1 + box.x2) / 2,
                        box.y1 + scale.options.minorTicks.size, center.x, center.y, pointRotation
                    ),
                    rotatePoint(center.x - capSize / 2, center.y, center.x, center.y, pointRotation),
                    rotatePoint(center.x + capSize / 2, center.y, center.x, center.y, pointRotation)
                ], true, options),
                view.createCircle(center, capSize, {
                    fill: options.cap.color || options.color
                })
            ];
        },

        _renderArrow: function(view, box, center, pointRotation) {
            var pointer = this,
                options = pointer.options,
                scale = pointer.scale,
                ring = scale.ring.clone(),
                trackWidth = 5,
                arrowOptions = options.arrow,
                height = arrowOptions.height;

            ring.ir = ring.r - trackWidth;

            return [
                view.createPin(new Pin({
                    origin: rotatePoint(
                        (box.x1 + box.x2) / 2, box.y1 + height,
                        center.x, center.y, pointRotation
                    ),
                    height: arrowOptions.height,
                    radius: trackWidth,
                    rotation: pointRotation,
                    arcAngle: 180
                }), options),
                view.createRing(ring, {
                    fill: options.color
                })
            ];
        },

        renderPointer: function(view) {
            var pointer = this,
                scale = pointer.scale,
                ring = scale.ring,
                c = ring.c,
                r = ring.r,
                shape,
                options = pointer.options,
                box = new Box2D(c.x - r, c.y - r, c.x + r, c.y + r),
                center = box.center(),
                minAngle = scale.slotAngle(scale.options.min),
                pointRotation = ROTATION_ORIGIN - minAngle;

            if (options.animation !== false) {
                deepExtend(options.animation, {
                    startAngle: 0,
                    center: center,
                    reverse: scale.options.reverse
                });
            }

            deepExtend(options, {
                rotation: [
                    scale.slotAngle(options.value) - minAngle,
                    center.x,
                    center.y
                ]
            });

            if (options.shape == ARROW) {
                shape = pointer._renderArrow(view, box, center, pointRotation);
            } else {
                shape = pointer._renderNeedle(view, box, center, pointRotation);
            }

            return shape;
        },

        getViewElements: function(view) {
            var pointer = this,
                elements = pointer.renderPointer(view);

            pointer.elements = elements;

            return elements;
        }
    });

    var RadialScale = NumericAxis.extend({
        init: function (options) {
            var scale = this,
                scaleOptions = scale.options;

            scaleOptions.majorUnit = autoMajorUnit(scale.options.min, scale.options.max);

            Axis.fn.init.call(scale, options);
            scale.options.minorUnit = scale.options.minorUnit || scale.options.majorUnit / 10;
        },

        options: {
            min: 0,
            max: 100,

            majorTicks: {
                size: 15,
                align: INSIDE,
                color: BLACK,
                width: DEFAULT_LINE_WIDTH,
                visible: true
            },

            minorTicks: {
                size: 10,
                align: INSIDE,
                color: BLACK,
                width: DEFAULT_LINE_WIDTH,
                visible: true
            },

            startAngle: -30,
            endAngle: 210,

            labels: {
                position: INSIDE,
                padding: 2
            }
        },

        reflow: function(box) {
            var scale = this,
                options = scale.options,
                center = box.center(),
                radius = math.min(box.height(), box.width()) / 2,
                ring = scale.ring || new dataviz.Ring(
                    center, radius - options.majorTicks.size,
                    radius, options.startAngle, options.endAngle - options.startAngle);

            scale.ring = ring;
            scale.box = ring.getBBox();
            scale.arrangeLabels();
        },

        slotAngle: function(value) {
            var options = this.options,
                startAngle = options.startAngle,
                reverse = options.reverse,
                angle = options.endAngle - startAngle,
                min = options.min,
                max = options.max,
                result;

            if (reverse) {
                result = options.endAngle - (value - min) / (max - min) * angle;
            } else {
                result = ((value - min) / (max - min) * angle) + startAngle;
            }

            return result;
        },

        renderTicks: function(view) {
            var scale = this,
                ticks = [],
                majorTickRing = scale.ring,
                minorTickRing = majorTickRing.clone(),
                options = scale.options,
                minorTickSize = options.minorTicks.size;

            function renderTickRing(ring, unit, tickOptions, visible, skipUnit) {
                var tickAngles = scale.tickAngles(ring, unit),
                    i, innerPoint, outerPoint,
                    skip = skipUnit / unit,
                    count = tickAngles.length;

                if (visible) {
                    for (i = 0; i < count; i++) {
                        if (i % skip === 0) {
                            continue;
                        }

                        outerPoint = ring.point(tickAngles[i]);
                        innerPoint = ring.point(tickAngles[i], true);

                        ticks.push(view.createLine(
                            innerPoint.x, innerPoint.y,
                            outerPoint.x, outerPoint.y,
                            {
                                align: false,
                                stroke: tickOptions.color,
                                strokeWidth: tickOptions.width
                            }
                        ));
                    }
                }
            }

            renderTickRing(majorTickRing, options.majorUnit, options.majorTicks, options.majorTicks.visible);

            if (options.labels.position == INSIDE) {
                minorTickRing.radius(minorTickRing.r - minorTickSize, true);
            } else {
                minorTickRing.radius(minorTickRing.ir + minorTickSize);
            }

            renderTickRing(minorTickRing, options.minorUnit, options.minorTicks, options.minorTicks.visible, options.majorUnit);

            return ticks;
        },

        arrangeLabels: function() {
            var scale = this,
                options = scale.options,
                ring = scale.ring.clone(),
                tickAngels = scale.tickAngles(ring, options.majorUnit),
                labels = scale.labels,
                count = labels.length,
                labelsOptions = options.labels,
                padding = labelsOptions.padding,
                rangeDistance = ring.r * 0.05,
                rangeSize = options.rangeSize = options.rangeSize || ring.r * 0.1,
                ranges = options.ranges || [],
                halfWidth, halfHeight, labelAngle,
                angle, label, lp, i, cx, cy, isInside;

            if (typeof scale.options.rangeDistance != "undefined") {
                rangeDistance = scale.options.rangeDistance;
            } else {
                scale.options.rangeDistance = rangeDistance;
            }

            if (labelsOptions.position === INSIDE && ranges.length) {
                ring.r -= rangeSize + rangeDistance;
                ring.ir -= rangeSize + rangeDistance;
            }

            for (i = 0; i < count; i++) {
                label = labels[i];
                halfWidth = label.box.width() / 2;
                halfHeight = label.box.height() / 2;
                angle = tickAngels[i];
                labelAngle = angle * DEGREE;
                isInside = labelsOptions.position === INSIDE;
                lp = ring.point(angle, isInside);
                cx = lp.x + (math.cos(labelAngle) * (halfWidth + padding) * (isInside ? 1 : -1));
                cy = lp.y + (math.sin(labelAngle) * (halfHeight + padding) * (isInside ? 1 : -1));

                label.reflow(new Box2D(cx - halfWidth, cy - halfHeight,
                    cx + halfWidth, cy + halfHeight));
                scale.box.wrap(label.box);
            }
        },

        tickAngles: function(ring, stepValue) {
            var scale = this,
                options = scale.options,
                reverse = options.reverse,
                range = options.max - options.min,
                angle = ring.angle,
                pos = ring.startAngle,
                tickCount = range / stepValue,
                step = angle / tickCount,
                positions = [],
                i;

            if (reverse) {
                pos += angle;
                step = -step;
            }

            for (i = 0; i < tickCount ; i++) {
                positions.push(round(pos, COORD_PRECISION));
                pos += step;
            }

            if (round(pos) <= options.endAngle) {
                positions.push(pos);
            }

            return positions;
        },

        renderRanges: function(view) {
            var scale = this,
                result = [],
                from,
                to,
                segments = scale.rangeSegments(),
                segmentsCount = segments.length,
                reverse = scale.options.reverse,
                segment,
                ringRadius,
                i;

            if (segmentsCount) {
                ringRadius = scale.getRadius();

                for (i = 0; i < segmentsCount; i++) {
                    segment = segments[i];
                    from = scale.slotAngle(segment[reverse ? "to": "from"]);
                    to = scale.slotAngle(segment[!reverse ? "to": "from"]);

                    if (to - from !== 0) {
                        result.push(view.createRing(
                            new Ring(
                                scale.ring.c, ringRadius.inner,
                                ringRadius.outer, from, to - from
                            ), {
                                fill: segment.color,
                                fillOpacity: segment.opacity,
                                zIndex: -1
                        }));
                    }
                }
            }

            return result;
        },

        rangeSegments: function() {
            var gauge = this,
                options = gauge.options,
                ranges = options.ranges || [],
                count = ranges.length,
                range,
                segmentsCount,
                defaultColor = options.rangePlaceholderColor,
                segments = [],
                segment,
                min = options.min,
                max = options.max,
                i, j;

            function rangeSegment(from, to, color) {
                return { from: from, to: to, color: color };
            }

            if (count) {
                segments.push(rangeSegment(min, max, defaultColor));

                for (i = 0; i < count; i++) {
                    range = getRange(ranges[i], min, max);
                    segmentsCount = segments.length;
                    for (j = 0; j < segmentsCount; j++) {
                        segment = segments[j];
                        if (segment.from <= range.from && range.from <= segment.to) {
                            segments.push(rangeSegment(range.from, range.to, range.color));
                            if (segment.from <= range.to && range.to <= segment.to) {
                                segments.push(rangeSegment(range.to, segment.to, defaultColor));
                            }
                            segment.to = range.from;
                            break;
                        }
                    }
                }
            }

            return segments;
        },

        getRadius: function() {
            var scale = this,
                options = scale.options,
                rangeSize = options.rangeSize,
                rangeDistance = options.rangeDistance,
                ring = scale.ring,
                ir, r;

            if (options.labels.position === OUTSIDE) {
                r = ring.ir - rangeDistance;
                ir = r - rangeSize;
            } else {
                r = ring.r;
                ir = r - rangeSize;
                // move the ticks with a range distance and a range size
                ring.r -= rangeSize + rangeDistance;
                ring.ir -= rangeSize + rangeDistance;
            }

            return { inner: ir, outer: r };
        },

        getViewElements: function(view) {
            var scale = this,
                childElements = ChartElement.fn.getViewElements.call(scale, view);

            append(childElements, scale.renderRanges(view));
            append(childElements, scale.renderTicks(view));

            return childElements;
        }
    });

    var RadialGaugePlotArea = ChartElement.extend({
        init: function(options) {
            ChartElement.fn.init.call(this, options);

            this.render();
        },

        options: {
            margin: {},
            background: "",
            border: {
                color: BLACK,
                width: 0
            },
            minorTicks: {
                align: INSIDE
            }
        },

        reflow: function(box) {
            var plotArea = this,
                scale = plotArea.scale,
                pointer = plotArea.pointer,
                plotBox;

            scale.reflow(box);
            plotBox = scale.box.clone();
            pointer.scale = scale;
            pointer.reflow();
            plotBox.wrap(pointer.box);

            plotArea.box = plotBox;
            plotArea.fitScale(box);
            plotArea.alignScale(box);
        },

        alignScale: function(box) {
            var plotArea = this,
                plotBoxCenter = plotArea.box.center(),
                boxCenter = box.center(),
                paddingX = plotBoxCenter.x - boxCenter.x,
                paddingY = plotBoxCenter.y - boxCenter.y,
                scale = plotArea.scale,
                pointer = plotArea.pointer;

            scale.ring.c.x -= paddingX;
            scale.ring.c.y -= paddingY;

            scale.reflow(box);
            pointer.reflow();

            plotArea.box = scale.box.clone().wrap(pointer.box);
        },

        fitScale: function(box) {
            var plotArea = this,
                scale = plotArea.scale,
                ring = scale.ring,
                plotAreaBox = plotArea.box,
                step = math.abs(plotArea.getDiff(plotAreaBox, box)),
                min = round(step, COORD_PRECISION),
                max = round(-step, COORD_PRECISION),
                minDiff, midDiff, maxDiff, mid,
                i = 0;

            while (i < 100) {
                i++;
                if (min != mid) {
                    minDiff = plotArea.getPlotBox(min, box, ring);
                    if (0 <= minDiff && minDiff <= 2) {
                        break;
                    }
                }

                if (max != mid) {
                    maxDiff = plotArea.getPlotBox(max, box, ring);
                    if (0 <= maxDiff && maxDiff <= 2) {
                        break;
                    }
                }

                if (minDiff > 0 && maxDiff > 0) {
                    mid = min * 2;
                } else if (minDiff < 0 && maxDiff < 0) {
                    mid = max * 2;
                } else {
                    mid = round(((min + max) / 2) || 1, COORD_PRECISION);
                }

                midDiff = plotArea.getPlotBox(mid, box, ring);
                if (0 <= midDiff && midDiff <= 2) {
                    break;
                }

                if (midDiff > 0) {
                    max = mid;
                    maxDiff = midDiff;
                } else {
                    min = mid;
                    minDiff = midDiff;
                }
            }
        },

        getPlotBox: function(step, box, ring) {
            var plotArea = this,
                scale = plotArea.scale,
                pointer = plotArea.pointer;

            ring = ring.clone();
            ring.r += step;
            ring.ir += step;
            scale.ring = ring;
            scale.reflow(box);
            pointer.scale = scale;
            pointer.reflow();
            plotArea.box = scale.box.clone().wrap(pointer.box);

            return plotArea.getDiff(plotArea.box, box);
        },

        getDiff: function(plotBox, box) {
            return math.min(box.width() - plotBox.width(), box.height() - plotBox.height());
        },

        render: function() {
            var plotArea = this,
                options = plotArea.options,
                scale;

            scale = plotArea.scale = new RadialScale(options.scale);
            plotArea.append(plotArea.scale);
            plotArea.pointer = new RadialPointer(
                scale,
                deepExtend({}, options.pointer, {
                    animation: {
                        transitions: options.transitions
                    }
                })
            );
            plotArea.append(plotArea.pointer);
        }
    });

    var LinearScale = NumericAxis.extend({
        init: function (options) {
            var scale = this,
                scaleOptions = scale.options;

            scaleOptions.majorUnit = autoMajorUnit(scale.options.min, scale.options.max);

            options = deepExtend({}, scaleOptions, options);
            options = deepExtend({}, options, { labels: { mirror: options.mirror } });

            NumericAxis.fn.init.call(scale, 0, 1, options);
        },

        options: {
            min: 0,
            max: 50,

            minorUnit: 1,

            majorTicks: {
                size: 15,
                align: INSIDE,
                color: BLACK,
                width: DEFAULT_LINE_WIDTH,
                visible: true
            },

            minorTicks: {
                size: 10,
                align: INSIDE,
                color: BLACK,
                width: DEFAULT_LINE_WIDTH,
                visible: true
            },

            line: {
                width: DEFAULT_LINE_WIDTH
            },

            labels: {
                position: INSIDE,
                padding: 2
            },
            mirror: false,
            _alignLines: false
        },

        renderRanges: function(view) {
            var scale = this,
                options = scale.options,
                min = options.min,
                max = options.max,
                ranges = options.ranges || [],
                vertical = options.vertical,
                mirror = options.labels.mirror,
                result = [],
                count = ranges.length,
                range, slotX, slotY, i,
                rangeSize = options.rangeSize || options.minorTicks.size / 2,
                slot;

            if (count) {
                for (i = 0; i < count; i++) {
                    range = getRange(ranges[i], min, max);
                    slot = scale.getSlot(range.from, range.to);
                    slotX = vertical ? scale.lineBox() : slot;
                    slotY = vertical ? slot : scale.lineBox();
                    if (vertical) {
                        slotX.x1 -= rangeSize * (mirror ? -1 : 1);
                    } else {
                        slotY.y2 += rangeSize * (mirror ? -1 : 1);
                    }

                    result.push(view.createRect(
                            new Box2D(slotX.x1, slotY.y1, slotX.x2, slotY.y2),
                            { fill: range.color, fillOpacity: range.opacity }));
                }
            }

            return result;
        },

        getViewElements: function(view) {
            var scale = this,
                elements = NumericAxis.fn.getViewElements.call(scale, view);

            append(elements, scale.renderRanges(view));

            return elements;
        }
    });

    var LinearPointer = Pointer.extend({
        init: function(scale, options) {
            var pointer = this;
            Pointer.fn.init.call(pointer, scale, options);
            pointer.options = deepExtend({
                size: pointer.pointerSize(),
                track: {
                    visible: defined(options.track)
                }
            }, pointer.options);
        },

        options: {
            shape: BAR_INDICATOR,

            track: {
                border: {
                    width: 1
                }
            },

            color: BLACK,
            border: {
                width: 1
            },
            opacity: 1,

            margin: getSpacing(3),
            animation: {
                type: BAR_INDICATOR
            },
            visible: true
        },

        repaint: function() {
            var pointer = this,
                scale = pointer.scale,
                options = pointer.options,
                element = pointer.element,
                animation = element._animation;

            if (animation) {
                animation.abort();
            }

            if (options.animation.transitions === false) {
                pointer.getViewElements(pointer._view);

                element.points = pointer.element.points;
                element.refresh(doc.getElementById(options.id));
            } else {
                options.animation = deepExtend({}, options.animation, {
                    endPosition: scale.getSlot(scale.options.min, options.value),
                    reverse: scale.options.reverse
                });
                if (options.shape === ARROW) {
                    animation = element._animation = new ArrowAnimation(element, options.animation);
                } else {
                    animation = element._animation = new BarIndicatorAnimatin(element, options.animation);
                }
                animation.setup();
                animation.play();
            }
        },

        reflow: function(box) {
            var pointer = this,
                options = pointer.options,
                scale = pointer.scale,
                scaleLine = scale.lineBox(),
                trackSize = options.track.size || options.size,
                pointerHalfSize = options.size / 2,
                mirror = scale.options.mirror,
                margin = getSpacing(options.margin),
                vertical = scale.options.vertical,
                space = vertical ?
                     margin[mirror ? "left" : "right"] :
                     margin[mirror ? "bottom" : "top"],
                pointerBox, pointerRangeBox, trackBox;

            space = mirror ? -space : space;

            if (vertical) {
                trackBox = new Box2D(
                    scaleLine.x1 + space, scaleLine.y1,
                    scaleLine.x1 + space, scaleLine.y2);

                if (mirror) {
                    trackBox.x1 -= trackSize;
                } else {
                    trackBox.x2 += trackSize;
                }

                if (options.shape !== BAR_INDICATOR) {
                    pointerRangeBox = new Box2D(
                        scaleLine.x2 + space, scaleLine.y1 - pointerHalfSize,
                        scaleLine.x2 + space, scaleLine.y2 + pointerHalfSize
                    );
                    pointerBox = pointerRangeBox;
                }
            } else {
                trackBox = new Box2D(
                    scaleLine.x1, scaleLine.y1 - space,
                    scaleLine.x2, scaleLine.y1 - space);

                if (mirror) {
                    trackBox.y2 += trackSize;
                } else {
                    trackBox.y1 -= trackSize;
                }

                if (options.shape !== BAR_INDICATOR) {
                    pointerRangeBox = new Box2D(
                        scaleLine.x1 - pointerHalfSize, scaleLine.y1 - space,
                        scaleLine.x2 + pointerHalfSize, scaleLine.y1 - space
                    );
                    pointerBox = pointerRangeBox;
                }
            }

            pointer.trackBox = trackBox;
            pointer.pointerRangeBox = pointerRangeBox;
            pointer.box = pointerBox || trackBox.clone().pad(options.border.width);
        },

        renderPointer: function(view) {
            var pointer = this,
                scale = pointer.scale,
                options = pointer.options,
                border = defined(options.border) ? {
                    stroke: options.border.width ? options.border.color || options.color : "",
                    strokeWidth: options.border.width,
                    dashType: options.border.dashType
                } : {},
                element,
                elementOptions = deepExtend({
                        fill: options.color,
                        fillOpacity: options.opacity,
                        animation: deepExtend(options.animation, {
                            startPosition: scale.getSlot(scale.options.min, options.value),
                            size: options.size,
                            vertical: scale.options.vertical,
                            reverse: scale.options.reverse
                        }),
                        id: options.id,
                        zIndex: 2,
                        align: false
                    }, border),
                shape = pointer.pointerShape(options.value);

            if (options.shape === ARROW) {
                elementOptions.animation.type = ARROW_POINTER;
                element = view.createPolyline(shape, true, elementOptions);
            } else {
                element = view.createRect(shape, elementOptions);
            }

            return element;
        },

        pointerShape: function(value) {
            var pointer = this,
                options = pointer.options,
                scale = pointer.scale,
                slot = scale.getSlot(value, scale.options.min),
                size = options.size,
                pointerRangeBox = pointer.pointerRangeBox,
                vertical = scale.options.vertical,
                halfSize = size / 2,
                shape,
                sign = (scale.options.mirror ? -1 : 1),
                reverse = scale.options.reverse,
                pos,
                trackBox;

            if (options.shape == ARROW) {
                if (vertical) {
                    pos = reverse ? "y2" : "y1";
                    shape = [
                        new Point2D(pointerRangeBox.x1, slot[pos] - halfSize),
                        new Point2D(pointerRangeBox.x1 - sign * size, slot[pos]),
                        new Point2D(pointerRangeBox.x1, slot[pos] + halfSize)
                    ];
                } else {
                    pos = reverse ? "x1" : "x2";
                    shape = [
                        new Point2D(slot[pos] - halfSize, pointerRangeBox.y2),
                        new Point2D(slot[pos], pointerRangeBox.y2 + sign * size),
                        new Point2D(slot[pos] + halfSize, pointerRangeBox.y2)
                    ];
                }
            } else {
                trackBox = pointer.trackBox;
                if (vertical) {
                    shape = new Box2D(
                        trackBox.x1, slot.y1,
                        trackBox.x1 + size, slot.y2);
                } else {
                    shape = new Box2D(
                        slot.x1, trackBox.y1,
                        slot.x2, trackBox.y1 + size);
                }
            }

            return shape;
        },

        pointerSize: function(shape) {
            var pointer = this,
                options = pointer.options,
                scale = pointer.scale,
                tickSize = scale.options.majorTicks.size,
                size;

            if (options.shape === ARROW) {
                size = tickSize * 0.6;
            } else {
                size = tickSize * 0.3;
            }

            return round(size);
        },

        renderTrack: function(view) {
            var pointer = this,
                options = pointer.options,
                trackOptions = options.track,
                border = trackOptions.border || {},
                trackBox = pointer.trackBox.clone().pad(border.width || 0);

            return view.createRect(trackBox, {
                fill: trackOptions.color,
                fillOpacity: trackOptions.opacity,
                stroke: border.width ? border.color || trackOptions.color : "",
                strokeWidth: border.width,
                dashType: border.dashType,
                align: false
            });
        },

        getViewElements: function(view) {
            var pointer = this,
                options = pointer.options,
                elements = [];

            pointer.element = pointer.renderPointer(view);
            elements.push(pointer.element);
            if (options.track.visible &&
                (options.shape === BAR_INDICATOR || options.shape === "")) {
                elements.push(pointer.renderTrack(view));
            }

            pointer._view = view;

            append(elements, Pointer.fn.getViewElements.call(pointer, view));

            return elements;
        }
    });

    var LinearGaugePlotArea = ChartElement.extend({
        init: function(options) {
            ChartElement.fn.init.call(this, options);

            this.render();
        },

        options: {
            plotArea: {
                margin: {},
                background: "",
                border: {
                    color: BLACK,
                    width: 0
                }
            },
            pointer: {},
            scale: {}
        },

        reflow: function(box){
            var plotArea = this,
                scale = plotArea.scale,
                pointer = plotArea.pointer;

            scale.reflow(box);
            pointer.reflow(box);
            plotArea.box = plotArea.getBox(box);
            plotArea.alignElements();
            plotArea.shrinkElements();
        },

        shrinkElements: function () {
            var plotArea = this,
                scale = plotArea.scale,
                pointer = plotArea.pointer,
                scaleBox = scale.box.clone(),
                pointerBox = pointer.box,
                pos = scale.options.vertical ? "y" : "x";

            scaleBox[pos + 1] += math.max(scaleBox[pos + 1] - pointerBox[pos + 1], 0);
            scaleBox[pos + 2] -= math.max(pointerBox[pos + 2] - scaleBox[pos + 2], 0);

            scale.reflow(scaleBox);

            pointer.reflow(plotArea.box);
        },

        getBox: function(box) {
            var plotArea = this,
                scale = plotArea.scale,
                pointer = plotArea.pointer,
                boxCenter = box.center(),
                plotAreaBox = pointer.box.clone().wrap(scale.box),
                size;

            if (scale.options.vertical) {
                size = plotAreaBox.width() / 2;
                plotAreaBox = new Box2D(
                    boxCenter.x - size, box.y1,
                    boxCenter.x + size, box.y2
                );
            } else {
                size = plotAreaBox.height() / 2;
                plotAreaBox = new Box2D(
                    box.x1, boxCenter.y - size,
                    box.x2, boxCenter.y + size
                );
            }

            return plotAreaBox;
        },

        alignElements: function() {
            var plotArea = this,
                scale = plotArea.scale,
                pointer = plotArea.pointer,
                scaleBox = scale.box,
                box = pointer.box.clone().wrap(scale.box),
                plotAreaBox = plotArea.box,
                diff;

            if (scale.options.vertical) {
                diff = plotAreaBox.center().x - box.center().x;
                scale.reflow(new Box2D(
                    scaleBox.x1 + diff, plotAreaBox.y1,
                    scaleBox.x2 + diff, plotAreaBox.y2
                ));
            } else {
                diff = plotAreaBox.center().y - box.center().y;
                scale.reflow(new Box2D(
                    plotAreaBox.x1, scaleBox.y1 + diff,
                    plotAreaBox.x2, scaleBox.y2 + diff
                ));
            }
            pointer.reflow(plotArea.box);
        },

        render: function() {
            var plotArea = this,
                options = plotArea.options,
                scale;

            scale = plotArea.scale = new LinearScale(options.scale);
            plotArea.append(plotArea.scale);
            plotArea.pointer = new LinearPointer(
                scale,
                deepExtend({}, options.pointer, {
                    animation: {
                        transitions: options.transitions
                    }
                })
            );
            plotArea.append(plotArea.pointer);
        },

        getViewElements: function(view) {
            var plotArea = this,
                options = plotArea.options.plotArea,
                childElements = ChartElement.fn.getViewElements.call(plotArea, view),
                border = options.border || {},
                elements = [
                    view.createRect(plotArea.box, {
                        fill: options.background,
                        stroke: border.width ? border.color : "",
                        strokeWidth: border.width,
                        dashType: border.dashType
                    })
                ];

            append(elements, childElements);

            return elements;
        }
    });

    var Gauge = Widget.extend({
        init: function(element, userOptions) {
            var gauge = this,
                options,
                themeOptions,
                themeName,
                themes = dataviz.ui.themes.gauge || {};

            Widget.fn.init.call(gauge, element);

            gauge.wrapper = gauge.element;

            options = deepExtend({}, gauge.options, userOptions);

            themeName = options.theme;
            themeOptions = themeName ? themes[themeName] || themes[themeName.toLowerCase()] : {};

            gauge.options = deepExtend({}, themeOptions, options);

            gauge.element.addClass("k-gauge");

            gauge.redraw();
        },

        options: {
            plotArea: {},
            theme: "default"
        },

        value: function(value) {
            if (arguments.length === 0) {
                return this._pointers[0].value();
            }

            this._pointers[0].value(value);
        },

        redraw: function() {
            var gauge = this,
                element = gauge.element,
                model = gauge._model = gauge._getModel(),
                viewType = dataviz.ui.defaultView(),
                view;

            gauge._plotArea = model._plotArea;

            if (viewType) {
                view = gauge._view = viewType.fromModel(model);

                element.css("position", "relative");
                gauge._viewElement = view.renderTo(element[0]);
            }
        },

        svg: function() {
            var model = this._getModel(),
                view = dataviz.SVGView.fromModel(model);

            return view.render();
        },

        _createModel: function() {
            var gauge = this,
                options = gauge.options,
                size = gauge._getSize();

            return new RootElement(deepExtend({
                width: size.width,
                height: size.height,
                transitions: options.transitions
            }, options.gaugeArea));
        },

        _getSize: function() {
            var gauge = this,
                element = gauge.element,
                width = element.width(),
                height = element.height();

            if (!width) {
                width = DEFAULT_WIDTH;
            }

            if (!height) {
                height = DEFAULT_HEIGHT;
            }

            return { width: width, height: height };
        }
    });

    var RadialGauge = Gauge.extend({
        init: function(element, options) {
            var radialGauge = this;
            Gauge.fn.init.call(radialGauge, element, options);
            kendo.notify(radialGauge, dataviz.ui);
        },

        options: {
            name: "RadialGauge",
            transitions: true,
            gaugeArea: {
                background: ""
            }
        },

        _getModel: function() {
            var gauge = this,
                options = gauge.options,
                model = gauge._createModel(),
                plotArea;

            plotArea = model._plotArea = new RadialGaugePlotArea(options);

            gauge._pointers = [plotArea.pointer];

            model.append(plotArea);
            model.reflow();

            return model;
        }
    });

    var LinearGauge = Gauge.extend({
        init: function(element, options) {
            var linearGauge = this;
            Gauge.fn.init.call(linearGauge, element, options);
            kendo.notify(linearGauge, dataviz.ui);
        },

        options: {
            name: "LinearGauge",
            transitions: true,
            gaugeArea: {
                background: ""
            },
            scale: {
                vertical: true
            }
        },

        _getModel: function() {
            var gauge = this,
                options = gauge.options,
                model = gauge._createModel(),
                plotArea;

            plotArea = model._plotArea = new LinearGaugePlotArea(options);
            gauge._pointers = [plotArea.pointer];

            model.append(plotArea);
            model.reflow();

            return model;
        },

        _getSize: function() {
            var gauge = this,
                element = gauge.element,
                width = element.width(),
                height = element.height(),
                vertical = gauge.options.scale.vertical;

            if (!width) {
                width = vertical ? DEFAULT_MIN_WIDTH : DEFAULT_WIDTH;
            }

            if (!height) {
                height = vertical ? DEFAULT_HEIGHT : DEFAULT_MIN_HEIGHT;
            }

            return { width: width, height: height };
        }
    });

    function getRange(range, min, max) {
        var from = defined(range.from) ? range.from : MIN_VALUE,
            to = defined(range.to) ? range.to : MAX_VALUE;

        range.from = math.max(math.min(to, from), min);
        range.to = math.min(math.max(to, from), max);

        return range;
    }


    var RadialPointerAnimationDecorator = animationDecorator(RADIAL_POINTER, RotationAnimation);
    var ArrowPointerAnimationDecorator = animationDecorator(ARROW_POINTER, ArrowAnimation);
    var BarIndicatorAnimationDecorator = animationDecorator(BAR_INDICATOR, BarIndicatorAnimatin);

    // Exports ================================================================
    dataviz.ui.plugin(RadialGauge);
    dataviz.ui.plugin(LinearGauge);

    deepExtend(dataviz, {
        Gauge: Gauge,
        RadialGaugePlotArea: RadialGaugePlotArea,
        LinearGaugePlotArea: LinearGaugePlotArea,
        RadialPointer: RadialPointer,
        LinearPointer: LinearPointer,
        LinearScale: LinearScale,
        RadialScale: RadialScale,
        RadialPointerAnimationDecorator: RadialPointerAnimationDecorator,
        ArrowPointerAnimationDecorator: ArrowPointerAnimationDecorator,
        BarIndicatorAnimationDecorator: BarIndicatorAnimationDecorator
    });

})(jQuery);
(function () {

    // Imports ================================================================
    var $ = jQuery,
        doc = document,
        math = Math,

        kendo = window.kendo,
        Class = kendo.Class,
        dataviz = kendo.dataviz,
        Box2D = dataviz.Box2D,
        ExpandAnimation = dataviz.ExpandAnimation,
        Point2D = dataviz.Point2D,
        ViewBase = dataviz.ViewBase,
        ViewElement = dataviz.ViewElement,
        deepExtend = kendo.deepExtend,
        defined = dataviz.defined,
        round = dataviz.round,
        renderTemplate = dataviz.renderTemplate,
        rotatePoint = dataviz.rotatePoint,
        uniqueId = dataviz.uniqueId;

    // Constants ==============================================================
    var BUTT = "butt",
        CLIP = dataviz.CLIP,
        COORD_PRECISION = dataviz.COORD_PRECISION,
        DEFAULT_WIDTH = dataviz.DEFAULT_WIDTH,
        DEFAULT_HEIGHT = dataviz.DEFAULT_HEIGHT,
        DEFAULT_FONT = dataviz.DEFAULT_FONT,
        NONE = "none",
        RADIAL = "radial",
        SOLID = "solid",
        SQUARE = "square",
        SVG_NS = "http://www.w3.org/2000/svg",
        SVG_DASH_TYPE = {
            dot: [1.5, 3.5],
            dash: [4, 3.5],
            longdash: [8, 3.5],
            dashdot: [3.5, 3.5, 1.5, 3.5],
            longdashdot: [8, 3.5, 1.5, 3.5],
            longdashdotdot: [8, 3.5, 1.5, 3.5, 1.5, 3.5]
        },
        TRANSPARENT = "transparent",
        UNDEFINED = "undefined";

    // View ===================================================================
    var SVGView = ViewBase.extend({
        init: function(options) {
            var view = this;

            ViewBase.fn.init.call(view, options);

            view.decorators.push(
                new SVGOverlayDecorator(view),
                new SVGGradientDecorator(view)
            );

            if (dataviz.ui.Chart) {
                view.decorators.push(
                    new dataviz.BarAnimationDecorator(view),
                    new dataviz.PieAnimationDecorator(view),
                    new dataviz.BubbleAnimationDecorator(view)
                );
            }

            view.decorators.push(
                new SVGClipAnimationDecorator(view),
                new dataviz.FadeAnimationDecorator(view)
            );

            if (dataviz.Gauge) {
                view.decorators.push(
                    new dataviz.RadialPointerAnimationDecorator(view),
                    new dataviz.ArrowPointerAnimationDecorator(view),
                    new dataviz.BarIndicatorAnimationDecorator(view)
                );
            }

            view.template = SVGView.template;
            if (!view.template) {
                view.template = SVGView.template = renderTemplate(
                    "<?xml version='1.0' ?>" +
                    "<svg xmlns='" + SVG_NS + "' version='1.1' " +
                    "width='#= d.options.width #px' height='#= d.options.height #px' " +
                    "style='position: relative; display: block;'>" +
                    "#= d.renderDefinitions() #" +
                    "#= d.renderContent() #</svg>"
                );
            }
        },

        options: {
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            idPrefix: ""
        },

        renderTo: function(container) {
            var view = this,
                viewElement;

            view.setupAnimations();

            dataviz.renderSVG(container, view.render());
            viewElement = container.firstElementChild;
            view.alignToScreen(viewElement);

            view.playAnimations();

            return viewElement;
        },

        renderDefinitions: function() {
            var view = this,
                output = ViewBase.fn.renderDefinitions.call(view);

            return output.length > 0 ? "<defs>" + output + "</defs>" : "";
        },

        renderElement: function(element) {
            var container = doc.createElement("div"),
                domElement;

            dataviz.renderSVG(container,
                "<?xml version='1.0' ?>" +
                "<svg xmlns='" + SVG_NS + "' version='1.1'>" +
                element.render() +
                "</svg>"
            );

            domElement = container.firstElementChild.firstChild;

            return domElement;
        },

        createGroup: function(options) {
            return this.decorate(
                new SVGGroup(options)
            );
        },

        createText: function(content, options) {
            return this.decorate(
                new SVGText(content, options)
            );
        },

        createRect: function(box, style) {
            return this.decorate(
                new SVGLine(box.points(), true, style)
            );
        },

        createLine: function(x1, y1, x2, y2, options) {
            return this.decorate(
                new SVGLine([new Point2D(x1, y1),
                             new Point2D(x2, y2)], false, options)
            );
        },

        createPolyline: function(points, closed, options) {
            return this.decorate(
                new SVGLine(points, closed, options)
            );
        },

        createCircle: function(center, radius, options) {
            return this.decorate(
                new SVGCircle(center, radius, options)
            );
        },

        createSector: function(sector, options) {
            return this.decorate(
                new SVGSector(sector, options)
            );
        },

        createRing: function(ring, options) {
            return this.decorate(
                new SVGRing(ring, options)
            );
        },

        createPin: function(pin, options) {
            return this.decorate(
                new SVGPin(pin, options)
            );
        },

        createGradient: function(options) {
            if (options.type === RADIAL) {
                if (defined(options.ir)){
                    return new SVGDonutGradient(options);
                } else {
                    return new SVGRadialGradient(options);
                }
            } else {
                return new SVGLinearGradient(options);
            }
        },

        alignToScreen: function(element) {
            var ctm;

            try {
                ctm = element.getScreenCTM ? element.getScreenCTM() : null;
            } catch (e) { }

            if (ctm) {
                var left = - ctm.e % 1,
                    top = - ctm.f % 1,
                    style = element.style;

                if (left !== 0 || top !== 0) {
                    style.left = left + "px";
                    style.top = top + "px";
                }
            }
        }
    });

    SVGView.fromModel = function(model) {
        var view = new SVGView(model.options);
        [].push.apply(view.children, model.getViewElements(view));

        return view;
    };

    SVGView.available = dataviz.supportsSVG;
    SVGView.preference = 100;

    dataviz.ui.registerView(SVGView);

    var SVGText = ViewElement.extend({
        init: function(content, options) {
            var text = this;
            ViewElement.fn.init.call(text, options);

            text.content = content;
            text.template = SVGText.template;
            if (!text.template) {
                text.template = SVGText.template = renderTemplate(
                    "<text #= d.renderAttr(\"id\", d.options.id) # " +
                    "#= d.renderDataAttributes() # " +
                    "x='#= Math.round(d.options.x) #' " +
                    "y='#= Math.round(d.options.y + d.options.baseline) #' " +
                    "fill-opacity='#= d.options.fillOpacity #' " +
                    "#= d.options.rotation ? d.renderRotation() : '' # " +
                    "style='font: #= d.options.font #' fill='#= d.options.color #'>" +
                    "#= d.content #</text>"
                );
            }
        },

        options: {
            x: 0,
            y: 0,
            baseline: 0,
            font: DEFAULT_FONT,
            size: {
                width: 0,
                height: 0
            },
            fillOpacity: 1
        },

        refresh: function(domElement) {
            var options = this.options;

            $(domElement).attr({
                "fill-opacity": options.fillOpacity
            });
        },

        clone: function() {
            var text = this;
            return new SVGText(text.content, deepExtend({}, text.options));
        },

        renderRotation: function() {
            var text = this,
                options = text.options,
                size = options.size,
                cx = round(options.x + size.normalWidth / 2, COORD_PRECISION),
                cy = round(options.y + size.normalHeight / 2, COORD_PRECISION),
                rcx = round(options.x + size.width / 2, COORD_PRECISION),
                rcy = round(options.y + size.height / 2, COORD_PRECISION),
                offsetX = round(rcx - cx, COORD_PRECISION),
                offsetY = round(rcy - cy, COORD_PRECISION);

            return "transform='translate(" + offsetX + "," + offsetY + ") " +
                   "rotate(" + options.rotation + "," + cx + "," + cy + ")'";
        }
    });

    var SVGPath = ViewElement.extend({
        init: function(options) {
            var path = this;
            ViewElement.fn.init.call(path, options);

            path.template = SVGPath.template;
            if (!path.template) {
                path.template = SVGPath.template = renderTemplate(
                    "<path #= d.renderAttr(\"id\", d.options.id) #" +
                    "#= d.renderDataAttributes() # " +
                    "d='#= d.renderPoints() #' " +
                    "#= d.renderAttr(\"stroke\", d.options.stroke) # " +
                    "#= d.renderAttr(\"stroke-width\", d.options.strokeWidth) #" +
                    "#= d.renderDashType() # " +
                    "stroke-linecap='#= d.renderLinecap() #' " +
                    "stroke-linejoin='round' " +
                    "fill-opacity='#= d.options.fillOpacity #' " +
                    "stroke-opacity='#= d.options.strokeOpacity #' " +
                    "fill='#= d.renderFill() #'></path>"
                );
            }
        },

        options: {
            fill: "",
            fillOpacity: 1,
            strokeOpacity: 1,
            rotation: [0,0,0]
        },

        refresh: function(domElement) {
            var options = this.options;

            $(domElement).attr({
                "d": this.renderPoints(),
                "fill-opacity": options.fillOpacity,
                "stroke-opacity": options.strokeOpacity
            });
        },

        clone: function() {
            var path = this;
            return new SVGPath(deepExtend({}, path.options));
        },

        renderPoints: function() {
            // Overriden by inheritors
        },

        renderDashType: function () {
            var path = this,
                options = path.options;

            return renderSVGDash(options.dashType, options.strokeWidth);
        },

        renderLinecap: function() {
            var dashType = this.options.dashType;

            return (dashType && dashType != SOLID) ? BUTT : SQUARE;
        },

        renderFill: function() {
            var fill = this.options.fill;

            if (fill && fill !== TRANSPARENT) {
                return fill;
            }

            return NONE;
        }
    });

    var SVGLine = SVGPath.extend({
        init: function(points, closed, options) {
            var line = this;
            SVGPath.fn.init.call(line, options);

            line.points = points;
            line.closed = closed;
        },

        renderPoints: function() {
            var line = this,
                points = line.points,
                i,
                count = points.length,
                rotate = function(point) {
                    var rotation = line.options.rotation;
                    return rotatePoint(point.x, point.y, rotation[1], rotation[2], -rotation[0]);
                },
                result = "M" + line._print(rotate(points[0]));

            for (i = 1; i < count; i++) {
                result += " " + line._print(rotate(points[i]));
            }

            if (line.closed) {
                result += " z";
            }

            return result;
        },

        clone: function() {
            var line = this;
            return new SVGLine(
                deepExtend([], line.points), line.closed,
                deepExtend({}, line.options)
            );
        },

        _print: function(point) {
            var line = this,
                options = line.options,
                strokeWidth = options.strokeWidth,
                shouldAlign = options.align !== false && strokeWidth && strokeWidth % 2 !== 0,
                align = shouldAlign ? alignToPixel : round;

            return align(point.x, COORD_PRECISION) + " " + align(point.y, COORD_PRECISION);
        }
    });

    var SVGRing = SVGPath.extend({
        init: function(config, options) {
            var ring = this;
            SVGPath.fn.init.call(ring, options);

            ring.pathTemplate = SVGRing.pathTemplate;
            if (!ring.pathTemplate) {
                ring.pathTemplate = SVGRing.pathTemplate = renderTemplate(
                    "M #= d.firstOuterPoint.x # #= d.firstOuterPoint.y # " +
                    "A#= d.r # #= d.r # " +
                    "0 #= d.isReflexAngle ? '1' : '0' #,1 " +
                    "#= d.secondOuterPoint.x # #= d.secondOuterPoint.y # " +
                    "L #= d.secondInnerPoint.x # #= d.secondInnerPoint.y # " +
                    "A#= d.ir # #= d.ir # " +
                    "0 #= d.isReflexAngle ? '1' : '0' #,0 " +
                    "#= d.firstInnerPoint.x # #= d.firstInnerPoint.y # z"
                );
            }

            ring.config = config || {};
        },

        renderPoints: function() {
            var ring = this,
                ringConfig = ring.config,
                startAngle = ringConfig.startAngle,
                endAngle = ringConfig.angle + startAngle,
                isReflexAngle = (endAngle - startAngle) > 180,
                r = math.max(ringConfig.r, 0),
                ir = math.max(ringConfig.ir, 0),
                center = ringConfig.c,
                firstOuterPoint = ringConfig.point(startAngle),
                firstInnerPoint = ringConfig.point(startAngle, true),
                secondOuterPoint,
                secondInnerPoint;

            endAngle = (endAngle - startAngle) === 360 ? endAngle - 0.002 : endAngle;
            secondOuterPoint = ringConfig.point(endAngle);
            secondInnerPoint = ringConfig.point(endAngle, true);

            return ring.pathTemplate({
                firstOuterPoint: firstOuterPoint,
                secondOuterPoint: secondOuterPoint,
                isReflexAngle: isReflexAngle,
                r: r,
                ir: ir,
                cx: center.x,
                cy: center.y,
                firstInnerPoint: firstInnerPoint,
                secondInnerPoint: secondInnerPoint
            });
        },

        clone: function() {
            var ring = this;
            return new SVGRing(
                deepExtend({}, ring.config),
                deepExtend({}, ring.options)
            );
        }
    });

    var SVGPin = SVGPath.extend({
        init: function(config, options) {
            var pin = this;

            SVGPath.fn.init.call(pin, options);

            pin.pathTemplate = SVGPin.pathTemplate;
            if (!pin.pathTemplate) {
                pin.pathTemplate = SVGPin.pathTemplate = renderTemplate(
                    "M #= d.origin.x # #= d.origin.y # " +
                    "#= d.as.x # #= d.as.y # " +
                    "A#= d.r # #= d.r # " +
                    "0 #= d.isReflexAngle ? '1' : '0' #,0 " +
                    "#= d.ae.x # #= d.ae.y # " +
                    "z"
                );
            }

            pin.config = config || new dataviz.Pin();
        },

        renderPoints: function() {
            var pin = this,
                config = pin.config,
                r = config.radius,
                degrees = math.PI / 180,
                arcAngle = config.arcAngle,
                halfChordLength = r * math.sin(arcAngle * degrees / 2),
                height = config.height - r * (1 - math.cos(arcAngle * degrees / 2)),
                origin = config.origin,
                arcStart = { x: origin.x + halfChordLength, y: origin.y - height },
                arcEnd = { x: origin.x - halfChordLength, y: origin.y - height },
                rotate = function(point, inclinedPoint) {
                    var rotation = pin.options.rotation,
                        inclination = config.rotation;

                    point = rotatePoint(point.x, point.y, rotation[1], rotation[2], -rotation[0]);

                    if (inclinedPoint) {
                        point = rotatePoint(point.x, point.y, origin.x, origin.y, inclination);
                    }

                    return point;
                };

            origin = rotate(origin);

            return pin.pathTemplate({
                origin: origin,
                as: rotate(arcStart, true),
                ae: rotate(arcEnd, true),
                r: r,
                isReflexAngle: arcAngle > 180
            });
        }
    });

    var SVGSector = SVGRing.extend({
        init: function(config, options) {
            var sector = this;
            SVGRing.fn.init.call(sector, config, options);

            sector.pathTemplate = SVGSector.pathTemplate;
            if (!sector.pathTemplate) {
                sector.pathTemplate = SVGSector.pathTemplate = renderTemplate(
                    "M #= d.firstOuterPoint.x # #= d.firstOuterPoint.y # " +
                    "A#= d.r # #= d.r # " +
                    "0 #= d.isReflexAngle ? '1' : '0' #,1 " +
                    "#= d.secondOuterPoint.x # #= d.secondOuterPoint.y # " +
                    "L #= d.cx # #= d.cy # z"
                );
            }
        },

        options: {
            fill: "",
            fillOpacity: 1,
            strokeOpacity: 1,
            strokeLineCap: SQUARE
        },

        clone: function() {
            var sector = this;
            return new SVGSector(
                deepExtend({}, sector.config),
                deepExtend({}, sector.options)
            );
        }
    });

    var SVGCircle = ViewElement.extend({
        init: function(c, r, options) {
            var circle = this;
            ViewElement.fn.init.call(circle, options);

            circle.c = c;
            circle.r = r;

            circle.template = SVGCircle.template;
            if (!circle.template) {
                circle.template = SVGCircle.template = renderTemplate(
                    "<circle #= d.renderAttr(\"id\", d.options.id) # " +
                    "#= d.renderDataAttributes() #" +
                    "cx='#= d.c.x #' cy='#= d.c.y #' " +
                    "r='#= d.r #' " +
                    "#= d.renderAttr(\"stroke\", d.options.stroke) # " +
                    "#= d.renderAttr(\"stroke-width\", d.options.strokeWidth) #" +
                    "fill-opacity='#= d.options.fillOpacity #' " +
                    "stroke-opacity='#= d.options.strokeOpacity #'  " +
                    "fill='#= d.options.fill || \"none\" #'></circle>"
                );
            }
        },

        options: {
            fill: "",
            fillOpacity: 1,
            strokeOpacity: 1
        },

        refresh: function(domElement) {
            $(domElement).attr({
                "r": math.max(0, this.r),
                "fill-opacity": this.options.fillOpacity
            });
        },

        clone: function() {
            var circle = this;
            return new SVGCircle(
                deepExtend({}, circle.c),
                circle.r,
                deepExtend({}, circle.options)
            );
        }
    });

    var SVGGroup = ViewElement.extend({
        init: function(options) {
            var group = this;
            ViewElement.fn.init.call(group, options);

            group.template = SVGGroup.template;
            if (!group.template) {
                group.template = SVGGroup.template =
                renderTemplate(
                    "<g#= d.renderAttr(\"id\", d.options.id) #" +
                    "#= d.renderDataAttributes() #" +
                    "#= d.renderAttr(\"clip-path\", d.options.clipPath) #>" +
                    "#= d.renderContent() #</g>"
                );
            }
        }
    });

    var SVGClipPath = ViewElement.extend({
        init: function(options) {
            var clip = this;
            ViewElement.fn.init.call(clip, options);

            clip.template = SVGClipPath.template;
            if (!clip.template) {
                clip.template = SVGClipPath.template =
                renderTemplate("<clipPath#= d.renderAttr(\"id\", d.options.id) #>" +
                         "#= d.renderContent() #</clipPath>");
            }
        }
    });

    var SVGGradient = ViewElement.extend({
        init: function(options) {
            var gradient = this;
            ViewElement.fn.init.call(gradient, options);
        },

        options: {
            id: ""
        },

        renderStops: function() {
            var gradient = this,
                stops = gradient.options.stops,
                stopTemplate = gradient.stopTemplate,
                i,
                length = stops.length,
                currentStop,
                output = '';

            for (i = 0; i < length; i++) {
                currentStop = stops[i];
                output += stopTemplate(currentStop);
            }

            return output;
        }
    });

    var SVGLinearGradient = SVGGradient.extend({
        init: function(options) {
            var gradient = this;
            SVGGradient.fn.init.call(gradient, options);

            gradient.template = SVGLinearGradient.template;
            gradient.stopTemplate = SVGLinearGradient.stopTemplate;
            if (!gradient.template) {
                gradient.template = SVGLinearGradient.template = renderTemplate(
                    "<linearGradient id='#= d.options.id #' " +
                    "gradientTransform='rotate(#= d.options.rotation #)'> " +
                    "#= d.renderStops() #" +
                    "</linearGradient>"
                );

                gradient.stopTemplate = SVGLinearGradient.stopTemplate = renderTemplate(
                    "<stop offset='#= Math.round(d.offset * 100) #%' " +
                    "style='stop-color:#= d.color #;stop-opacity:#= d.opacity #' />");
            }
        },

        options: {
            rotation: 0
        }
    });

    var SVGRadialGradient = SVGGradient.extend({
        init: function(options) {
            var gradient = this;
            SVGGradient.fn.init.call(gradient, options);

            gradient.template = SVGRadialGradient.template;
            gradient.stopTemplate = SVGRadialGradient.stopTemplate;
            if (!gradient.template) {
                gradient.template = SVGRadialGradient.template = renderTemplate(
                    "<radialGradient id='#= d.options.id #' " +
                    "cx='#= d.options.cx #' cy='#= d.options.cy #' " +
                    "fx='#= d.options.cx #' fy='#= d.options.cy #' " +
                    "r='#= d.options.r #' gradientUnits='userSpaceOnUse'>" +
                    "#= d.renderStops() #" +
                    "</radialGradient>"
                );

                gradient.stopTemplate = SVGRadialGradient.stopTemplate = renderTemplate(
                    "<stop offset='#= Math.round(d.offset * 100) #%' " +
                    "style='stop-color:#= d.color #;stop-opacity:#= d.opacity #' />");
            }
        }
    });

    var SVGDonutGradient = ViewElement.extend({
        init: function(options) {
            var gradient = this;

            ViewElement.fn.init.call(gradient, options);

            gradient.template = SVGDonutGradient.template;
            gradient.stopTemplate = SVGDonutGradient.stopTemplate;
            if (!gradient.template) {
                gradient.template = SVGDonutGradient.template = renderTemplate(
                    "<radialGradient id='#= d.options.id #' " +
                    "cx='#= d.options.cx #' cy='#= d.options.cy #' " +
                    "fx='#= d.options.cx #' fy='#= d.options.cy #' " +
                    "r='#= d.options.r #' gradientUnits='userSpaceOnUse'>" +
                    "#= d.renderStops() #" +
                    "</radialGradient>"
                );

                gradient.stopTemplate = SVGDonutGradient.stopTemplate = renderTemplate(
                    "<stop offset='#= d.offset #%' " +
                    "style='stop-color:#= d.color #;stop-opacity:#= d.opacity #' />");
            }
        },

        options: {
            id: ""
        },

        renderStops: function() {
            var gradient = this,
                options = gradient.options,
                stops = options.stops,
                stopTemplate = gradient.stopTemplate,
                usedSpace = ((options.ir / options.r) * 100),
                i,
                length = stops.length,
                currentStop,
                output = '';

            currentStop = deepExtend({}, stops[0]);
            currentStop.offset = usedSpace;
            output += stopTemplate(currentStop);

            for (i = 1; i < length; i++) {
                currentStop = deepExtend({}, stops[i]);
                currentStop.offset = currentStop.offset * (100 -  usedSpace) + usedSpace;
                output += stopTemplate(currentStop);
            }

            return output;
        }
    });

    // Decorators =============================================================
    function SVGOverlayDecorator(view) {
        this.view = view;
    }

    SVGOverlayDecorator.prototype = {
        decorate: function(element) {
            var decorator = this,
                view = decorator.view,
                options = element.options,
                id = options.id,
                group,
                overlay;

            if (options.overlay) {
                element.options.id = uniqueId();

                group = view.createGroup();
                overlay = element.clone();

                group.children.push(element, overlay);

                overlay.options.id = id;
                overlay.options.fill = options.overlay;

                return group;
            } else {
                return element;
            }
        }
    };

    function SVGGradientDecorator(view) {
        this.view = view;
    }

    SVGGradientDecorator.prototype = {
        decorate: function(element) {
            var decorator = this,
                options = element.options;

            options.fill = decorator.getPaint(options.fill);

            return element;
        },

        getPaint: function(paint) {
            var decorator = this,
                view = decorator.view,
                baseUrl = decorator.baseUrl(),
                definitions = view.definitions,
                overlay,
                overlayId,
                gradient;

            if (paint && defined(paint.gradient)) {
                overlay = view.buildGradient(paint);
                if (overlay) {
                    overlayId = overlay.id;
                    gradient = definitions[overlayId];
                    if (!gradient) {
                        gradient = view.createGradient(overlay);
                        definitions[overlayId] = gradient;
                    }

                    return "url(" + baseUrl + "#" + gradient.options.id + ")";
                } else {
                    return NONE;
                }
            } else {
                return paint;
            }
        },

        baseUrl: function() {
            var base = doc.getElementsByTagName("base")[0],
                baseUrl = "",
                href = doc.location.href,
                hashIndex = href.indexOf("#");

            if (base && !kendo.support.browser.msie) {
                if (hashIndex !== -1) {
                    href = href.substring(0, hashIndex);
                }

                baseUrl = href;
            }

            return baseUrl;
        }
    };

    var SVGClipAnimationDecorator = Class.extend({
        init: function(view) {
            this.view = view;
            this.clipId = uniqueId();
        },

        decorate: function(element) {
            var decorator = this,
                view = decorator.view,
                clipId = decorator.clipId,
                options = view.options,
                animation = element.options.animation,
                definitions = view.definitions,
                clipPath = definitions[clipId],
                clipRect;

            if (animation && animation.type === CLIP && options.transitions) {
                if (!clipPath) {
                    clipPath = new SVGClipPath({ id: clipId });
                    clipRect = view.createRect(
                        new Box2D(0, 0, options.width, options.height), { id: uniqueId() });
                    clipPath.children.push(clipRect);
                    definitions[clipId] = clipPath;

                    view.animations.push(
                        new ExpandAnimation(clipRect, { size: options.width })
                    );
                }

                element.options.clipPath = "url(#" + clipId + ")";
            }

            return element;
        }
    });

    // Helpers ================================================================
    function alignToPixel(coord) {
        return math.round(coord) + 0.5;
    }

    function renderSVGDash(dashType, strokeWidth) {
        var result = [],
            dashTypeArray,
            i;

        dashType = dashType ? dashType.toLowerCase() : null;

        if (dashType && dashType != SOLID && strokeWidth) {
            dashTypeArray = SVG_DASH_TYPE[dashType];
            for (i = 0; i < dashTypeArray.length; i++) {
                result.push(dashTypeArray[i] * strokeWidth);
            }

            return "stroke-dasharray='" + result.join(" ") + "' ";
        }

        return "";
    }

    var renderSVG = function(container, svg) {
        container.innerHTML = svg;
    };

    (function() {
        var testFragment = "<svg xmlns='" + SVG_NS + "'></svg>",
            testContainer = doc.createElement("div"),
            hasParser = typeof DOMParser != UNDEFINED;

        testContainer.innerHTML = testFragment;

        if (hasParser && testContainer.firstChild.namespaceURI != SVG_NS) {
            renderSVG = function(container, svg) {
                var parser = new DOMParser(),
                    chartDoc = parser.parseFromString(svg, "text/xml"),
                    importedDoc = doc.adoptNode(chartDoc.documentElement);

                container.innerHTML = "";
                container.appendChild(importedDoc);
            };
        }
    })();

    // Exports ================================================================
    deepExtend(dataviz, {
        renderSVG: renderSVG,
        SVGCircle: SVGCircle,
        SVGClipAnimationDecorator: SVGClipAnimationDecorator,
        SVGClipPath: SVGClipPath,
        SVGGradientDecorator: SVGGradientDecorator,
        SVGGroup: SVGGroup,
        SVGLine: SVGLine,
        SVGLinearGradient: SVGLinearGradient,
        SVGOverlayDecorator: SVGOverlayDecorator,
        SVGPath: SVGPath,
        SVGRadialGradient: SVGRadialGradient,
        SVGDonutGradient: SVGDonutGradient,
        SVGRing: SVGRing,
        SVGSector: SVGSector,
        SVGText: SVGText,
        SVGView: SVGView
    });

})(jQuery);
(function () {

    // Imports ================================================================
    var $ = jQuery,
        doc = document,
        math = Math,

        kendo = window.kendo,
        Class = kendo.Class,
        deepExtend = kendo.deepExtend,

        dataviz = kendo.dataviz,
        Color = dataviz.Color,
        Box2D = dataviz.Box2D,
        Point2D = dataviz.Point2D,
        ExpandAnimation = dataviz.ExpandAnimation,
        ViewBase = dataviz.ViewBase,
        ViewElement = dataviz.ViewElement,
        defined = dataviz.defined,
        renderTemplate = dataviz.renderTemplate,
        uniqueId = dataviz.uniqueId,
        rotatePoint = dataviz.rotatePoint,
        round = dataviz.round,
        supportsSVG = dataviz.supportsSVG;

    // Constants ==============================================================
    var BLACK = "#000",
        CLIP = dataviz.CLIP,
        COORD_PRECISION = dataviz.COORD_PRECISION,
        DEFAULT_WIDTH = dataviz.DEFAULT_WIDTH,
        DEFAULT_HEIGHT = dataviz.DEFAULT_HEIGHT,
        DEFAULT_FONT = dataviz.DEFAULT_FONT,
        OBJECT = "object",
        LINEAR = "linear",
        RADIAL = "radial",
        TRANSPARENT = "transparent";

    // View ===================================================================
    var VMLView = ViewBase.extend({
        init: function(options) {
            var view = this;
            ViewBase.fn.init.call(view, options);

            view.decorators.push(
                new VMLOverlayDecorator(view),
                new VMLGradientDecorator(view)
            );

            if (dataviz.ui.Chart) {
                view.decorators.push(
                    new dataviz.BarAnimationDecorator(view),
                    new dataviz.PieAnimationDecorator(view),
                    new dataviz.BubbleAnimationDecorator(view)
                );
            }

            view.decorators.push(
                new VMLClipAnimationDecorator(view)
            );

            if (!isIE9CompatibilityView()) {
                // Setting opacity on VML elements is broken in
                // IE9 Compatibility View
                view.decorators.push(
                    new dataviz.FadeAnimationDecorator(view)
                );
            }

            if (dataviz.Gauge) {
                view.decorators.push(
                    new dataviz.RadialPointerAnimationDecorator(view),
                    new dataviz.ArrowPointerAnimationDecorator(view),
                    new dataviz.BarIndicatorAnimationDecorator(view)
                );
            }

            view.template = VMLView.template;
            if (!view.template) {
                view.template = VMLView.template = renderTemplate(
                    "<div style='width:#= d.options.width #px; " +
                    "height:#= d.options.height #px; " +
                    "position: relative;'>" +
                    "#= d.renderContent() #</div>"
                );
            }
        },

        options: {
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT
        },

        renderTo: function(container) {
            var view = this;

            if (doc.namespaces) {
                doc.namespaces.add("kvml", "urn:schemas-microsoft-com:vml", "#default#VML");
            }

            view.setupAnimations();
            container.innerHTML = view.render();
            view.playAnimations();

            return container.firstChild;
        },

        renderElement: function(element) {
            var container = doc.createElement("div"),
                domElement;

            container.style.display = "none";
            doc.body.appendChild(container);
            container.innerHTML = element.render();

            domElement = container.firstChild;
            doc.body.removeChild(container);

            return domElement;
        },

        createText: function(content, options) {
            return this.decorate(
                (options && options.rotation) ?
                    new VMLRotatedText(content, options) :
                    new VMLText(content, options)
            );
        },

        createRect: function(box, style) {
            return this.decorate(
                new VMLLine(box.points(), true, style)
            );
        },

        createLine: function(x1, y1, x2, y2, options) {
            return this.decorate(
                new VMLLine([new Point2D(x1, y1),
                    new Point2D(x2, y2)], false, options)
            );
        },

        createPolyline: function(points, closed, options) {
            return this.decorate(
                new VMLLine(points, closed, options)
            );
        },

        createCircle: function(center, radius, options) {
            return this.decorate(
                new VMLCircle(center, radius, options)
            );
        },

        createSector: function(sector, options) {
            return this.decorate(
                new VMLSector(sector, options)
            );
        },

        createRing: function(ring, options) {
            return this.decorate(
                new VMLRing(ring, options)
            );
        },

        createGroup: function(options) {
            return this.decorate(
                new VMLGroup(options)
            );
        },

        createGradient: function(options) {
            var validRadial = defined(options.cx) && defined(options.cy) && defined(options.bbox);

            if (options.type === RADIAL && validRadial) {
                return new VMLRadialGradient(options);
            } else if (options.type === LINEAR) {
                return new VMLLinearGradient(options);
            } else {
                return BLACK;
            }
        }
    });

    VMLView.fromModel = function(model) {
        var view = new VMLView(model.options);
        [].push.apply(view.children, model.getViewElements(view));

        return view;
    };

    VMLView.available = function() {
        return kendo.support.browser.msie;
    };

    VMLView.preference = 50;

    dataviz.ui.registerView(VMLView);

    // Primitives =============================================================
    var VMLText = ViewElement.extend({
        init: function(content, options) {
            var text = this;
            ViewElement.fn.init.call(text, options);

            text.content = content;
            text.template = VMLText.template;
            if (!text.template) {
                text.template = VMLText.template = renderTemplate(
                    "<kvml:textbox #= d.renderAttr(\"id\", d.options.id) # " +
                    "#= d.renderDataAttributes() #" +
                    "style='position: absolute; " +
                    "left: #= d.options.x #px; top: #= d.options.y #px; " +
                    "font: #= d.options.font #; color: #= d.options.color #; " +
                    "visibility: #= d.renderVisibility() #; white-space: nowrap;'>" +
                    "#= d.content #</kvml:textbox>"
                );
            }
        },

        options: {
            x: 0,
            y: 0,
            font: DEFAULT_FONT,
            color: BLACK,
            fillOpacity: 1
        },

        refresh: function(domElement) {
            $(domElement).css("visibility", this.renderVisibility());
        },

        clone: function() {
            var text = this;
            return new VMLText(text.content, deepExtend({}, text.options));
        },

        renderVisibility: function() {
            return this.options.fillOpacity > 0 ? "visible" : "hidden";
        }
    });

    var VMLRotatedText = ViewElement.extend({
        init: function(content, options) {
            var text = this;
            ViewElement.fn.init.call(text, options);

            text.content = content;
            text.template = VMLRotatedText.template;
            if (!text.template) {
                text.template = VMLRotatedText.template = renderTemplate(
                    "<kvml:shape #= d.renderAttr(\"id\", d.options.id) # " +
                    "#= d.renderDataAttributes() #" +
                    "style='position: absolute; top: 0px; left: 0px; " +
                    "width: 1px; height: 1px;' stroked='false' coordsize='1,1'>" +
                    "#= d.renderPath() #" +
                    "<kvml:fill color='#= d.options.color #' />" +
                    "<kvml:textpath on='true' style='font: #= d.options.font #;' " +
                    "fitpath='false' string='#= d.content #' /></kvml:shape>"
                );
            }
        },

        options: {
            x: 0,
            y: 0,
            font: DEFAULT_FONT,
            color: BLACK,
            size: {
                width: 0,
                height: 0
            }
        },

        renderPath: function() {
            var text = this,
                options = text.options,
                width = options.size.width,
                height = options.size.height,
                cx = options.x + width / 2,
                cy = options.y + height / 2,
                angle = -options.rotation,
                r1 = rotatePoint(options.x, cy, cx, cy, angle),
                r2 = rotatePoint(options.x + width, cy, cx, cy, angle);

            return "<kvml:path textpathok='true' " +
                   "v='m " + round(r1.x) + "," + round(r1.y) +
                   " l " + round(r2.x) + "," + round(r2.y) +
                   "' />";
        }
    });

    var VMLStroke = ViewElement.extend({
        init: function(options) {
            var stroke = this;
            ViewElement.fn.init.call(stroke, options);

            stroke.template = VMLStroke.template;
            if (!stroke.template) {
                stroke.template = VMLStroke.template = renderTemplate(
                    "<kvml:stroke on='#= !!d.options.stroke #' " +
                    "#= d.renderAttr(\"color\", d.options.stroke) #" +
                    "#= d.renderAttr(\"weight\", d.options.strokeWidth) #" +
                    "#= d.renderAttr(\"dashstyle\", d.options.dashType) #" +
                    "#= d.renderAttr(\"opacity\", d.options.strokeOpacity) # />"
                );
            }
        },

        refresh: function(domElement) {
            try {
              domElement.opacity = this.options.strokeOpacity;
            } catch(e) {
              // Random exceptions in IE 8 Compatibility View
            }
        }
    });

    var VMLFill = ViewElement.extend({
        init: function(options) {
            var stroke = this;
            ViewElement.fn.init.call(stroke, options);

            stroke.template = VMLFill.template;
            if (!stroke.template) {
                stroke.template = VMLFill.template = renderTemplate(
                    "<kvml:fill on='#= d.isEnabled() #' " +
                    "#= d.renderAttr(\"color\", d.options.fill) #" +
                    "#= d.renderAttr(\"weight\", d.options.fillWidth) #" +
                    "#= d.renderAttr(\"opacity\", d.options.fillOpacity) # />"
                );
            }
        },

        isEnabled: function() {
            var fill = this.options.fill;
            return !!fill && fill.toLowerCase() !== TRANSPARENT;
        },

        refresh: function(domElement) {
            try {
              domElement.opacity = this.options.fillOpacity;
            } catch(e) {
              // Random exceptions in IE 8 Compatibility View
            }
        }
    });

    var VMLPath = ViewElement.extend({
        init: function(options) {
            var path = this;
            ViewElement.fn.init.call(path, options);

            path.template = VMLPath.template;
            if (!path.template) {
                path.template = VMLPath.template = renderTemplate(
                    "<kvml:shape #= d.renderAttr(\"id\", d.options.id) # " +
                    "#= d.renderDataAttributes() #" +
                    "style='position:absolute; #= d.renderSize() #' " +
                    "coordorigin='0 0' #= d.renderCoordsize() # >" +
                        "<kvml:path v='#= d.renderPoints() # e' />" +
                        "#= d.fill.render() + d.stroke.render() #" +
                    "</kvml:shape>"
                );
            }

            path.stroke = new VMLStroke(path.options);
            path.fill = new VMLFill(path.options);
        },

        options: {
            fill: "",
            fillOpacity: 1,
            strokeOpacity: 1,
            rotation: [0,0,0]
        },

        renderCoordsize: function() {
            var scale = this.options.align === false ?  10000 : 1;
            return "coordsize='" + scale + " " + scale + "'";
        },

        renderSize: function() {
            var scale = this.options.align === false ?  100 : 1;
            return "width:" + scale + "px; height:" + scale + "px;";
        },

        render: function() {
            var path = this;
            path.fill.options.fillOpacity = path.options.fillOpacity;
            path.stroke.options.strokeOpacity = path.options.strokeOpacity;

            return ViewElement.fn.render.call(path);
        },

        renderPoints: function() {
            // Overriden by inheritors
        },

        refresh: function(domElement) {
            if (!domElement) {
                return;
            }

            var path = this,
                element = $(domElement),
                parentNode = element[0].parentNode,
                fill = path.fill,
                stroke = path.stroke;

            if (parentNode) {
                element.find("path")[0].v = this.renderPoints();

                fill.options = stroke.options = path.options;
                fill.refresh(element.find("fill")[0]);
                stroke.refresh(element.find("stroke")[0]);

                // Force redraw in order to remove artifacts in IE < 7
                parentNode.style.cssText = parentNode.style.cssText;
            }
        }
    });

    var VMLLine = VMLPath.extend({
        init: function(points, closed, options) {
            var line = this;
            VMLPath.fn.init.call(line, options);

            line.points = points;
            line.closed = closed;
        },

        renderPoints: function() {
            var line = this,
                points = line.points,
                i,
                count = points.length,
                rotate = function(point) {
                    var rotation = line.options.rotation;
                    return rotatePoint(point.x, point.y, rotation[1], rotation[2], -rotation[0]);
                },
                result = "m " + line._print(rotate(points[0]));

            if (count > 1) {
                result += " l ";

                for (i = 1; i < count; i++) {
                    result += line._print(rotate(points[i]));

                    if (i < count - 1) {
                        result += ", ";
                    }
                }
            }

            if (line.closed) {
                result += " x";
            }

            return result;
        },

        clone: function() {
            var line = this;
            return new VMLLine(
                deepExtend([], line.points), line.closed,
                deepExtend({}, line.options)
            );
        },

        _print: function(point) {
            var scale = this.options.align === false ?  100 : 1;
            return math.round(point.x * scale) + "," + math.round(point.y * scale);
        }
    });

    var VMLRing = VMLPath.extend({
        init: function(config, options) {
            var ring = this;
            VMLPath.fn.init.call(ring, options);

            ring.pathTemplate = VMLRing.pathTemplate;
            if (!ring.pathTemplate) {
                ring.pathTemplate = VMLRing.pathTemplate = renderTemplate(
                   "M #= d.osp.x #,#= d.osp.y # " +
                   "WA #= d.obb.l #,#= d.obb.t # #= d.obb.r #,#= d.obb.b # " +
                      "#= d.osp.x #,#= d.osp.y # #= d.oep.x #,#= d.oep.y # " +
                   "L #= d.iep.x #,#= d.iep.y # " +
                   "AT #= d.ibb.l #,#= d.ibb.t # #= d.ibb.r #,#= d.ibb.b # " +
                      "#= d.iep.x #,#= d.iep.y # #= d.isp.x #,#= d.isp.y # " +
                   "X E"
                );
            }

            ring.config = config;
        },

        renderPoints: function() {
            var ring = this,
                config = ring.config,
                r = math.max(round(config.r), 0),
                ir = math.max(round(config.ir), 0),
                cx = round(config.c.x),
                cy = round(config.c.y),
                startAngle = config.startAngle,
                endAngle = config.angle + startAngle,
                angle = endAngle - startAngle,
                outerBBox = {
                    l: cx - r,
                    t: cy - r,
                    r: cx + r,
                    b: cy + r
                },
                innerBBox = {
                    l: cx - ir,
                    t: cy - ir,
                    r: cx + ir,
                    b: cy + ir
                },
                outerStartPoint, innerStartPoint,
                innerEndPoint, outerEndPoint;

            function roundPointCoordinates(point) {
                return new Point2D(round(point.x), round(point.y));
            }

            if (angle <= 1) {
                endAngle += 1 - angle;
            } else if (angle > 359) {
                endAngle -= 1 - angle;
            }

            outerStartPoint = roundPointCoordinates(config.point(startAngle)),
            innerStartPoint = roundPointCoordinates(config.point(startAngle, true)),
            outerEndPoint = roundPointCoordinates(config.point(endAngle));
            innerEndPoint = roundPointCoordinates(config.point(endAngle, true));

            return ring.pathTemplate({
                obb: outerBBox,
                ibb: innerBBox,
                osp: outerStartPoint,
                isp: innerStartPoint,
                oep: outerEndPoint,
                iep: innerEndPoint,
                cx: cx,
                cy: cy
            });
        },

        clone: function() {
            var sector = this;
            return new VMLRing(
                deepExtend({}, sector.config),
                deepExtend({}, sector.options)
            );
        }
    });

    var VMLSector = VMLRing.extend({
        init: function(config, options) {
            var sector = this;
            VMLRing.fn.init.call(sector, config, options);

            sector.pathTemplate = VMLSector.pathTemplate;
            if (!sector.pathTemplate) {
                sector.pathTemplate = VMLSector.pathTemplate = renderTemplate(
                   "M #= d.osp.x #,#= d.osp.y # " +
                   "WA #= d.obb.l #,#= d.obb.t # #= d.obb.r #,#= d.obb.b # " +
                      "#= d.osp.x #,#= d.osp.y # #= d.oep.x #,#= d.oep.y # " +
                   "L #= d.cx #,#= d.cy # " +
                   "X E"
                );
            }
        },

        clone: function() {
            var sector = this;
            return new VMLSector(
                deepExtend({}, sector.config),
                deepExtend({}, sector.options)
            );
        }
    });

    var VMLCircle = ViewElement.extend({
        init: function(c, r, options) {
            var circle = this;
            ViewElement.fn.init.call(circle, options);

            circle.c = c;
            circle.r = r;

            circle.template = VMLCircle.template;
            if (!circle.template) {
                circle.template = VMLCircle.template = renderTemplate(
                    "<kvml:oval #= d.renderAttr(\"id\", d.options.id) # " +
                            "#= d.renderDataAttributes() #" +
                            "style='position:absolute; " +
                            "width:#= d.r * 2 #px; height:#= d.r * 2 #px; " +
                            "top:#= d.c.y - d.r #px; " +
                            "left:#= d.c.x - d.r #px;'>" +
                        "#= d.fill.render() + d.stroke.render() #" +
                    "</kvml:oval>"
                );
            }

            circle.stroke = new VMLStroke(circle.options);
            circle.fill = new VMLFill(circle.options);
        },

        options: {
            fill: ""
        },

        refresh: function(domElement) {
            var circle = this,
                c = circle.c,
                r = math.max(0, circle.r),
                size = r * 2,
                element = $(domElement);

            element.css({
                "width": size,
                "height": size,
                "top": c.y - r,
                "left": c.x - r
            });

            circle.fill.options = circle.options;
            circle.fill.refresh(element.find("fill")[0]);
        },

        clone: function() {
            var circle = this;
            return new VMLCircle(
                deepExtend({}, circle.c),
                circle.r,
                deepExtend({}, circle.options)
            );
        }
    });

    var VMLGroup = ViewElement.extend({
        init: function(options) {
            var group = this;
            ViewElement.fn.init.call(group, options);

            group.template = VMLGroup.template;
            if (!group.template) {
                group.template = VMLGroup.template = renderTemplate(
                    "<div #= d.renderAttr(\"id\", d.options.id) #" +
                    "#= d.renderDataAttributes() #" +
                    "style='position: absolute; white-space: nowrap;'>" +
                    "#= d.renderContent() #</div>"
                );
            }
        }
    });

    var VMLClipRect = ViewElement.extend({
        init: function(box, options) {
            var clipRect = this;
            ViewElement.fn.init.call(clipRect, options);

            clipRect.template = VMLClipRect.template;
            clipRect.clipTemplate = VMLClipRect.clipTemplate;
            if (!clipRect.template) {
                clipRect.template = VMLClipRect.template = renderTemplate(
                    "<div #= d.renderAttr(\"id\", d.options.id) #" +
                        "style='position:absolute; " +
                        "width:#= d.box.width() #px; height:#= d.box.height() #px; " +
                        "top:#= d.box.y1 #px; " +
                        "left:#= d.box.x1 #px; " +
                        "clip:#= d._renderClip() #;' >" +
                    "#= d.renderContent() #</div>"
                );

                clipRect.clipTemplate = VMLClipRect.clipTemplate = renderTemplate(
                    "rect(#= d.points[0].y #px #= d.points[1].x #px " +
                         "#= d.points[2].y #px #= d.points[0].x #px)"
                );
            }

            clipRect.box = box;

            // Points defining the clipping rectangle
            clipRect.points = box.points();
        },

        clone: function() {
            var clipRect = this;
            return new VMLClipRect(
                clipRect.box, deepExtend({}, clipRect.options)
            );
        },

        refresh: function(domElement) {
            domElement.style.clip = this._renderClip();
        },

        _renderClip: function() {
            return this.clipTemplate(this);
        }
    });

    var VMLGradient = ViewElement.extend({
        init: function(options) {
            var gradient = this;
            ViewElement.fn.init.call(gradient, options);
        },

        options: {
            opacity: 1
        },

        renderColors: function() {
            var gradient = this,
                options = gradient.options,
                stops = options.stops,
                currentStop,
                i,
                length = stops.length,
                output = [],
                round = math.round;

            for (i = 0; i < length; i++) {
                currentStop = stops[i];
                output.push(
                    round(currentStop.offset * 100) + "% " +
                    currentStop.color
                );
            }

            return output.join(",");
        }
    });

    var VMLLinearGradient = VMLGradient.extend({
        init: function(options) {
            var gradient = this;
            VMLGradient.fn.init.call(gradient, options);

            gradient.template = VMLLinearGradient.template;
            if (!gradient.template) {
                gradient.template = VMLLinearGradient.template = renderTemplate(
                    "<kvml:fill type='gradient' angle='#= 270 - d.options.rotation #' " +
                    "colors='#= d.renderColors() #' opacity='#= d.options.opacity #' />"
                );
            }
        },

        options: {
            rotation: 0
        }
    });

    var VMLRadialGradient = VMLGradient.extend({
        init: function(options) {
            var gradient = this;
            VMLGradient.fn.init.call(gradient, options);

            gradient.template = VMLRadialGradient.template;
            if (!gradient.template) {
                gradient.template = VMLRadialGradient.template = renderTemplate(
                    "<kvml:fill type='gradienttitle' focus='100%' focusposition='#= d.focusPosition() #'" +
                    "colors='#= d.renderColors() #' color='#= d.firstColor() #' color2='#= d.lastColor() #' opacity='#= d.options.opacity #' />"
                );
            }
        },

        focusPosition: function() {
            var options = this.options,
                bbox = options.bbox,
                cx = options.cx,
                cy = options.cy,
                focusx = Math.max(0, Math.min(1, (cx - bbox.x1) / bbox.width())),
                focusy = Math.max(0, Math.min(1, (cy - bbox.y1) / bbox.height()));

            return round(focusx, COORD_PRECISION) + " " +
                   round(focusy, COORD_PRECISION);
        },

        firstColor: function() {
            var stops = this.options.stops;
            return stops[0].color;
        },

        lastColor: function() {
            var stops = this.options.stops;
            return stops[stops.length - 1].color;
        }
    });

    // Decorators =============================================================
    function VMLOverlayDecorator(view) {
        this.view = view;
    }

    VMLOverlayDecorator.prototype = {
        decorate: function(element) {
            var options = element.options,
                view = this.view,
                overlay,
                bbox;

            if (options.overlay) {
                bbox = options.overlay.bbox;
                overlay = view.buildGradient(
                    deepExtend({}, options.overlay, {
                        // Make the gradient definition unique for this color
                        _overlayFill: options.fill,
                        // and for the radial gradient bounding box, if specified
                        _bboxHash: defined(bbox) ? bbox.getHash() : ""
                    })
                );
            }

            if (!overlay) {
                return element;
            }

            delete options.overlay;
            options.fill = deepExtend(
                blendGradient(options.fill, overlay),
                { opacity: options.fillOpacity }
            );

            return element;
        }
    };

    function VMLGradientDecorator(view) {
        this.view = view;
    }

    VMLGradientDecorator.prototype = {
        decorate: function(element) {
            var decorator = this,
                view = decorator.view,
                options = element.options,
                fill = options.fill;

            if (fill && fill.supportVML !== false) {
                if (fill.gradient) {
                    fill = view.buildGradient(fill);
                }

                if (typeof fill === OBJECT) {
                    element.fill = view.createGradient(fill);
                }
            }

            return element;
        }
    };

    var VMLClipAnimationDecorator = Class.extend({
        init: function(view) {
            this.view = view;
        },

        decorate: function(element) {
            var decorator = this,
                view = decorator.view,
                options = view.options,
                animation = element.options.animation,
                clipRect;

            if (animation && animation.type === CLIP && options.transitions) {
                clipRect = new VMLClipRect(
                    new Box2D(0, 0, options.width, options.height),
                    { id: uniqueId() }
                );

                view.animations.push(
                    new ExpandAnimation(clipRect, { size: options.width })
                );

                clipRect.children.push(element);

                return clipRect;
            } else {
                return element;
            }
        }
    });

    // Helpers ================================================================
    function isIE9CompatibilityView() {
        return kendo.support.browser.msie && !supportsSVG() && typeof window.performance !== "undefined";
    }

    function blendColors(base, overlay, alpha) {
        var baseColor = new Color(base),
            overlayColor = new Color(overlay),
            r = blendChannel(baseColor.r, overlayColor.r, alpha),
            g = blendChannel(baseColor.g, overlayColor.g, alpha),
            b = blendChannel(baseColor.b, overlayColor.b, alpha);

        return new Color(r, g, b).toHex();
    }

    function blendChannel(a, b, alpha) {
        return math.round(alpha * b + (1 - alpha) * a);
    }

    function blendGradient(color, gradient) {
        var srcStops = gradient.stops,
            stopsLength = srcStops.length,
            result = deepExtend({}, gradient),
            i,
            stop,
            resultStop;

        result.stops = [];

        for (i = 0; i < stopsLength; i++) {
            stop = srcStops[i];
            resultStop = result.stops[i] = deepExtend({}, srcStops[i]);
            resultStop.color = blendColors(color, stop.color, stop.opacity);
            resultStop.opacity = 0;
        }

        return result;
    }

    // Exports ================================================================
    deepExtend(dataviz, {
        VMLCircle: VMLCircle,
        VMLClipAnimationDecorator: VMLClipAnimationDecorator,
        VMLClipRect: VMLClipRect,
        VMLFill: VMLFill,
        VMLGroup: VMLGroup,
        VMLLine: VMLLine,
        VMLLinearGradient: VMLLinearGradient,
        VMLOverlayDecorator: VMLOverlayDecorator,
        VMLPath: VMLPath,
        VMLRadialGradient: VMLRadialGradient,
        VMLRing: VMLRing,
        VMLRotatedText: VMLRotatedText,
        VMLSector: VMLSector,
        VMLStroke: VMLStroke,
        VMLText: VMLText,
        VMLView: VMLView,

        blendColors: blendColors,
        blendGradient: blendGradient
    });

})(jQuery);
