# The tests' restructure — audit and plan

Her ask: do for the tests what the restructure did for the app. Typed-out copies go, duplicate copies go, bundles that
don't belong together are split, and the lock is redesigned. Nothing is built until she says.

## The audit — what is wrong

1. **Typed-out copies of facts the app already holds.**
   - The venue order and the venue count, typed into the intake test and the Add-by-link test. Adding a venue breaks both.
   - Venue names, and her placement decisions ("Prado after Budapest", "Chantilly after Jacquemart"), typed into tests
     when the venue register already holds them.
   - A few on-screen sentences typed into tests instead of being read from the words list.
   - The list of test files, typed by hand into the runner. A new test runs only if someone remembers to add it there.
2. **The same machinery copied into each test.**
   - Starting the app in a fake browser is done separately in about 15 test files.
   - A fake Claude and a fake connector are written again in about 13 of them.
   - About 24 files have their own pass/fail helper.
   One shared copy of each was started (the harness, the fake store) and only a few tests use it.
3. **Bundles.** A handful of files hold most of the checks:
   - Add by link (about 300 checks): reading, dates, shops, venue order, chips.
   - Re-check shop (about 150): shop states, Levy, link venues, Berlin and more.
   - Catalogue route (about 175) and catalogue lookup (about 135).
   - The date reader (about 160) and compression (about 90).
   - Intake, which mixes intake rules with the venue order.
   The per-venue saved-page tests are already split properly, one venue each.
4. **The lock works on whole files.** Change one line and every check in that file has to be re-proven. Old tests are
   frozen by a fingerprint of the whole file. A session designed the lock and wrote it down as her decision; she never
   decided it.

## The plan — in this order

The order matters. Every later step touches test files, and today's lock would refuse each one. So the lock comes first.

1. **Redesign the lock: per check, not per file.** Each check carries its own fingerprint and proof. Changing one check
   re-proves that check alone, and untouched checks keep their standing. Old checks that have never been proven stay as
   they are until someone touches them. Moving a check to another file, without changing what it checks, keeps its
   standing. The new lock gets a planted-fault proof of its own.
2. **One shared kit.** One way to start the app for a test, one fake Claude and connector, one fake store, one pass/fail
   helper. Each test is moved onto the kit; its checks don't change.
3. **Kill the typed-out copies.**
   - Venue order, count and names are read from the venue register.
   - Her placement decisions are recorded once, as facts in the register, and tests read them from there.
   - Sentences come from the words list.
   - The runner finds test files by itself, from a one-line tag at the top of each file. No hand-typed list.
4. **Split the bundles by feature.** Each big file becomes several small ones, one per job (for Add by link: reading,
   dates, shop, venue order and chips). The checks themselves don't change.
5. **Clean up.** Delete the dead copies. Write the rules into `docs/testing.md`, with a code check that refuses a new
   typed-out venue list or count in a test, or a test that starts the app its own way.

**Each step is proved the same way:** on the same code, the old tests and the new tests give the same answer, check for
check, and every check that was changed catches a fault planted on purpose. One step at a time, each on its own branch,
merged once it passes. Her app is not touched, so there is no publish.

**The result:** a new venue touches no test, and a one-line change to a test re-proves one check.
