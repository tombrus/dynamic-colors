/*
 * Dynamic Colors Plugin
 * https://github.com/tombrus/dynamic-colors
 *
 * Adapted by     : Tom Brus        www.tombrus.com
 *
 * Copyright 2012, Tom Brus
 *
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *    http://www.opensource.org/licenses/mit-license.php
 *    http://www.opensource.org/licenses/GPL-2.0
 */
(function ($) {
    var verbose = false;
    var colorNameToNum = {};
    var colorNumToName = [];
    var colorNumToRegex = [];
    var colorNumToCurrent = [];
    var colorNumToDefault = [];
    var colorNumToPicker = [];
    var allPatches = [];
    var signature = "{}";
    var listeners = [];

    function nameWanted (numOrName) {
        var num = colorNameToNum[numOrName];
        return num==undefined ? numOrName : num;

    }

    function numberWanted (numOrName) {
        var name = colorNumToName[numOrName];
        return name==undefined ? numOrName : name;

    }

    function colorToHex (color) {
        if (color.substr(0, 1)!=='#') {
            var digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color);
            var rgb = parseInt(digits[4]) | (parseInt(digits[3])<<8) | (parseInt(digits[2])<<16);
            color = digits[1]+'#'+("000000"+rgb.toString(16)).substr(-6);
        }
        return color;
    }

    function anyMatchIn (text) {
        var result = false;
        if (text!=undefined) {
            $.each(colorNumToRegex, function (num, re) {
                result = !!(text.match(re));
                return !result;
            });
        }
        return result;
    }

    function eachRule (f) {
        $.each(document.styleSheets, function (i, sheet) {
            var rules = sheet.rules || sheet.cssRules;
            if (rules!=undefined) {
                $.each(rules, function (i, rule) {
                    f(rule);
                });
            }
        });
    }

    function addColorFromRule (rule) {
        var selectorText = rule.selectorText;
        var style = rule.style;
        if (selectorText!=undefined && style!=undefined && style.color!=undefined) {
            var m = selectorText.match(/^#DynamicColors(_(.*))?$/);
            if (m) {
                addColor(m[2], style.color);
            }
        }
    }

    function addColor (colorName, color) {
        var colorNumber = colorNumToRegex.length;
        colorNumToRegex[colorNumber] = new RegExp(color.replace(/[)(]/g, "\\$&"), "g");
        colorNumToCurrent[colorNumber] = colorToHex(color);
        if (colorName!=undefined) {
            colorNameToNum[colorName] = colorNumber;
            colorNumToName[colorNumber] = colorName;
        }
        if (verbose) {
            console.log("Color found: ", colorNumber, colorName, colorNumToRegex[colorNumber], color);
        }
        return colorNumber;
    }

    function gatherPatchLocations (rule) {
        var cssText = rule.cssText;
        var style = rule.style;

        if (anyMatchIn(cssText)) {
            if (verbose) {
                console.log("matched whole style:", cssText);
            }
            $.each(style, function (i, field) {
                var value = style[field] || style.getPropertyValue(field);
                if (anyMatchIn(value)) {
                    if (verbose) {
                        console.log("matched one field:", value);
                    }
                    var patch = {
                        style: style,
                        field: field,
                        orig : value
                    };
                    if ($.inArray(patch, allPatches)==-1) {
                        allPatches.push(patch);
                        if (verbose) {
                            console.log("found patch:", patch);
                        }
                    }
                }
            });
        }
    }

    function getColor (numOrName) {
        return numOrName && colorNumToCurrent[nameWanted(numOrName)];
    }

    function setColor (numOrName, color) {
        if (numOrName!=undefined) {
            var all = numOrName;
            if (arguments.length==2) {
                var tmp = {};
                tmp[numOrName] = color;
                all = tmp;
            }
            $.each(all, function (numOrName, color) {
                colorNumToCurrent[nameWanted(numOrName)] = colorToHex(color);
                if (verbose) {
                    console.log("color set: ", numberWanted(numOrName), nameWanted(numOrName), color);
                }
            });
            updateSignature();
            $.each(listeners, function (i, f) {
                f();
            });
            $.each(allPatches, function (i, patch) {
                var value = patch.orig;
                $.each(colorNumToCurrent, function (colorNum, color) {
                    var regex = colorNumToRegex[colorNum];
                    if (regex!=undefined && color!=undefined) {
                        value = value.replace(regex, "<<<"+colorNum+">>>");
                    }
                });
                $.each(colorNumToCurrent, function (colorNum, color) {
                    var regex = colorNumToRegex[colorNum];
                    if (regex!=undefined && color!=undefined) {
                        value = value.replace("<<<"+colorNum+">>>", color);
                    }
                });
                if (patch.style[patch.field]!=value) {
                    if (verbose) {
                        console.log("color patched: ", patch.style, patch.field, patch.orig, ": ", patch.style.getPropertyValue(patch.field), "=>", value);
                    }
                    patch.style.setProperty(patch.field, value, "");
                }
            });
        }
    }

    function updateSignature () {
        var nameToCurrent = {};
        $.each(colorNameToNum, function (colorName, colorNum) {
            var color = colorNumToCurrent[colorNum];
            if (color) {
                nameToCurrent[colorName] = color;
            }
        });
        signature = JSON.stringify(nameToCurrent);
        $.cookie("DynamicColorsSignature", signature);
    }

    function setSignature (signature) {
        setColor(JSON.parse(signature));
        prepPickers();
    }

    function listen (fs) {
        $.each(arguments, function (i, f) {
            listeners.push(f);
            f();
        });
    }

    function bindSignature (here) {
        listen(function () {
            here.text(signature);
            here.val(signature);
        });
    }

    function createColorPanel (here) {
        if (here) {
            var l1 = '<button class="DC-resetButton" onclick="$.DynamicColors_reset();">reset colors</button>';
            var l2 = '<p>Adjust the colors:</p>';
            var l3 = '<div id="DC-selectors"></div>';
            var l4 = '<p>signature (copy and save for later):</p>';
            var l5 = '<input type="text" id="DC-signature" oninput="$.DynamicColors_setSignature(this.value)">';
            var inner = '<div id="DC-selector">'+l1+l2+l3+l4+l5+'</div>';
            var part = '<div class="colorSelector"><div></div></div>';

            var selector = $(inner);
            selector.appendTo(here);
            $.each(colorNumToName, function (num, name) {
                var picker = $(part);
                colorNumToPicker[num] = picker;
                var div = picker.find("div");
                var s = selector.find("#DC-selectors").get(0);
                picker.appendTo(s);
                picker.ColorPicker({
                    onBeforeShow: function () {
                        picker.ColorPickerSetColor(colorNumToCurrent[num]);
                    },
                    onChange    : function (hsb, hex, rgb) {
                        var color = "#"+hex;
                        div.css('backgroundColor', color);
                        setColor(name, color);
                    }
                });
            });
            prepPickers();
            bindSignature(selector.find("#DC-signature"))
        }
    }

    function prepPickers () {
        $.each(colorNumToPicker, function (num, picker) {
            var div = picker.find("div");
            var color = colorNumToCurrent[num];
            div.ColorPickerSetColor(color);
            div.css('backgroundColor', color);
        });
    }

    $.extend($, {
        DynamicColors             : function (b) {
            if (typeof b=="boolean") {
                verbose = b;
            }
            eachRule(addColorFromRule);
            eachRule(gatherPatchLocations);
            if (verbose) {
                console.log("found "+colorNumToCurrent.length+" colors");
                console.log("found "+allPatches.length+" usages");
            }
            colorNumToDefault = colorNumToCurrent.slice();
            setSignature($.cookie("DynamicColorsSignature"));
            $.each(arguments, function (i, a) {
                switch (typeof a) {
                    case "boolean":
                        // handled above
                        break;
                    case "function":
                        listen(a);
                        break;
                    case "object":
                        if (a.context instanceof Node) {
                            createColorPanel(a);
                        } else {
                            throw new Error("Unknown object argument: "+a);
                        }
                        break;
                    default:
                        throw new Error("Unknown argument type: "+typeof a);
                        break;
                }
            })
        },
        DynamicColors_getColor    : function (numOrName) {
            return getColor(numOrName);
        },
        DynamicColors_setColor    : function (numOrName, color) {
            return setColor(numOrName, color);
        },
        DynamicColors_getSignature: function () {
            return signature;
        },
        DynamicColors_setSignature: function (signature) {
            setSignature(signature);
        },
        DynamicColors_getNames    : function () {
            var names = [];
            $.each(colorNumToName, function (i, name) {
                names.push(name);
            });
            return names;
        },
        DynamicColors_reset       : function () {
            setColor(colorNumToDefault);
            prepPickers();
        }
    });
})(jQuery);
