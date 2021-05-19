import React from 'react';

const RoomContext = React.createContext();

export default RoomContext;

export function withRoomContext(Component) {
	return React.forwardRef((props, ref) => ( // eslint-disable-line react/display-name
		<RoomContext.Consumer>
			{(roomClient) => <Component ref={ref} {...props} roomClient={roomClient} />}
		</RoomContext.Consumer>
	));
}
