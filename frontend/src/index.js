import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import store from './redux/store';
import Logger from './Logger';
import RoomClient from './RoomClient';
import randomString from 'random-string';
import RoomContext from './RoomContext';
import * as userAction from './redux/actions/userActions'

const logger = new Logger('index');
const peerId = randomString({ length: 8 }).toLowerCase();
const roomClient = new RoomClient(peerId);
store.dispatch(userAction.setuser({ peerId }));

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <RoomContext.Provider value={roomClient}>
        <App />
      </RoomContext.Provider>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
