dynamic-colors
==============

JQuery extension to dynamically adjust colors on a page (see index.html):

  - define what colors are changeable in your css:
          #DynamicColors_background {color : #ffefd5;}
  - use it anywhere in your css:
          body {background-color : #ffefd5;}
  - init DynamicColors and pass in a div for the color controls:
          $(function () {$.DynamicColors($("#my-colorpanel"));});
  - the color controls div will contain a list of color-pickers that
    allow you to dynamically adjust the colors on the page
  - changed colors are saved in a cookie, so they re-appear
  - you can copy the color settings from a text field to tell someone
    else to rate or enjoy it

Can be helpful while developing a proper color scheme (or schemes).
You can also empower your users to tweak some colors to their liking.

todo
----
  - make color controls foldeable/floating
  - show tooltip with color when hovering color pickers
  - format signature as css so that it is pasteable over the initial css

license
-------
   - Dual licensed under the MIT and GPL licenses.

legal
-----
   - color-picker is an adjusted version from http://www.eyecon.ro/colorpicker/
   - jquery-cookie is taken from https://github.com/carhartl/jquery-cookie
