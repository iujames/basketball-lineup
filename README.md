# Basketball Lineup Generator

A React application that generates optimal basketball rotation schedules based on player positions, target minutes, and various constraints.

## Features

- Automatically generates rotation schedules for 8 periods (40-minute game)
- Ensures proper position balance (guards and forwards)
- Respects starter and closer preferences
- Manages inexperienced player constraints
- Provides detailed substitution reports
- Exports to CSV for Google Sheets
- Validates playing time requirements

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

3. Open [http://localhost:3847](http://localhost:3847) to view it in your browser.

## How It Works

The app uses a greedy algorithm to assign players to 5-minute periods while satisfying:

- Position requirements (minimum 2 guards, 2 forwards per period)
- Target minutes for each player
- Starter and closer lineups
- Maximum 2 inexperienced players on court simultaneously
- Balanced playing time across both halves

## Customization

Edit the player list, positions, and constraints in `src/BasketballRotation.js`:

```javascript
const players = [
  { name: "Josh", position: "G", targetMinutes: 20 },
  // ... add your players
];

const starters = ["Josh", "Ethan", "Owen", "Grayson", "Leighton"];
const closers = ["Ethan", "Owen", "Andrew", "Grayson", "Leighton"];
const inexperienced = ["Jayden", "Easton", "Nolan"];
```

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.
