// state.jsx: the app's data in one place (React useReducer + one Context), saved in the browser.
// On start it reads what was saved (lib/storage.js); after every change it saves again.
// Screens read it with useApp() and change it only by sending an action: dispatch({ type: '...' }).
import { createContext, useContext, useEffect, useReducer } from 'react';
import { clearData, emptyData, loadData, saveData } from './lib/storage.js';
import { canAddCourse } from './features/courses/courses.js';

// The actions (HANDOFF.md §6). More are added as the screens are built.
// lastAddedId marks the course just saved, for the mint ✓ on the course list. It is not saved in the browser.
export function reducer(state, action) {
  switch (action.type) {
    case 'loadDemo': // «أو جرّب ببيانات تجريبية»: replaces everything with the sample courses
      return { ...emptyData(), courses: action.courses };
    case 'addCourse': // «احفظ المادة». Never more than 6 courses (HANDOFF.md §7 rule 4).
      if (!canAddCourse(state.courses)) return state;
      // A new course changes what the schedule needs, so the old plan is dropped.
      return { ...state, courses: [...state.courses, action.course], plan: null, lastAddedId: action.course.id };
    case 'restart': // «ابدأ من جديد», after the student confirms
      return emptyData();
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadData());

  useEffect(() => {
    // An empty app keeps nothing in the browser; otherwise save the latest data.
    if (!state.courses.length && !state.preferences && !state.plan) clearData();
    else saveData(state);
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp() must be used inside <AppProvider>');
  return value;
}
