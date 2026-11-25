// App.jsx: the background, the app state provider and the hash routing (routes.js).
import Doodles from './components/Doodles.jsx';
import HomeScreen from './features/courses/HomeScreen.jsx';
import CourseEntryScreen from './features/courses/CourseEntryScreen.jsx';
import CourseListScreen from './features/courses/CourseListScreen.jsx';
import ScheduleScreen from './features/schedule/ScheduleScreen.jsx';
import ComponentsPage from './dev/ComponentsPage.jsx'; // TEMPORARY
import { ROUTES, useRoute } from './routes.js';
import { AppProvider } from './state.jsx';

function Screen({ path }) {
  switch (path) {
    case ROUTES.courseNew:
      return <CourseEntryScreen />;
    case ROUTES.courses:
      return <CourseListScreen />;
    case ROUTES.schedule:
      return <ScheduleScreen />;
    case ROUTES.components:
      return <ComponentsPage />;
    default: // '/' and any unknown address
      return <HomeScreen />;
  }
}

export default function App() {
  const path = useRoute();
  return (
    <AppProvider>
      <Doodles />
      <main className="page">
        {/* key = path: a new screen mounts fresh, so its entry motion plays. */}
        <Screen key={path} path={path} />
      </main>
    </AppProvider>
  );
}
