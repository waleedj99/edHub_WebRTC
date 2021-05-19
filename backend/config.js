
const os = require('os');

module.exports = {
  // https server ip, port, and peer timeout constant
  https: {
    listenIp: '0.0.0.0',
    listenPort: process.env.PORT || 443,
    httpPeerStale: 15000,
    // ssl certs. we'll start as http instead of https if we don't have
    // these
    sslCrt: 'lib/cert1.pem',
    sslKey: 'lib/privkey1.pem',
  },

  //mediasoup settings
  mediasoup: {
    // Number of mediasoup workers to launch.
    numWorkers: Object.keys(os.cpus()).length - 8,
    workerSettings:
    {
      logLevel: 'warn',
      logTags:
        [
          'info',
          'ice',
          'dtls',
          'rtp',
          'srtp',
          'rtcp',
          'rtx',
          'bwe',
          'score',
          'simulcast',
          'svc',
          'sctp'
        ],
      rtcMinPort: process.env.MEDIASOUP_MIN_PORT || 40000,
      rtcMaxPort: process.env.MEDIASOUP_MAX_PORT || 49999
    },
    // mediasoup Router options.
    // See https://mediasoup.org/documentation/v3/mediasoup/api/#RouterOptions
    router:
    {
      mediaCodecs:
        [
          {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2
          },
          {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
            parameters:
            {
              'x-google-start-bitrate': 1000
            }
          },
          {
            kind: 'video',
            mimeType: 'video/VP9',
            clockRate: 90000,
            parameters:
            {
              'profile-id': 2,
              'x-google-start-bitrate': 1000
            }
          },
          {
            kind: 'video',
            mimeType: 'video/h264',
            clockRate: 90000,
            parameters:
            {
              'packetization-mode': 1,
              'profile-level-id': '4d0032',
              'level-asymmetry-allowed': 1,
              'x-google-start-bitrate': 1000
            }
          },
          {
            kind: 'video',
            mimeType: 'video/h264',
            clockRate: 90000,
            parameters:
            {
              'packetization-mode': 1,
              'profile-level-id': '42e01f',
              'level-asymmetry-allowed': 1,
              'x-google-start-bitrate': 1000
            }
          }
        ]
    },

    // mediasoup WebRtcTransport options for WebRTC endpoints (mediasoup-client,
    // libmediasoupclient).
    // See https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
    webRtcTransportOptions:
    {
      listenIps:
        [
          {
            ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
            announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP
          },
          //{ip:'172.31.3.224',announcedIp:'65.0.27.88'},
        ],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      // Additional options that are not part of WebRtcTransportOptions.
      maxIncomingBitrate: 1500000
    },

    // TODO: This portition will be deleted
    // rtp listenIps are the most important thing, below. you'll need
    // to set these appropriately for your network for the demo to
    // run anywhere but on localhost
    // webRtcTransport: {
    //   listenIps: [
    //     // { ip: '127.0.0.1', announcedIp: null },
    //     { ip: '192.168.43.248', announcedIp: null },
    //     //  {ip: '157.37.156.230', announcedIp:null},
    //     //{ip:'172.31.3.224',announcedIp:'65.0.27.88'},
    //   ],
    //   // enableUdp: true,
    //   // enableTcp: true,
    //   // preferUdp: true,
    //   initialAvailableOutgoingBitrate: 800000,
    // }
  }
};
