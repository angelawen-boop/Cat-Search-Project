#!/usr/bin/env node
/*
 * venue_review.js — her venue review page, built from the register (docs/restructure.md, 4A).
 *
 *   node build/venue_review.js      writes build/dist/venue_review.html
 *
 * Every venue's card name, chip, full names, city and country, with a box for her name; what she types
 * is kept in that page's own store (`names/<id>`) and filed into the register at the next publish
 * (build/build_app.js). Run by build_app.js at every publish, so the list is never older than the code.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const REVIEW_PAGE = 'https://claude.ai/artifact/RmSC86pu1rkBxsZDtfdA1J';

function rows() {
  delete require.cache[require.resolve(path.join(ROOT, 'venues', 'register.js'))];
  const { VENUES } = require(path.join(ROOT, 'venues', 'register.js'));
  const chipOf = e => e.names.chip === true ? (VENUES.find(x => x.names.group === e.names.group && typeof x.names.chip === 'string') || {}).names.chip
    : e.names.chip || 'Occasional';
  return VENUES.filter(e => e.names.card && e.city !== undefined && (e.names.full || e.names.card) && e.country)
    .map(e => ({ id: e.id, card: e.names.card, chip: chipOf(e), original: e.names.full || e.names.card,
      english: e.names.inEnglish || e.names.full || e.names.card, city: e.city || (e.read.places || []).join(' / '), country: e.country }));
}

function build() {
  const t = fs.readFileSync(path.join(__dirname, 'venue_review_template.html'), 'utf8');
  const out = path.join(__dirname, 'dist', 'venue_review.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, t.replace('/*VENUES*/[]', JSON.stringify(rows())).replace('/*PICKS*/[]', '[]'));
  return out;
}

module.exports = { build, rows, REVIEW_PAGE };
if (require.main === module) console.log('venue review page: ' + path.relative(process.cwd(), build()) + ', ' + rows().length + ' venues.');
