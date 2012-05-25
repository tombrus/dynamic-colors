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
    var colorNumToRegexHex = [];
    var colorNumToRegexRgb = [];
    var colorNumToCurrentHex = [];
    var colorNumToCurrentRgb = [];
    var colorNumToDefault = [];
    var colorNumToPicker = [];
    var allPatches = [];
    var signature = "{}";
    var listeners = [];

    function numberWanted (numOrName) {
        var num = colorNameToNum[numOrName];
        return num==undefined ? numOrName : num;

    }

    function nameWanted (numOrName) {
        var name = colorNumToName[numOrName];
        return name==undefined ? numOrName : name;
    }

    function hexColorToNum (color) {
        var digits = /#([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])/.exec(color);
        if (digits) {
            return (parseInt(digits[1], 16)<<16) | (parseInt(digits[2], 16)<<8) | parseInt(digits[3], 16);
        } else {
            digits = /#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/.exec(color);
            if (digits) {
                return (parseInt(digits[1], 16)<<16)*16 | (parseInt(digits[2], 16)<<8)*16 | parseInt(digits[3], 16)*16;
            }
        }
        return 0xdeadcf;
    }

    function numToHexColor (r, g, b) {
        if (g!=undefined) {
            r = (r<<16) | (g<<8) | b;
        }
        return '#'+("000000"+r.toString(16)).substr(-6);
    }

    function numToR (num) {
        return (num>>16) & 0xff;
    }

    function numToG (num) {
        return (num>>8) & 0xff;
    }

    function numToB (num) {
        return (num>>0) & 0xff;
    }

    function colorToHex (color) {
        if (color.substr(0, 3)=='rgb') {
            var digits = /rgb\((\d+), (\d+), (\d+)\)/.exec(color);
            if (digits) {
                color = numToHexColor(parseInt(digits[1]), parseInt(digits[2]), parseInt(digits[3]))
            }
        }
        return color;
    }

    function colorToRgb (color) {
        if (color.substr(0, 1)=='#') {
            var num = hexColorToNum(color);
            color = "rgb("+numToR(num)+", "+numToG(num)+", "+numToB(num)+")";
        }
        return color;
    }

    function anyMatchIn (text) {
        var result = false;
        if (text!=undefined) {
            $.each(colorNumToRegexRgb, function (num, re) {
                result = !!(text.match(re));
                return !result;
            });
            if (!result) {
                $.each(colorNumToRegexHex, function (num, re) {
                    result = !!(text.match(re));
                    return !result;
                });
            }
        }
        return result;
    }

    function eachRule (f) {
        $.each(document.styleSheets, function (sheetIndex, sheet) {
            var rules = sheet.rules || sheet.cssRules;
            if (rules!=undefined) {
                $.each(rules, function (ruleIndex, rule) {
                    f(rule, sheetIndex, ruleIndex);
                });
            }
        });
    }

    function init (verb) {
        setVerbose(verb);
        verbose && ver("========= finding colors:");
        eachRule(addColorFromRule);
        verbose &&ver("========= finding places to patch:");
        eachRule(gatherPatchLocations);
        verbose &&ver("========= found "+colorNumToCurrentHex.length+" colors");
        verbose &&ver("========= found "+allPatches.length+" places to patch");
        colorNumToDefault = colorNumToCurrentHex.slice();
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
    }

    function getDynamicColorRuleName (rule) {
        var selectorText = rule.selectorText;
        if (selectorText!=undefined) {
            var m = selectorText.match(/^#DynamicColors(_(.*))?$/);
            if (m) {
                return m[2];
            }
        }
        return undefined;
    }

    function addColorFromRule (rule) {
        var style = rule.style;
        var name = getDynamicColorRuleName(rule);

        if (name && style!=undefined && style.color!=undefined) {
            addColor(name, style.color);
        }
    }

    function addColor (colorName, color) {
        var colorRgb = colorToRgb(color);
        var colorHex = colorToHex(color);
        var colorNumber = colorNumToCurrentHex.length;
        colorNumToCurrentHex[colorNumber] = colorHex;
        colorNumToCurrentRgb[colorNumber] = colorRgb;
        colorNumToRegexHex[colorNumber] = new RegExp(colorHex, "g");
        colorNumToRegexRgb[colorNumber] = new RegExp(colorRgb.replace(/[)(]/g, "\\$&"), "g");
        if (colorName!=undefined) {
            colorNameToNum[colorName] = colorNumber;
            colorNumToName[colorNumber] = colorName;
        }
        verbose &&ver("Color found: ", colorNumber, colorName, colorNumToRegexHex[colorNumber], colorNumToRegexRgb[colorNumber], colorRgb, colorHex);
        return colorNumber;
    }

    function gatherPatchLocations (rule, sheetIndex, ruleIndex) {
        var style = rule.style;
        var cssText = rule.cssText;
        var name = getDynamicColorRuleName(rule);

        if (!name && anyMatchIn(cssText)) {
            verbose &&ver("matched something in style:", cssText);
            $.each(style, function (i, field) {
                var value = style.getPropertyValue(field);
                if (anyMatchIn(value)) {
                    verbose &&ver("  matched field="+field+" val="+value);
                    var patch = {
                        style     : style,
                        field     : field,
                        orig      : value,
                        sheetIndex: sheetIndex,
                        ruleIndex : ruleIndex
                    };
                    if ($.inArray(patch, allPatches)==-1) {
                        allPatches.push(patch);
                        verbose &&ver("    found patch:", patch);
                    }
                }
            });
        }
    }

    function getColor (numOrName) {
        return numOrName && colorNumToCurrentHex[numberWanted(numOrName)];
    }

    function setColor () {
        verbose &&ver("========= setting colors: ", arguments);
        if (arguments.length>0) {
            if (arguments.length>2) {
                throw new Error("setColor() can only be called with one or two parameters");
            }
            var all = arguments[0];
            if (arguments.length==2) {
                all = {};
                all[arguments[0]] = arguments[1];
            }
            $.each(all, function (numOrName, color) {
                if ((typeof color)=="string") {
                    var colorHex = colorToHex(color);
                    var colorRgb = colorToRgb(color);
                    var colorNum = numberWanted(numOrName);
                    colorNumToCurrentHex[colorNum] = colorHex;
                    colorNumToCurrentRgb[colorNum] = colorRgb;
                    verbose &&ver("  color set: name="+nameWanted(numOrName)+" number="+colorNum+" color="+colorRgb+"/"+colorHex);
                }
            });
            $.each(allPatches, function (i, patch) {
                var oldValue = patch.style.getPropertyValue(patch.field);
                var newValue = patch.orig;
                $.each(colorNumToCurrentHex, function (colorNum, unused) {
                    var regex = colorNumToRegexHex[colorNum];
                    if (regex!=undefined) {
                        newValue = newValue.replace(regex, "<<H<"+colorNum+">>>");
                    }
                    regex = colorNumToRegexRgb[colorNum];
                    if (regex!=undefined) {
                        newValue = newValue.replace(regex, "<<R<"+colorNum+">>>");
                    }
                });
                $.each(colorNumToCurrentHex, function (colorNum, unused) {
                    var regex = colorNumToRegexHex[colorNum];
                    if (regex!=undefined) {
                        newValue = newValue.replace("<<H<"+colorNum+">>>", colorNumToCurrentHex[colorNum]);
                    }
                    regex = colorNumToRegexRgb[colorNum];
                    if (regex!=undefined) {
                        newValue = newValue.replace("<<R<"+colorNum+">>>", colorNumToCurrentRgb[colorNum]);
                    }
                });
                if (oldValue!=newValue) {
                    verbose &&ver("  patched    : fld="+patch.field+" orig="+patch.orig+" old="+oldValue+" new="+newValue+" style=", patch.style);
                    patch.style.setProperty(patch.field, newValue, "");
                    patch.style.visibility = patch.style.visibility; // just to make IE happy
                } else {
                    verbose && ver("  NOT patched: fld="+patch.field+" orig="+patch.orig+" old="+oldValue+" new="+newValue+" style=", patch.style);
                }
            });
            $.each(listeners, function (i, f) {
                f();
            });
        }
    }

    function getNames () {
        var names = [];
        $.each(colorNumToName, function (i, name) {
            names.push(name);
        });
        return names;
    }

    function getSignature () {
        return signature;
    }

    function setSignature (signature) {
        setColor(JSON.parse(signature));
    }

    function reset () {
        setColor(colorNumToDefault);
    }

    function listen (fs) {
        $.each(arguments, function (i, f) {
            listeners.push(f);
            f();
        });
    }

    function bindSignature (here) {
        listen(function () {
            updateSignature();
            here.text(signature);
            here.val(signature);
            prepPickers();
        });
    }

    function updateSignature () {
        var nameToCurrent = {};
        $.each(colorNameToNum, function (colorName, colorNum) {
            var color = colorNumToCurrentHex[colorNum];
            if (color) {
                nameToCurrent[colorName] = color;
            }
        });
        signature = JSON.stringify(nameToCurrent);
        $.cookie("DynamicColorsSignature", signature);
    }

    function prepPickers () {
        $.each(colorNumToPicker, function (num, picker) {
            var div = picker.find("div");
            var color = colorNumToCurrentHex[num];
            div.ColorPickerSetColor(color);
            div.css('backgroundColor', color);
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
            $.each(colorNumToName, function (num, unused) {
                var picker = $(part);
                colorNumToPicker[num] = picker;
                var div = picker.find("div");
                var s = selector.find("#DC-selectors").get(0);
                picker.appendTo(s);
                picker.ColorPicker({
                    onBeforeShow: function () {
                        picker.ColorPickerSetColor(colorNumToCurrentHex[num]);
                    },
                    onChange    : function (unused1, hex, unused2) {
                        var color = "#"+hex;
                        div.css('backgroundColor', color);
                        setColor(num, color);
                    }
                });
            });
            bindSignature(selector.find("#DC-signature"))
        }
    }

    function animate (steps, how) {
        var stepDuration = ((how && how.duration) || 400)/steps.length;
        var mySteps = [];
        $.each(steps, function (i, step) {
            var myStep = {};
            $.each(step, function (name, color) {
                myStep[name+"_r"] = numToR(hexColorToNum(color));
                myStep[name+"_g"] = numToG(hexColorToNum(color));
                myStep[name+"_b"] = numToB(hexColorToNum(color));
            });
            mySteps[i] = myStep;
        });
        var stepNum = -1;
        var complete = function () {
            stepNum++;
            step(mySteps[stepNum]);
            if (stepNum+1<mySteps.length) {
                $($.extend({}, mySteps[stepNum])).animate(mySteps[stepNum+1], myHow);
            } else if (how && how.complete) {
                how.complete();
            }
        };
        var step = function (data) {
            var myColors = {};
            $.each(steps[stepNum], function (name, unused) {
                myColors[name] = numToHexColor(data[name+"_r"], data[name+"_g"], data[name+"_b"]);
            });
            setColor(myColors);
        };
        var myHow = $.extend({}, how, {
            duration: stepDuration,
            complete: complete,
            step    : function () {
                step(this);
            }
        });
        myHow.complete();
    }

    function setVerbose (on) {
        if (typeof on=="boolean") {
            verbose = on;
        }
    }

    function ver () {
        return verbose && window.console && console.log && Function.apply.call(console.log, console, arguments);
    }

    $.extend($, {
        DynamicColors             : init,
        DynamicColors_getColor    : getColor,
        DynamicColors_setColor    : setColor,
        DynamicColors_getSignature: getSignature,
        DynamicColors_setSignature: setSignature,
        DynamicColors_getNames    : getNames,
        DynamicColors_reset       : reset,
        DynamicColors_animate     : animate,
        DynamicColors_setVerbose  : setVerbose
    });
})(jQuery);
