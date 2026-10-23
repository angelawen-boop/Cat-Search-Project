/**
 * BOT CHECKS — the titles bot checks put on their own pages, in place of the page asked for. A
 * check can arrive with a 200, so the status alone would read it as a page. One copy, for the
 * scraper (sweep_prototype.js) and Add by link (written into Cat_Watch.jsx by
 * build/sync_shared.js): a link that brings one stays unread, never a card.
 */
'use strict';
// "Making sure you're not a bot!" is Anubis's (the Staatsgalerie, through Parallel).
const CHALLENGE_TITLE = /^\s*(just a moment|attention required|performing security verification|access denied|pardon our interruption|one more step|making sure you['’]re not a bot)/i;
const BOT_CHECK_SAID = 'the venue’s site answered with a bot check instead of the page';
module.exports = { CHALLENGE_TITLE, BOT_CHECK_SAID };
