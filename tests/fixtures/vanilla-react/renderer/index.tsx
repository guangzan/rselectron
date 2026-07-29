import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

const root = document.querySelector('#root');
if (root === null) {
  throw new Error('#root missing');
}

createRoot(root).render(<App />);
