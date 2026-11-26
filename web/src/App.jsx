// App.jsx: the background, the app state provider and the hash routing (routes.js).
import Doodles from './components/Doodles.jsx';
import { ErrorMessage } from './components/Field.jsx';
import HomeScreen from './features/courses/HomeScreen.jsx';
import CourseEntryScreen from './features/courses/CourseEntryScreen.jsx';
import CourseListScreen from './features/courses/CourseListScreen.jsx';
import ScheduleScreen from './features/schedule/ScheduleScreen.jsx';
import { ROUTES, useRoute } from './routes.js';
import { SAVE_ERROR } from './lib/strings.js';
import { AppProvider, useApp } from './state.jsx';

function Screen({ path }) {
  const edit = /^\/course\/edit\/(.+)$/.exec(path); // screen 2 in edit mode: #/course/edit/<id>
  if (edit) return <CourseEntryScreen courseId={decodeURIComponent(edit[1])} />;
  switch (path) {
    case ROUTES.courseNew:
      return <CourseEntryScreen />;
    case ROUTES.courses:
      return <CourseListScreen />;
    case ROUTES.schedule:
      return <ScheduleScreen />;
    default: // '/' and any unknown address
      return <HomeScreen />;
  }
}

// Shown at the top of every screen while saving in the browser fails (HANDOFF.md §8).
function SaveError() {
  const { saveFailed } = useApp();
  if (!saveFailed) return null;
  return (
    <div className="save-error">
      <ErrorMessage id="save-error">{SAVE_ERROR}</ErrorMessage>
    </div>
  );
}

export default function App() {
  const path = useRoute();
  return (
    <AppProvider>
      <Doodles />
      <main className="page">
        <SaveError />
        {/* key = path: a new screen mounts fresh, so its entry motion plays. */}
        <Screen key={path} path={path} />
      </main>
    </AppProvider>
  );
}
