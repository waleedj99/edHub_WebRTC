import React, { useState } from 'react'
import { Carousel } from "react-responsive-carousel";
import styles from "react-responsive-carousel/lib/styles/carousel.min.css";
import Peer from '../Peer';
import { connect } from 'react-redux';
import Logger from '../../../Logger';

const logger = new Logger('GridCarousel');

const GridCarousel = (props) => {
  const { peers } = props;
  const peersList = Object.values(peers);

  return (
    <div style={{width:"100%",height:"90vh"}}>
      <Carousel >
        {(() => {
          let page = [];
          for (var i = 0; i < peersList.length; i += 9) {
            page.push(
              <div className="GC-main">
                {(() => {
                  let content = [];
                  for (var j = i; (j < (i + 9) && j < peersList.length); j++) {
                    content.push(
                      <div className="in1">{j}</div>
                    );
                  }
                  return content;
                })()}
              </div>
            );
          }
          return page;
        })()}
      </Carousel>
    </div>
  )
}

const mapStateToProps = (state) => {
  logger.log(`CCCCC`, state);
  return {
    peers: state.peers,
  }
};

export default connect(mapStateToProps)(GridCarousel);
