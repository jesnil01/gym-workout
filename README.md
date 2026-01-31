# Gym Workout Tracker

A mobile-first workout tracking web application designed for use at the gym. The app works fully offline after the first load, storing all data locally using IndexedDB.

## Features

- **Offline-First**: Works completely offline after initial load
- **Mobile-Optimized**: Designed for one-handed use on mobile devices
- **Fast Logging**: Quick weight and completion tracking between sets
- **Session Tracking**: Three predefined workout sessions:
  - PASS A – Upper Body
  - PASS B – Legs + Back
  - SNABBPASS – Full Body
- **Auto-Save**: Automatically saves workout data as you log exercises
- **History**: Pre-fills weight inputs with last used values
- **Completion Status**: Track whether exercises were completed successfully

## Tech Stack

- **Frontend**: React 18 with functional components and hooks
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Storage**: IndexedDB (no backend required)
- **PWA**: Progressive Web App support for installability

## Project Structure

```
gym-workout/
├── public/
│   └── manifest.json          # PWA manifest
├── src/
│   ├── components/
│   │   ├── SessionList.jsx    # Session selection screen
│   │   ├── SessionView.jsx    # Main workout logging view
│   │   ├── ExerciseCard.jsx   # Individual exercise card
│   │   └── SupersetGroup.jsx  # Superset grouping component
│   ├── config/
│   │   └── sessions.js        # Hardcoded workout configuration
│   ├── db/
│   │   └── indexedDB.js       # IndexedDB setup and helper functions
│   ├── hooks/
│   │   └── useIndexedDB.js    # Custom hook for DB operations
│   ├── App.jsx                # Main app component with routing
│   ├── main.jsx               # React entry point
│   └── index.css              # Global styles with Tailwind
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Installation

1. **Clone the repository** (or navigate to the project directory)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to the URL shown in the terminal (typically `http://localhost:3000`)

## Usage

1. **Select a Session**: On startup, you'll see a list of three workout sessions. Tap on one to begin.

2. **Log Exercises**: 
   - Each exercise card shows the exercise name, sets × reps
   - Enter the weight used in the weight input field
   - Check the "Completed successfully" checkbox when done
   - The app automatically saves your entries

3. **View History**: 
   - Weight inputs are pre-filled with your last used weight
   - Last completion status is shown below the exercise name

4. **Navigate**: 
   - Use the "← Back" button in the session view to return to the session list
   - All data is saved automatically as you work

## Deployment

The app is automatically deployed to GitHub Pages on every push to the `main` branch.

**Live Site**: [https://jesnil01.github.io/gym-workout/](https://jesnil01.github.io/gym-workout/)

### Deployment Process

1. Push changes to the `main` branch
2. GitHub Actions automatically builds and deploys the app
3. The site is available at the URL above within a few minutes

### Manual Deployment

To manually deploy:

1. Build the project:
   ```bash
   npm run build
   ```

2. The built files will be in the `dist` directory

3. Preview the production build locally:
   ```bash
   npm run preview
   ```

### GitHub Pages Configuration

- **Source**: GitHub Actions (configured in `.github/workflows/deploy.yml`)
- **Base Path**: `/gym-workout/` (configured in `vite.config.ts`)
- **Build Output**: `dist/` directory

## Offline Support

The app is designed to work fully offline:

- All data is stored locally in IndexedDB
- No network requests are made after the initial load
- The app can be installed as a PWA on mobile devices
- Works in airplane mode after first load

## Database Schema

The app uses IndexedDB with two object stores:

### `exercises`
- `id` (string, primary key): Exercise identifier
- `name` (string): Exercise name

### `workoutLogs`
- `id` (auto-increment): Log entry ID
- `exerciseId` (string): Reference to exercise
- `weight` (number): Weight used
- `completed` (boolean): Completion status
- `timestamp` (number): Unix timestamp
- `sessionId` (string): Session identifier

## Customization

### Adding New Sessions

Edit `src/config/sessions.js` to add or modify workout sessions. The structure is:

```javascript
{
  id: "unique-id",
  name: "Session Name",
  supersets: [
    {
      rest: 90, // Rest time in seconds
      exercises: [
        { id: "exercise-id", name: "Exercise Name", sets: 5, reps: 5 }
      ]
    }
  ]
}
```

### Styling

The app uses Tailwind CSS. Modify `tailwind.config.js` or edit component classes to customize the appearance.

## Browser Support

- Modern browsers with IndexedDB support
- Mobile browsers (iOS Safari, Chrome, Firefox)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## License

Apache License 2.0

## Development

### Key Features Implementation

- **IndexedDB**: All database operations are handled in `src/db/indexedDB.js`
- **Auto-save**: Exercise cards automatically save to IndexedDB on change
- **State Management**: Uses React hooks for local state management
- **Routing**: Simple state-based routing (no React Router needed)

### Adding Features

To extend the app:

1. **New Database Operations**: Add functions to `src/db/indexedDB.js`
2. **New Components**: Add to `src/components/`
3. **New Hooks**: Add to `src/hooks/`
4. **Styling**: Modify Tailwind classes or add custom CSS

## Troubleshooting

- **Database errors**: Clear browser storage and reload
- **Styles not loading**: Ensure Tailwind is properly configured in `postcss.config.js`
- **Build errors**: Check Node.js version (requires Node 16+)
