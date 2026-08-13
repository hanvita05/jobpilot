# JobPilot Quick-Add extension

The honest answer to "auto-import from LinkedIn/Indeed/Handshake": those sites
have no public jobs API and their ToS forbid scraping. This one-click extension
is the compliant alternative — you're on the page anyway, so it grabs the
company/title/URL and files it into your tracker.

## Install (Chrome/Edge)
1. Run JobPilot locally (`npm run dev`, serving on http://localhost:3000).
2. Go to chrome://extensions, enable Developer Mode.
3. "Load unpacked" → select this `extension/` folder.
4. On any job posting, click the JobPilot icon → confirm → Add.
