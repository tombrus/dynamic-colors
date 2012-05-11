/*
 * Color Picker Plugin
 * https://github.com/tombrus/dynamic-colors
 *
 * Original Author: Stefan Petre    www.eyecon.ro
 * Adapted by     : Tom Brus        www.tombrus.com
 *
 * Copyright 2012, Tom Brus
 *
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *    http://www.opensource.org/licenses/mit-license.php
 *    http://www.opensource.org/licenses/GPL-2.0
 */
(function () {
    var ColorPicker = function () {
        const tpl = (function () {
            var h;
            h = '<div class="colorpicker">';
            h += /**/'<div class="colorpicker_color"><div><div></div></div></div>';
            h += /**/'<div class="colorpicker_hue"><div></div></div>';
            h += /**/'<div class="colorpicker_new_color"></div>';
            h += /**/'<div class="colorpicker_current_color"></div>';
            h += /**/'<div class="colorpicker_hex">';
            h += /**//**/'<input type="text" maxlength="6" size="6" />';
            h += /**/'</div>';
            $.each(["rgb_r", "rgb_g", "rgb_b", "hsb_h", "hsb_s", "hsb_b"], function (i, name) {
                h += /**/'<div class="colorpicker_'+name+' colorpicker_field">';
                h += /**//**/'<input type="text" maxlength="3" size="3" /><span></span>';
                h += /**/'</div>';
            });
            h += /**/'<div class="colorpicker_submit"></div>';
            h += '</div>';
            return h;
        })();
        const defaults = {
            eventName   : 'click',
            onShow      : function () {
            },
            onBeforeShow: function () {
            },
            onHide      : function () {
            },
            onChange    : function () {
            },
            onSubmit    : function () {
            },
            color       : 'ff0000',
            livePreview : true,
            flat        : false
        };
        var charMin = 65;

        var fillRGBFields = function (hsb, picker) {
            var rgb = HSBToRGB(hsb);
            $(picker).data('colorpicker').fields.eq(1).val(rgb.r).end().eq(2).val(rgb.g).end().eq(3).val(rgb.b).end();
        };
        var fillHSBFields = function (hsb, picker) {
            $(picker).data('colorpicker').fields.eq(4).val(hsb.h).end().eq(5).val(hsb.s).end().eq(6).val(hsb.b).end();
        };
        var fillHexFields = function (hsb, picker) {
            $(picker).data('colorpicker').fields.eq(0).val(HSBToHex(hsb)).end();
        };
        var setSelector = function (hsb, picker) {
            var config = $(picker).data('colorpicker');
            config.selector.css('backgroundColor', '#'+HSBToHex({h: hsb.h, s: 100, b: 100}));
            config.selectorIndic.css({
                left: parseInt(150*hsb.s/100, 10),
                top : parseInt(150*(100-hsb.b)/100, 10)
            });
        };
        var setHue = function (hsb, picker) {
            $(picker).data('colorpicker').hue.css('top', parseInt(150-150*hsb.h/360, 10));
        };
        var setCurrentColor = function (hsb, picker) {
            $(picker).data('colorpicker').currentColor.css('backgroundColor', '#'+HSBToHex(hsb));
        };
        var setNewColor = function (hsb, picker) {
            $(picker).data('colorpicker').newColor.css('backgroundColor', '#'+HSBToHex(hsb));
        };
        var keyDown = function (ev) {
            var pressedKey = ev.charCode || ev.keyCode || -1;
            if ((pressedKey>charMin && pressedKey<=90) || pressedKey==32) {
                return false;
            }
            var picker = $(this).parent().parent();
            var config = picker.data('colorpicker');
            if (config.livePreview===true) {
                change.apply(this);
            }
        };
        var change = function (ev) {
            var picker = $(this).parent().parent();
            var config = picker.data('colorpicker');
            var color;
            if (this.parentNode.className.indexOf('_hex')>0) {
                color = HexToHSB(fixHex(this.value));
            } else if (this.parentNode.className.indexOf('_hsb')>0) {
                color = fixHSB({
                    h: parseInt(config.fields.eq(4).val(), 10),
                    s: parseInt(config.fields.eq(5).val(), 10),
                    b: parseInt(config.fields.eq(6).val(), 10)
                });
            } else {
                color = RGBToHSB(fixRGB({
                    r: parseInt(config.fields.eq(1).val(), 10),
                    g: parseInt(config.fields.eq(2).val(), 10),
                    b: parseInt(config.fields.eq(3).val(), 10)
                }));
            }
            config.color = color;
            if (ev) {
                fillRGBFields(color, picker.get(0));
                fillHexFields(color, picker.get(0));
                fillHSBFields(color, picker.get(0));
            }
            setSelector(color, picker.get(0));
            setHue(color, picker.get(0));
            setNewColor(color, picker.get(0));
            config.onChange.apply(picker, [color, HSBToHex(color), HSBToRGB(color)]);
        };
        var blur = function () {
            var picker = $(this).parent().parent();
            var config = picker.data('colorpicker');
            config.fields.parent().removeClass('colorpicker_focus');
        };
        var focus = function () {
            charMin = this.parentNode.className.indexOf('_hex')>0 ? 70 : 65;
            $(this).parent().parent().data('colorpicker').fields.parent().removeClass('colorpicker_focus');
            $(this).parent().addClass('colorpicker_focus');
        };
        var downIncrement = function (ev) {
            var field = $(this).parent().find('input').focus();
            var current = {
                el     : $(this).parent().addClass('colorpicker_slider'),
                max    : this.parentNode.className.indexOf('_hsb_h')>0 ? 360 : (this.parentNode.className.indexOf('_hsb')>0 ? 100 : 255),
                y      : ev.pageY,
                field  : field,
                val    : parseInt(field.val(), 10),
                preview: $(this).parent().parent().data('colorpicker').livePreview
            };
            $(document).bind('mouseup', current, upIncrement);
            $(document).bind('mousemove', current, moveIncrement);
        };
        var moveIncrement = function (ev) {
            ev.data.field.val(Math.max(0, Math.min(ev.data.max, parseInt(ev.data.val+ev.pageY-ev.data.y, 10))));
            if (ev.data.preview) {
                change.apply(ev.data.field.get(0), [true]);
            }
            return false;
        };
        var upIncrement = function (ev) {
            change.apply(ev.data.field.get(0), [true]);
            ev.data.el.removeClass('colorpicker_slider').find('input').focus();
            $(document).unbind('mouseup', upIncrement);
            $(document).unbind('mousemove', moveIncrement);
            return false;
        };
        var downHue = function (ev) {
            var picker = $(this).parent();
            ev.data = {
                picker : picker,
                y      : $(this).offset().top,
                preview: picker.data('colorpicker').livePreview
            };
            $(document).bind('mouseup', ev.data, upHue);
            $(document).bind('mousemove', ev.data, moveHue);
            moveHue(ev);
        };
        var moveHue = function (ev) {
            var y = parseInt(360*(150-Math.max(0, Math.min(150, (ev.pageY-ev.data.y))))/150, 10);
            var config = ev.data.picker.data('colorpicker');
            var f4 = config.fields.eq(4);
            f4.val(y);
            change.apply(f4.get(0), [ev.data.preview]);
            return false;
        };
        var upHue = function (ev) {
            var picker = ev.data.picker;
            var color = picker.data('colorpicker').color;
            fillRGBFields(color, picker.get(0));
            fillHexFields(color, picker.get(0));
            $(document).unbind('mouseup', upHue);
            $(document).unbind('mousemove', moveHue);
            return false;
        };
        var downSelector = function (ev) {
            var picker = $(this).parent();
            ev.data = {
                picker : picker,
                pos    : $(this).offset(),
                preview: picker.data('colorpicker').livePreview
            };
            $(document).bind('mouseup', ev.data, upSelector);
            $(document).bind('mousemove', ev.data, moveSelector);
            moveSelector(ev);
        };
        var moveSelector = function (ev) {
            var config = ev.data.picker.data('colorpicker');
            var x = parseInt(100*(    Math.max(0, Math.min(150, (ev.pageX-ev.data.pos.left))))/150, 10);
            var y = parseInt(100*(150-Math.max(0, Math.min(150, (ev.pageY-ev.data.pos.top ))))/150, 10);
            var f6 = config.fields.eq(6);
            var f5 = config.fields.eq(5);
            f6.val(y);
            f5.val(x);
            change.apply(f5.get(0), [ev.data.preview]);
            return false;
        };
        var upSelector = function (ev) {
            var config = ev.data.picker.data('colorpicker');
            var picker = ev.data.picker.get(0);
            var hsb = config.color;
            fillRGBFields(hsb, picker);
            fillHexFields(hsb, picker);
            $(document).unbind('mouseup', upSelector);
            $(document).unbind('mousemove', moveSelector);
            return false;
        };
        var enterSubmit = function () {
            $(this).addClass('colorpicker_focus');
        };
        var leaveSubmit = function () {
            $(this).removeClass('colorpicker_focus');
        };
        var clickSubmit = function () {
            var picker = $(this).parent();
            var config = picker.data('colorpicker');
            var color = config.color;
            config.origColor = color;
            setCurrentColor(color, picker.get(0));
            config.onSubmit(color, HSBToHex(color), HSBToRGB(color), config.el);
        };
        var show = function () {
            var picker = $('#'+$(this).data('colorpickerId'));
            picker.data('colorpicker').onBeforeShow.apply(this, [picker.get(0)]);
            var pos = $(this).offset();
            var viewPort = getViewport();
            var top = pos.top+this.offsetHeight;
            var left = pos.left;
            if (top+176>viewPort.t+viewPort.h) {
                top -= this.offsetHeight+176;
            }
            if (left+356>viewPort.l+viewPort.w) {
                left -= 356;
            }
            picker.css({left: left+'px', top: top+'px'});
            if (picker.data('colorpicker').onShow.apply(this, [picker.get(0)])!=false) {
                picker.show();
            }
            $(document).bind('mousedown', {picker: picker}, hide);
            return false;
        };
        var hide = function (ev) {
            if (!isChildOf(ev.data.picker.get(0), ev.target, ev.data.picker.get(0))) {
                if (ev.data.picker.data('colorpicker').onHide.apply(this, [ev.data.picker.get(0)])!=false) {
                    ev.data.picker.hide();
                }
                $(document).unbind('mousedown', hide);
            }
        };
        var isChildOf = function (parentEl, el, container) {
            if (parentEl==el) {
                return true;
            }
            if (parentEl.contains) {
                return parentEl.contains(el);
            }
            if (parentEl.compareDocumentPosition) {
                return !!(parentEl.compareDocumentPosition(el) & 16);
            }
            var prEl = el.parentNode;
            while (prEl && prEl!=container) {
                if (prEl==parentEl) {
                    return true;
                }
                prEl = prEl.parentNode;
            }
            return false;
        };
        var getViewport = function () {
            var m = document.compatMode=='CSS1Compat';
            return {
                l: window.pageXOffset || (m ? document.documentElement.scrollLeft : document.body.scrollLeft),
                t: window.pageYOffset || (m ? document.documentElement.scrollTop : document.body.scrollTop),
                w: window.innerWidth || (m ? document.documentElement.clientWidth : document.body.clientWidth),
                h: window.innerHeight || (m ? document.documentElement.clientHeight : document.body.clientHeight)
            };
        };
        var fixHSB = function (hsb) {
            return {
                h: Math.min(360, Math.max(0, hsb.h)),
                s: Math.min(100, Math.max(0, hsb.s)),
                b: Math.min(100, Math.max(0, hsb.b))
            };
        };
        var fixRGB = function (rgb) {
            return {
                r: Math.min(255, Math.max(0, rgb.r)),
                g: Math.min(255, Math.max(0, rgb.g)),
                b: Math.min(255, Math.max(0, rgb.b))
            };
        };
        var fixHex = function (hex) {
            var len = 6-hex.length;
            if (len>0) {
                var o = [];
                for (var i = 0; i<len; i++) {
                    o.push('0');
                }
                o.push(hex);
                hex = o.join('');
            }
            return hex;
        };
        var HexToRGB = function (hex) {
            var hex = parseInt(((hex.indexOf('#')>-1) ? hex.substring(1) : hex), 16);
            return {r: hex>>16, g: (hex & 0x00FF00)>>8, b: (hex & 0x0000FF)};
        };
        var HexToHSB = function (hex) {
            return RGBToHSB(HexToRGB(hex));
        };
        var RGBToHSB = function (rgb) {
            var hsb = {
                h: 0,
                s: 0,
                b: 0
            };
            var min = Math.min(rgb.r, rgb.g, rgb.b);
            var max = Math.max(rgb.r, rgb.g, rgb.b);
            var delta = max-min;
            hsb.b = max;
            if (max!=0) {

            }
            hsb.s = max!=0 ? 255*delta/max : 0;
            if (hsb.s!=0) {
                if (rgb.r==max) {
                    hsb.h = (rgb.g-rgb.b)/delta;
                } else if (rgb.g==max) {
                    hsb.h = 2+(rgb.b-rgb.r)/delta;
                } else {
                    hsb.h = 4+(rgb.r-rgb.g)/delta;
                }
            } else {
                hsb.h = -1;
            }
            hsb.h *= 60;
            if (hsb.h<0) {
                hsb.h += 360;
            }
            hsb.s *= 100/255;
            hsb.b *= 100/255;
            return hsb;
        };
        var HSBToRGB = function (hsb) {
            var rgb = {};
            var h = Math.round(hsb.h);
            var s = Math.round(hsb.s*255/100);
            var v = Math.round(hsb.b*255/100);
            if (s==0) {
                rgb.r = rgb.g = rgb.b = v;
            } else {
                var t1 = v;
                var t2 = (255-s)*v/255;
                var t3 = (t1-t2)*(h%60)/60;
                if (h==360) {
                    h = 0;
                }
                if (h<60) {
                    rgb.r = t1;
                    rgb.b = t2;
                    rgb.g = t2+t3
                } else if (h<120) {
                    rgb.g = t1;
                    rgb.b = t2;
                    rgb.r = t1-t3
                } else if (h<180) {
                    rgb.g = t1;
                    rgb.r = t2;
                    rgb.b = t2+t3
                } else if (h<240) {
                    rgb.b = t1;
                    rgb.r = t2;
                    rgb.g = t1-t3
                } else if (h<300) {
                    rgb.b = t1;
                    rgb.g = t2;
                    rgb.r = t2+t3
                } else if (h<360) {
                    rgb.r = t1;
                    rgb.g = t2;
                    rgb.b = t1-t3
                } else {
                    rgb.r = 0;
                    rgb.g = 0;
                    rgb.b = 0
                }
            }
            return {r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b)};
        };
        var RGBToHex = function (rgb) {
            var hex = [
                rgb.r.toString(16), rgb.g.toString(16), rgb.b.toString(16)
            ];
            $.each(hex, function (nr, val) {
                if (val.length==1) {
                    hex[nr] = '0'+val;
                }
            });
            return hex.join('');
        };
        var HSBToHex = function (hsb) {
            return RGBToHex(HSBToRGB(hsb));
        };
        var restoreOriginal = function () {
            var picker = $(this).parent();
            var color = picker.data('colorpicker').origColor;
            picker.data('colorpicker').color = color;
            const picker0 = picker.get(0);
            fillRGBFields(color, picker0);
            fillHexFields(color, picker0);
            fillHSBFields(color, picker0);
            setSelector(color, picker0);
            setHue(color, picker0);
            setNewColor(color, picker0);
        };
        return {
            init      : function (opt) {
                opt = $.extend({}, defaults, opt || {});
                if (typeof opt.color=='string') {
                    opt.color = HexToHSB(opt.color);
                } else if (opt.color.r!=undefined && opt.color.g!=undefined && opt.color.b!=undefined) {
                    opt.color = RGBToHSB(opt.color);
                } else if (opt.color.h!=undefined && opt.color.s!=undefined && opt.color.b!=undefined) {
                    opt.color = fixHSB(opt.color);
                } else {
                    return this;
                }
                return this.each(function () {
                    if (!$(this).data('colorpickerId')) {
                        var options = $.extend({}, opt);
                        options.origColor = opt.color;
                        var id = 'collorpicker_'+parseInt(Math.random()*1000);
                        $(this).data('colorpickerId', id);
                        var picker = $(tpl).attr('id', id);
                        if (options.flat) {
                            picker.appendTo(this).show();
                        } else {
                            picker.appendTo(document.body);
                        }
                        options.fields = picker.find('input').bind('keyup', keyDown).bind('change', change).bind('blur', blur).bind('focus', focus);
                        picker.find('span').bind('mousedown', downIncrement).end().find('>div.colorpicker_current_color').bind('click', restoreOriginal);
                        options.selector = picker.find('div.colorpicker_color').bind('mousedown', downSelector);
                        options.selectorIndic = options.selector.find('div div');
                        options.el = this;
                        options.hue = picker.find('div.colorpicker_hue div');
                        picker.find('div.colorpicker_hue').bind('mousedown', downHue);
                        options.newColor = picker.find('div.colorpicker_new_color');
                        options.currentColor = picker.find('div.colorpicker_current_color');
                        picker.data('colorpicker', options);
                        picker.find('div.colorpicker_submit').bind('mouseenter', enterSubmit).bind('mouseleave', leaveSubmit).bind('click', clickSubmit);

                        const picker0 = picker.get(0);
                        const color = options.color;
                        fillRGBFields(color, picker0);
                        fillHSBFields(color, picker0);
                        fillHexFields(color, picker0);
                        setHue(color, picker0);
                        setSelector(color, picker0);
                        setCurrentColor(color, picker0);
                        setNewColor(color, picker0);
                        if (options.flat) {
                            picker.css({
                                position: 'relative',
                                display : 'block'
                            });
                        } else {
                            $(this).bind(options.eventName, show);
                        }
                    }
                });
            },
            showPicker: function () {
                return this.each(function () {
                    if ($(this).data('colorpickerId')) {
                        show.apply(this);
                    }
                });
            },
            hidePicker: function () {
                return this.each(function () {
                    const id = $(this).data('colorpickerId');
                    if (id) {
                        $('#'+id).hide();
                    }
                });
            },
            setColor  : function (color) {
                if (typeof color=='string') {
                    color = HexToHSB(color);
                } else if (color.r!=undefined && color.g!=undefined && color.b!=undefined) {
                    color = RGBToHSB(color);
                } else if (color.h!=undefined && color.s!=undefined && color.b!=undefined) {
                    color = fixHSB(color);
                } else {
                    return this;
                }
                return this.each(function () {
                    const id = $(this).data('colorpickerId');
                    if (id) {
                        var picker = $('#'+id);
                        const config = picker.data('colorpicker');
                        config.color = color;
                        config.origColor = color;
                        const picker0 = picker.get(0);
                        fillRGBFields(color, picker0);
                        fillHSBFields(color, picker0);
                        fillHexFields(color, picker0);
                        setHue(color, picker0);
                        setSelector(color, picker0);
                        setCurrentColor(color, picker0);
                        setNewColor(color, picker0);
                    }
                });
            }
        };
    }();
    $.fn.extend({
        ColorPicker        : ColorPicker.init,
        ColorPickerHide    : ColorPicker.hidePicker,
        ColorPickerShow    : ColorPicker.showPicker,
        ColorPickerSetColor: ColorPicker.setColor
    });
})();
