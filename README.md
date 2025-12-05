# Basketball Lineup Generator

A React application that generates optimal basketball rotation schedules based on player positions, playing time priorities, and various constraints.

## Features

- **Smart Rotation Algorithm**: Automatically generates balanced rotation schedules for 8 periods (two 20-minute halves with substitutions every 5 minutes)
- **Position Balance**: Ensures proper balance of guards and forwards on court
- **Flexible Constraints**: Optional starters, closers, bonus (prioritized), and rookie (inexperienced) player tags
- **Mobile-Friendly UI**: Responsive card-based player configuration and compact schedule view
- **Multiple Export Options**: Share image, download image, or copy as CSV
- **Preset Teams**: Load predefined rosters via query string (e.g., `?team=3b1`)
- **Real-time Validation**: Detailed validation summary (optional) with retry mechanism

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

## Usage

### Adding Players

- Start with an empty state or load a preset team using `?team=3b1` or `?team=4b5`
- Click "Add Player" to add new players
- Configure each player's name, position (Guard or Forward), and optional tags

### Player Tags

- **Start**: Player begins the game in the starting lineup
- **Finish**: Player closes out the game
- **Bonus**: When choosing between equally-rested players, bonus players get preference for additional playing time (only applies when time is not an even split)
- **Rookie**: Less experienced players. Algorithm prevents all rookies from being on court simultaneously

### Generating Rotations

1. Configure your players and their tags
2. Click "🏀 Generate" to create a rotation
3. Click multiple times to see different valid rotations
4. Use share/download buttons to export the lineup
5. Copy as CSV for importing into spreadsheets

## How It Works

The app uses a greedy algorithm that:

- Balances playing time evenly across all players (within 5 minutes)
- Factors in position eligibility (balanced guards and forwards on court)
- Prioritizes "Bonus" tagged players when opportunities for extra time arise
- Ensures at least one experienced player is always on court when rookies are tagged
- Dynamically relaxes constraints for small or imbalanced rosters (e.g., 6-7 players, or 5G/3F)

## Advanced Features

- **Validation Details**: Add `?validation=true` to the URL to see detailed validation summary
- **Preset Teams**: Use `?team=3b1` or `?team=4b5` to load predefined rosters
- **Mobile Optimized**: Compact table view with rotated headers and sticky player column

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## License

MIT License - see LICENSE file for details
