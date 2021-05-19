import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import './App.css';
import Room from './pages/Room/Room';
import LandingPage from './pages/LandingPage'
import Logger from './Logger';
import WhiteBoard from './components/WhiteBoardContainer/WhiteBoard';
import Modal from "./components/Modal"
import Trial from "./Trial/Trial"
import MainContainer from './components/videoContainer/MainContainer';
import BottomBar from "./components/BottomBar/BottomBar"
import { ThemeProvider } from "./Utils/ThemeContext";
import { PermissionProvider } from "./Utils/ThemeContext";

const logger = new Logger('App');

function App() {
  logger.log('count');
  return (
    <div className="App">
      <ThemeProvider>
      <BrowserRouter>
        <Switch>
          <Route path="/:name/:roomId" exact component={LandingPage} />
          <Route path="/modal" exact component={Modal} />
    <Route path="/trial" exact component={Trial}/>
          <Route path="/room" exact component={Room} />
          <Route path="/:name/:roomId/whiteboard" component={WhiteBoard} />
          {/* <Route path="/chat/:name/:room" component={Chat} /> */}
          {/* <Route path="/participants/:name/:room" component={Participants}/> */}

        </Switch>
      </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;
