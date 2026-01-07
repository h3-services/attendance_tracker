import TrackerApp from './components/TrackerApp';
import './App.css';

import { HashRouter } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <HashRouter>
        <TrackerApp />
      </HashRouter>
    </div>
  );
}

export default App;
