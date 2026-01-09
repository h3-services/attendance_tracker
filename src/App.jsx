import TrackerApp from './components/TrackerApp';
import './App.css';

import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <TrackerApp />
      </BrowserRouter>
    </div>
  );
}

export default App;
