//@ The import line and the version number shown in the footer.
//@piece import
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
//@piece APP_VERSION


// The footer prints APP_VERSION and its date, so she can tell one build from the next.
// Numbering, her decision: a whole number for a substantial change, a decimal for a
// small one, one number per publish. Bump it with the change it describes.
const APP_VERSION = "61";
//@piece APP_VERSION_DATE

// Not words: the date of this version.
const APP_VERSION_DATE = "28 Nov 2026";
