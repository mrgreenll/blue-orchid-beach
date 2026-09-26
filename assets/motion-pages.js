/* Blue Orchid Beach — inner page set-pieces (rooms, gallery, booking).
   Registers with motion.js; does nothing without it. */
(function () {
  'use strict';
  var BOB = window.BOB;
  if (!BOB || !BOB.page) return;

  BOB.page('rooms', function (M) { void M; });
  BOB.page('gallery', function (M) { void M; });
  BOB.page('booking', function (M) { void M; });
})();
