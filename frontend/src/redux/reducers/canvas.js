const initialState = {
    canvasUrl: null,
    updateCanvasUrl: false,
    isUrlReady: false,
};

const peers = (state = initialState, action) => {
    switch (action.type) {
        case 'CANVAS_URL': {
            const { canvasUrl, updateCanvasUrl,isUrlReady } = action.payload;
            return {
                ...state,
                canvasUrl,
                updateCanvasUrl,
                isUrlReady,
            };
        }
        case 'UPDATE_CANVAS_URL': {
            const { updateCanvasUrl } = action.payload;
            return {
                ...state,
                updateCanvasUrl,
            };
        }
        case 'IS_URL_READY':{
            const { isUrlReady } = action.payload;
            return {
                ...state,
                isUrlReady,
            };
        }
        default:
            return state;
    }
}

export default peers;
