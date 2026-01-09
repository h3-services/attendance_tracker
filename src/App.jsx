import TrackerApp from './components/TrackerApp';
import './App.css';

import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <BrowserRouter basename="/attendance_tracker">
        <TrackerApp />
      </BrowserRouter>
    </div>
  );
}

export default App;
