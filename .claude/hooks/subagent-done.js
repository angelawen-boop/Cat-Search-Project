#!/usr/bin/env node
// When a sub-agent stops, clear the "one is running" marker that confirm-subagent.js set.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

let p = {};
try { p = JSON.parse(fs.readFileSync(0, 'utf8')); } catch {}
try { fs.unlinkSync(path.join(os.tmpdir(), 'cw-subagent-' + String(p.session_id || 'none').replace(/[^\w-]/g, ''))); } catch {}
