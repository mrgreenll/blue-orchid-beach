/* Blue Orchid Beach — home page set-pieces (hero frame, the vibe, chapters, stats, cards,
   kinetic strip, mist, dusk glow). Registers with motion.js; does nothing without it. */
(function () {
  'use strict';
  var BOB = window.BOB;
  if (!BOB || !BOB.page) return;

  BOB.page('home', function (M) {
    void M;
  });
})();
