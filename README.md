# edhub-WebRTC

/backend for backend server code
/frontend for react frontend code


## Installation

* Clone the project: (checkout to develop branch for development code)

```bash
$ git clone https://github.com/starwispindustries/V-WebRTC.git
$ cd V-WebRTC
$ git checkout develop
```


* Set up the edhub-WebRTC server:

```bash
$ cd backend
$ npm install
```

* Customize `config.js` for your scenario:

```bash
$ nano config.js
```

**NOTE:** To be perfectly clear, "customize it for your scenario" is not something "optional". If you don't set proper values in `config.js` the application **won't work**.

* Set up the edhub-WebRTC browser app:

```bash
$ cd frontend
$ npm install
```


## Run it locally

* Run the Node.js server application in a terminal: (use DEBUG=vmeet* for debugging)

```bash
$ cd backend
$ npm start
```

* In a different terminal build and run the browser application:

```bash
$ cd frontend
$ npm start
```

* Enjoy.
