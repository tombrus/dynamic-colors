/*!
 * jQuery Cookie Plugin
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2011, Klaus Hartl
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */
(function ($) {
    $.cookie = function (key, value, options) {

        // key and at least value given, set cookie...
        if (arguments.length > 1 && (!/Object/.test(Object.prototype.toString.call(value)) || value === null || value === undefined)) {
            options = $.extend({raw:false, path:null, secure:false, domain:null, expires:null}, options);

            if (value === null || value === undefined) {
                options.expires = -1;
            }
            if (typeof options.expires === 'number') {
                var d = new Date();
                d.setDate(d.getDate() + options.expires);
                options.expires = d;
            }
            value = String(value);
            value = options.raw ? value : encodeURIComponent(value);
            document.cookie = [
                encodeURIComponent(key), '=', value,
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path ? '; path=' + options.path : '',
                options.domain ? '; domain=' + options.domain : '',
                options.secure ? '; secure' : ''
            ].join('');
            return document.cookie;
        } else {
            // key and possibly options given, get cookie...
            options = value || {};
            var decode = options.raw ? function (s) {
                return s;
            } : decodeURIComponent;

            var result = null;
            $.each(document.cookie.split('; '), function (i, pair) {
                pair = pair.split("=");
                if (decode(pair[0]) === key) {
                    // IE saves cookies with empty string as "c; ", e.g. without "=" as opposed to EOMB, thus pair[1] may be undefined
                    result = decode(pair[1] || '');
                    return false;
                }
            });
            return result;
        }
    };
})(jQuery);
