import React from 'react'
import "./Grid.css"
import { ReactComponent as Listicon } from "../../../Assets/Icons/list.svg"
import { ReactComponent as Gridicon } from "../../../Assets/Icons/grid.svg"
import Logger from '../../../Logger';
import { connect } from 'react-redux';
import Peer from '../Peer';


const logger = new Logger('GridView');
const  hi=()=>{
    console.log("hi")
}
const GridView = (props) => {
    const { peers } = props;
    return (
        <div className="gv-main">
            <h2>Participants</h2>
            <div className="gv-r1">
                <div className="gvr1-1">
                    <p onClick={props.GridOff}> <Listicon style={{ marginRight: "10px" }}  />List View</p>
                    <p><Gridicon style={{ marginRight: "10px" }} /> Grid View</p>
                </div>
                <div className="gvr1-2">
                    <p>Close</p>
                </div>

            </div>
            <div className="gv-wrap">
            {
          

          Object.values(peers).map((peer) => {
                      return ( <Peer key = { peer.id }
                          peer = { peer }
                          stylename="ninevid" 
                          novideo="novideo5" vidti="Vidti4"/>
                      
                      );
                  })
      
              }          
      
            </div>
        </div>
    )
}


const mapStateToProps = (state) => {
    logger.log(`CCCCC`, state);
    return {
        peers: state.peers,
    }
};


export default connect(mapStateToProps)(GridView);

