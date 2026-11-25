// routes.js: the tiny hash router (no library). The address after # picks the screen: #/, #/courses ...
// Hash addresses work on any static host (Vercel) without server rewrites.
import { useEffect, useState } from 'react';

export const ROUTES = {
  home: '/',
  courseNew: '/course/new', // screen 2
  courseEdit: (id) => `/course/edit/${id}`, // screen 2 in edit mode
  courses: '/courses', // screen 3
  schedule: '/schedule', // screen 4
};

const read = () => window.location.hash.replace(/^#/, '') || '/';

export function useRoute() {
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setPath(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

export function go(path) {
  window.location.hash = path;
}
