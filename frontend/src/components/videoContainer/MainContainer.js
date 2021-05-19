import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import User from './User';
import { connect } from 'react-redux';
import Logger from '../../Logger';
import Peer from './Peer';
import { Carousel } from "react-responsive-carousel";
import "./Styles.css"

const logger = new Logger('MainContainer');


function MainContainer(props) {
    const [number, setNumber] = useState(1);
    const [stylename, setStylename] = useState("");
    const [vidti, setVidti] = useState(""); {/* This state is used for setting font and icon size of video container */ }
    const [noVideo, setNoVideo] = useState("");
    const [vc, setVc] = useState("Video-Container")
    const [height, setHeight] = useState("");
    const [width, setWidth] = useState("");

    const { peers } = props;
    const peerList = [{}];
    const peersList = peerList.concat(Object.values(peers));
    logger.log('peerList', peerList);
    logger.log(peers);
    logger.log('count');

    useEffect(() => {
        setNumber(Object.values(peers).length);
        if (number == 0) {
            setStylename("onevid");
            setHeight("600px");
            setWidth("1000px");
            setNoVideo("novideo");
            setVidti("Vidti1")
        }
        if (number > 0 && number < 3) {
            setStylename("twovid");
            setHeight("281px");
            setWidth("468px");
            setNoVideo("novideo1");
            setVidti("Vidti2")

        }
        if (number > 3 && number < 6) {
            setStylename("fivevid");

            setHeight("177px");
            setWidth("296px");

            setNoVideo("novideo5");
            setVidti("Vidti3")



        }
        if (number > 5 && number < 8) {
            setStylename("ninevid");
            setVidti("Vidti4");

            setHeight("177px");
            setWidth("296px");

        }



    });


    return (<div className={vc}>{/* The user will always be the first one to show and i think we need to change that  */}

        <Carousel >
            {(() => {
                let page = [];
                for (var i = 0; i < peersList.length; i += 9) {
                    page.push(
                        <div className="GC-main">
                            {(() => {
                                let content = [];
                                for (var j = i; (j < (i + 9) && j < peersList.length); j++) {
                                    if (i == 0 && j == 0) {
                                        content.push(
                                            <User stylename={stylename} novideo={noVideo} vidti={vidti} />
                                        );
                                        continue;
                                    }
                                    content.push(
                                        <Peer key={peersList[j].id}
                                            peer={peersList[j]}
                                            stylename={stylename}
                                            novideo={noVideo} vidti={vidti} />
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

MainContainer.propTypes = {

}

const mapStateToProps = (state) => {
    logger.log(`CCCCC`, state);
    return {
        peers: state.peers,
    }
};

export default connect(mapStateToProps)(MainContainer);