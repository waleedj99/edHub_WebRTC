export const canvasUrl = ({ canvasUrl, updateCanvasUrl,isUrlReady }) =>
({
    type: 'CANVAS_URL',
    payload: { canvasUrl, updateCanvasUrl,isUrlReady }
});

export const updateCanvasUrl = ({ updateCanvasUrl }) =>
({
    type: 'UPDATE_CANVAS_URL',
    payload: { updateCanvasUrl }
});


export const isUrlReady = ({ isUrlReady }) =>
({
    type: 'IS_URL_READY',
    payload: { isUrlReady }
});
