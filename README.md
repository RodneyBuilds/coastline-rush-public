# Coastline Rush

A browser arcade driving game with branching coastal routes, traffic, and drifting.

## Play

Requires Node.js 20.19 or newer within 20.x, or Node.js 22.12 or newer, and a browser with WebGL 2.

```sh
npm ci
npm run build
npm run preview
```

Open the local address printed in the terminal.
For development, use `npm run dev`.

## Controls

Press Enter or controller A to open the garage.
The garage lists steering, acceleration, braking, and drift controls.
Press P or Escape to pause, F8 to save a photo, and F9 to save a diagnostic report.
Sound, graphics, and controller settings are available in the garage and pause menu.
Start with Auto graphics and a 60 FPS limit.

## Mobile trial

Touch devices use landscape orientation, automatic acceleration, floating thumb steering, and a broad brake/drift touch area.
Touch anywhere in the lower-left area and slide left or right to steer; each new touch sets the centre.
Hold anywhere in the lower-right area to brake or drift while steering.
The mobile garage has separate ride, music, and settings tabs with the Drive button always available.
Balanced graphics and a 30 FPS limit are the mobile defaults; these settings are separate from desktop preferences.
Rotation to portrait or leaving the game pauses driving until Resume is tapped.
Real-device Safari performance and audio interruption testing are still pending.
For a local Wi-Fi trial, run `npm run preview -- --host 0.0.0.0` on a trusted network and open the computer's local IP address with the printed port on the phone.
Stop the server with Ctrl+C after testing; do not configure port forwarding.

## Features

Four route combinations, timed races, untimed Free Drive, and an optional driving lesson.
Three original vehicles: Trail Mini, Coast Crossover, and Sunset GT.
Drift scoring, traffic with lane-change signals, music, and voiced feedback.
Settings and records are saved in the browser.

## Tests

Run `npm test` after building.
Browser checks require Playwright Chromium: `npx playwright install chromium`.

## Credits and license

See [CREDITS.md](CREDITS.md) for asset sources and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for third-party terms.
An open-source license for the original game code has not been selected.
Third-party licenses apply only to their respective components.
