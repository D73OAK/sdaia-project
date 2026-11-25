// App.jsx: the background, the app state provider and the hash routing (routes.js).
import Doodles from './components/Doodles.jsx';
import Button from './components/Button.jsx';
import HomeScreen from './features/courses/HomeScreen.jsx';
import ComponentsPage from './dev/ComponentsPage.jsx'; // TEMPORARY
import CourseEntryScreen from './features/courses/CourseEntryScreen.jsx';
import CourseListScreen from './features/courses/CourseListScreen.jsx';
import { APP_NAME, COMMON, NOT_BUILT } from './lib/strings.js';
import { ROUTES, go, useRoute } from './routes.js';
import { AppProvider } from './state.jsx';

// Screen 4 is not built yet; their addresses show this instead of a blank page.
function NotBuilt() {
  return (
    <section className="screen">
      <div className="topbar">
        <span />
        <span className="topbar__app">{APP_NAME}</span>
      </div>
      <p>{NOT_BUILT}</p>
      <Button variant="link" onClick={() => go(ROUTES.home)}>
        {COMMON.back}
      </Button>
    </section>
  );
}

function Screen({ path }) {
  switch (path) {
    case ROUTES.home:
      return <HomeScreen />;
    case ROUTES.courseNew:
      return <CourseEntryScreen />;
    case ROUTES.courses:
      return <CourseListScreen />;
    case ROUTES.components:
      return <ComponentsPage />;
    default:
      return <NotBuilt />;
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
