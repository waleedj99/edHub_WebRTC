import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import Logger from '../../Logger';
import { withRoomContext } from '../../RoomContext';
import { signalingSocket } from '../../SocketClient';
import store from '../../redux/store';
import * as canvasAction from '../../redux/actions/canvasAction';
import { SHAPES } from '../../Utils/Constants';


const logger = new Logger('Canvas');

function midPointBtw(p1, p2) {
    return {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2
    };
}


const canvasTypes = [
    {
        name: "interface",
        zIndex: 15
    },
    {
        name: "drawing",
        zIndex: 12
    },
    {
        name: "temp",
        zIndex: 13
    },
    {
        name: 'lazer',
        zIndex: 14
    },
    {
        name: "grid",
        zIndex: 10
    }
];

const canvasStyle = {
    display: "block",
    position: "absolute"
};

export class Canvas extends Component {
    constructor(props) {
        super(props);

        this.points = [];
        this.undoActions = [];
        this.redoActions = [];
        this.redoLines = [];
        this.actions = [];
        this.mode = props.mode;
        this.shapeParams = null;
        this.cirlceParams = null;
        this.straightLineParams = null;
        this.rectangleParams = null;

        this.state = {
            canvasWidth: props.canvasWidth,
            canvasHeight: props.canvasHeight,
            canvas: {},
            ctx: {},
            scale: {
                scaleX: 1,
                scaleY: 1,
                scaleAvg: 1
            },
            fontSize: props.fontSize || 20,
        }

        this.corrdinate = { x: 0, y: 0 };


        this.isDrawing = false;
        this.isPressing = false;
        this.isTexting = false;

        this.socket = signalingSocket;
        this.lazerTimer = null;
        this.fadeTimer = null;
    }

    handleResize = () => {
        const canvas = document.getElementById("canvas");
        const height = canvas.clientHeight;
        const width = canvas.clientWidth;
        this.handleCanvasResize(width, height);
    }

    handlePreventRightClick = (e) => {
        e.preventDefault();
    }

    componentDidMount() {
        window.addEventListener('contextmenu', this.handlePreventRightClick);
        this.handleResize();
        window.addEventListener('resize', this.handleResize)


        this.drawGrid(this.state.ctx.grid);

        // logger.log('cdm', this.state.canvas, this.state.ctx);
        signalingSocket.on('canvas', async (canvas) => {
            logger.log(canvas.method);
            try {
                switch (canvas.method) {
                    case 'canvasHistory': {
                        const { peerId, canvasHistory } = canvas.data;
                        // const oldActions = canvasHistory;
                        logger.log('CDM canvasHistory 1', canvasHistory);

                        const newCanvasHistory = {
                            actions: [],
                            undoActions: [],
                            redoActions: [],
                        };
                        // logger.log('CDM', this.state);
                        // const newActions = [];
                        // oldActions.forEach((action) => {
                        //     newActions.push(JSON.parse(action));
                        // })
                        canvasHistory.actions.map((action) => {newCanvasHistory.actions.push(JSON.parse(action))});
                        canvasHistory.undoActions.map((action) => {newCanvasHistory.undoActions.push(JSON.parse(action))});
                        canvasHistory.redoActions.map((action) => {newCanvasHistory.redoActions.push(JSON.parse(action))});

                        logger.log('CDM canvasHistory 2', newCanvasHistory);
                        // logger.log('CDM', newActions);
                        this.undoActions = newCanvasHistory.undoActions;
                        this.redoActions = newCanvasHistory.redoActions;
                        this.redraw({ actions: [...newCanvasHistory.actions], newActions: false });
                        break;
                    }
                    case 'drawPoint': {
                        // logger.log('Mohit',canvas.data);
                        const { peerId, drawPoint } = canvas.data;
                        this.drawPoints(drawPoint);
                        break;
                    }
                    case 'drawLazer': {
                        logger.log('drawLazer', canvas.data);
                        const { peerId, points } = canvas.data;
                        this.drawLazer({ points });
                        break;
                    }
                    case 'lazerEnd': {
                        // logger.log('Mohit',canvas.data);
                        // const { peerId, drawPoint } = canvas.data;
                        const width = this.state.canvas.temp.width;
                        const height = this.state.canvas.temp.height;
                        this.state.ctx.lazer.drawImage(this.state.canvas.temp, 0, 0, width, height);
                        this.state.ctx.temp.clearRect(0, 0, width, height);
                        this.startLazerTimeout();
                        break;
                    }
                    case 'eraserPoint': {
                        // logger.log('Mohit',canvas.data);
                        const { peerId, eraserPoint } = canvas.data;
                        this.unDrawPoints(eraserPoint);
                        break;
                    }
                    case 'saveLine': {
                        const { peerId, line } = canvas.data;
                        // logger.log('YOYOYOYO', JSON.parse(line));
                        const { points, brushColor, brushRadius } = JSON.parse(line);
                        this.redoLines = [];
                        this.saveLine({ points, brushColor, brushRadius, emit: false });
                        break;
                    }
                    case 'saveAction': {
                        const { peerId } = canvas.data;
                        const action = JSON.parse(canvas.data.action);
                        logger.log('YOYOYO', action, Object.values(SHAPES));
                        logger.log('YOYO', Object.values(SHAPES).includes(action.type));
                        this.redoLines = [];
                        if (action.type === 'text') {
                            this.drawText({ data: action.data });
                        }
                        else if (Object.values(SHAPES).includes(action.type)) {
                            this.drawShape({ start: action.data.start, end: action.data.end, shape: action.type, brushColor: action.data.brushColor });
                        }
                        this.saveAction({ action, emit: false });
                        break;
                    }
                    case 'deleteLine': {
                        const { peerId, index } = canvas.data;
                        this.deleteFoundLine({ index, emit: false, data: this.actions[index].data });
                        // this.deleteLine({ index }, false);
                        break;
                    }
                    case 'deleteAction': {
                        const { index } = canvas.data;
                        this.deleteAction({ index }, false);
                        break;
                    }
                    case 'clearScreen': {
                        logger.log(canvas.data);
                        this.clear({ emit: false });
                        break;
                    }
                    case 'undoScreen': {
                        logger.log(canvas.data);
                        this.undo(false);
                        break;
                    }
                    case 'redoScreen': {
                        logger.log(canvas.data);
                        this.redo(false);
                        break;
                    }
                    default:
                        break;
                }
            } catch (error) {
                logger.error('error on socket "canvas" event [error:"%o"]', error);
            }
        });

        this.props.roomClient.getCanvasHistory();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('contextmenu', this.handlePreventRightClick);
    }

    componentDidUpdate(prevProps) {

        // this.handleCanvasResize(document.getElementById("canvas").clientWidth,document.getElementById("canvas").clientHeight)
        logger.log('CDU', this.state);
        // logger.log(prevProps, this.props);
        // if (this.props.mode === 'text') {
        //     logger.log('HEHE');
        //     this.isTexting = false;
        // }
        this.drawGrid(this.state.ctx.grid);
        this.mode = this.props.mode;
        if (this.props.updateCanvasUrl === true) {
            this.getCanvasBlob();
        }
    }

    render() {
        const { canvasHeight, canvasWidth } = this.state;
        logger.log('Render', this.state);
        return (
            <div style={{
                border: '2px solid',
                display: "block", position: 'absolute'
            }}
                className="wb-canvasboard" >
                {canvasTypes.map(({ name, zIndex }) => {
                    const isInterface = name === "interface";
                    return (
                        <canvas
                            key={name}
                            ref={canvas => {
                                if (canvas) {
                                    this.state.canvas[name] = canvas;
                                    this.state.ctx[name] = canvas.getContext("2d");
                                }
                            }}
                            id="canvas"
                            style={{ ...canvasStyle, zIndex, height: '100%', width: '100%' }}
                            width={canvasWidth}
                            height={canvasHeight}

                            onClick={isInterface ? this.handleOnClick : undefined}

                            onMouseDown={isInterface ? this.handleDrawStart : undefined}
                            onMouseMove={isInterface ? this.handleDrawMove : undefined}
                            onMouseUp={isInterface ? this.handleDrawEnd : undefined}
                            onMouseOut={isInterface ? this.handleDrawEnd : undefined}

                            onTouchStart={isInterface ? this.handleDrawStart : undefined}
                            onTouchMove={isInterface ? this.handleDrawMove : undefined}
                            onTouchEnd={isInterface ? this.handleDrawEnd : undefined}
                            onTouchCancel={isInterface ? this.handleDrawEnd : undefined}
                        />
                    );
                })}
            </div>
        )
    }

    handleDrawStart = (e) => {
        e.preventDefault();

        const { x, y } = this.getPointerPos(e);

        if (e.touches && e.touches.length > 0) {
            // on touch, set catenary position to touch pos
            this.corrdinate = { x, y };
        }

        // Start drawing
        this.isPressing = true;

        switch (this.mode) {
            case 'pen': {
                // Ensure the initial down position gets added to our line
                this.handlePointerMove(x, y);
                break;
            }
            case 'eraser': {
                this.handleEraser(x, y);
                break;
            }
            case 'elementEraser': {
                this.handleElementEraser(x, y);
                break;
            }
            case 'lazer': {
                this.handlePointerMove(x, y);
                break;
            }
            case SHAPES.ROUNDED_RECTANGLE:
            case SHAPES.CIRCLE:
            case SHAPES.RECTANGLE:
            case SHAPES.LINE:
            case SHAPES.ARROW:
            case SHAPES.TRIANGLE: {
                this.handleShape(x, y, this.mode);
                break;
            }
            // case 'select': {
            //     this.selectElement({ x, y });
            //     break;
            // }
            default:
                break;
        }
    };

    handleDrawMove = (e) => {
        e.preventDefault();

        const { x, y } = this.getPointerPos(e);

        switch (this.mode) {
            case 'pen': {
                this.handlePointerMove(x, y);
                break;
            }
            case 'eraser': {
                this.handleEraser(x, y);
                break;
            }
            case 'elementEraser': {
                this.handleElementEraser(x, y);
                break;
            }
            case 'lazer': {
                this.handlePointerMove(x, y);
                break;
            }
            case SHAPES.ROUNDED_RECTANGLE:
            case SHAPES.CIRCLE:
            case SHAPES.RECTANGLE:
            case SHAPES.LINE:
            case SHAPES.ARROW:
            case SHAPES.TRIANGLE: {
                this.handleShape(x, y, this.mode);
                break;
            }
            // case 'select': {
            //     this.selectElement({ x, y });
            //     break;
            // }
            default:
                break;
        }
    };

    handleDrawEnd = (e) => {
        e.preventDefault();

        this.isPressing = false;

        switch (this.mode) {
            case 'pen': {
                if (this.isDrawing) {
                    const data = {
                        points: [...this.points],
                        brushColor: this.props.brushColor,
                        brushRadius: this.props.brushRadius,
                        width: this.state.canvasWidth,
                        height: this.state.canvasHeight,
                    }
                    this.saveAction({ action: { type: 'pen', data }, emit: true });
                }
                // Stop drawing & save the drawn line
                this.isDrawing = false;
                break;
            }
            case 'eraser': {
                if (this.isDrawing) {
                    const data = {
                        points: [...this.points],
                        eraserSize: this.props.eraserSize,
                        width: this.state.canvasWidth,
                        height: this.state.canvasHeight,
                    }
                    this.saveAction({ action: { type: 'eraser', data }, emit: true });
                }
                // Stop drawing & save the drawn line
                this.isDrawing = false;
                break;
            }
            case 'elementEraser': {
                break;
            }
            case 'lazer': {
                if (this.isDrawing) {
                    const width = this.state.canvas.temp.width;
                    const height = this.state.canvas.temp.height;
                    this.state.ctx.lazer.drawImage(this.state.canvas.temp, 0, 0, width, height);
                    this.state.ctx.temp.clearRect(0, 0, width, height);
                    this.points = [];
                    this.props.roomClient.sendCanvasData('lazerEnd', {});
                    this.startLazerTimeout();
                    // const data = {
                    //     points: [...this.points],
                    //     eraserSize: this.props.eraserSize,
                    //     width: this.state.canvasWidth,
                    //     height: this.state.canvasHeight,
                    // }
                    // this.saveAction({ action: { type: 'eraser', data }, emit: true });
                }
                // Stop drawing & save the drawn line
                this.isDrawing = false;
                break;
            }
            case SHAPES.ROUNDED_RECTANGLE:
            case SHAPES.CIRCLE:
            case SHAPES.RECTANGLE:
            case SHAPES.LINE:
            case SHAPES.ARROW:
            case SHAPES.TRIANGLE: {
                this.handleShapeEnd(this.mode);
                break;
            }
            default:
                break;
        }
    };

    checkPointForRect = (left, top, right, bottom, x, y) => {
        logger.log(x, left, right, y, top, bottom);
        if (x > left && x < right && y > top - 10 && y < bottom) {
            return true;
        }
        return false;
    }

    selectElement = ({ x, y }) => {
        // logger.log('before find line', this.actions, JSON.stringify(this.actions));
        const actions = this.actions;
        // logger.log(x, y);
        logger.log(actions);
        if (actions.length < 1) return;
        for (let i = 0, actionslen = actions.length; i < actionslen; i++) {
            const { type, data } = actions[i];
            // logger.log('Action number', i, type, data);
            if (type === 'text') {
                // const { x, y, bottom, right } = data;
                // logger.log('Text action data', data);
                if (this.checkPointForRect(data.x, data.y, data.right, data.bottom, x, y) === true) {

                    this.deleteAction({ index: i });

                    this.handleText({ text: data.val, x: data.x, y: data.y, maxWidth: data.right - x, focus: false });

                    return;
                }
            }
        }
    }

    // editText = () => {

    // }

    handleOnClick = (e) => {
        e.preventDefault();
        logger.log(this.mode);
        const { x, y } = this.getPointerPos(e);
        logger.log(x, y);
        switch (this.mode) {
            case 'text': {
                // Ensure the initial down position gets added to our line
                this.handleText({ text: this.props.text, x, y, e });
                break;
            }
            case 'select': {
                this.selectElement({ x, y });
                break;
            }
            default:
                break;
        }
    }

    handleFontStyle = (fontSize) => {
        logger.log(fontSize);
        this.setState({
            fontSize: fontSize
        })
    }

    handleText = ({ text = '', x, y, maxWidth = 200, focus = true }) => {
        // logger.log('isTexting', this.isTexting);
        // this.isTexting = true;

        // logger.log(x + e.clientX, y + e.clientY);

        this.props.setMode('select');

        // logger.log(rect, x, y, areaPosition, e.clientX, e.clientY);
        const brushColor = this.props.brushColor;

        const ctx = this.state.ctx.temp;
        const fontSize = this.props.fontSize || 20;
        const fontColor = this.handleBrushColor(brushColor);
        const fontFamily = this.props.fontFamily;
        const fontWeight = this.props.fontWeight || 'normal';
        const fontStyle = this.props.fontStyle || 'normal'
        logger.log('The value for fontSize is', this.props.fontSize);

        const rect = this.state.canvas.temp.getBoundingClientRect();
        const areaPosition = {
            x: rect.left + x,
            y: rect.top + y,
        };

        // let measure = ctx.measureText(text);

        let textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        logger.log('handleText', this.handleText.fontSize);

        textarea.style.zIndex = 20;
        textarea.value = text;
        textarea.style.position = 'absolute';
        textarea.style.top = areaPosition.y + 'px';
        textarea.style.left = areaPosition.x + 'px';
        textarea.style.width = Math.max(200, maxWidth) + 'px';
        // textarea.style.height = 50 + 'px';
        textarea.style.fontSize = this.props.fontSize + 'px';
        textarea.style.fontStyle = this.props.fontStyle || 'normal';
        textarea.style.fontWeight = this.props.fontWeight || 'normal';
        textarea.style.border = 'dashed 1px blue';
        textarea.style.padding = '0px';
        textarea.style.margin = '0px';
        textarea.style.overflow = 'hidden';
        textarea.style.background = 'none';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.lineHeight = 1;
        textarea.style.fontFamily = this.props.fontFamily;
        textarea.style.transformOrigin = 'left top';
        textarea.style.textAlign = this.props.fontAlign;
        textarea.draggable = true;
        // textarea.cols = '30'


        // textarea.style.textAlign = 'center';
        textarea.style.color = fontColor;
        // rotation = textNode.rotation();
        var transform = '';
        // if (rotation) {
        //   transform += 'rotateZ(' + rotation + 'deg)';
        // }

        // var px = 0;
        // // also we need to slightly move textarea on firefox
        // // because it jumps a bit
        // var isFirefox =
        //     navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        // if (isFirefox) {
        //     px += 2 + Math.round(fontSize / 20);
        //     logger.log('lets seee', px);
        // }
        // transform += 'translateY(-' + px + 'px)';
        // logger.log(transform);

        // textarea.style.transform = transform;

        // reset height
        textarea.style.height = 'auto';
        // after browsers resized it we can set actual value
        textarea.style.height = textarea.scrollHeight + 'px';

        if (focus === true) {
            textarea.focus();
        }

        // textarea.ondblclick = textarea.focus;

        // let shiftX = event.clientX - ball.getBoundingClientRect().left;
        // let shiftY = event.clientY - ball.getBoundingClientRect().top;

        textarea.onmousedown = function (event) {

            let shiftX = event.clientX - textarea.getBoundingClientRect().left;
            let shiftY = event.clientY - textarea.getBoundingClientRect().top;

            // textarea.style.position = 'absolute';
            // textarea.style.zIndex = 1000;
            // document.body.append(ball);

            moveAt(event.pageX, event.pageY);

            // moves the ball at (pageX, pageY) coordinates
            // taking initial shifts into account
            function moveAt(pageX, pageY) {
                textarea.style.left = pageX - shiftX + 'px';
                textarea.style.top = pageY - shiftY + 'px';
            }

            function onMouseMove(event) {
                moveAt(event.pageX, event.pageY);
            }

            // move the ball on mousemove
            document.addEventListener('mousemove', onMouseMove);

            // drop the ball, remove unneeded handlers
            textarea.onmouseup = function () {
                document.removeEventListener('mousemove', onMouseMove);
                textarea.onmouseup = null;
            };

        };



        textarea.ondragstart = function () {
            return false;
        };

        textarea.addEventListener('keydown', function (e) {
            // hide on enter
            // if (e.keyCode === 13) {
            //     // textNode.text(textarea.value);
            //     ctx.fillText(textarea.value, x, y);
            //     // layer.draw();
            //     document.body.removeChild(textarea);
            // }
            // on esc do not set value back to node
            if (e.keyCode === 27) {
                removeTextarea();
            }

        });
        // logger.log(ctx.measureText(textarea.value).width);
        textarea.addEventListener('keydown', (e) => {
            logger.log(textarea.style.fontSize, this.props.fontSize);
            // textarea.style.width = Math.max(200, ctx.measureText(textarea.value).width * fonr) + 'px';
            textarea.style.height = 'auto';
            textarea.style.height =
                textarea.scrollHeight + this.props.fontSize + 'px';
            textarea.style.fontSize = this.props.fontSize + 'px';
            textarea.style.fontStyle = this.props.fontStyle || 'normal';
            textarea.style.fontWeight = this.props.fontWeight || 'normal';
            textarea.style.textAlign = this.props.fontAlign
            textarea.style.fontFamily = this.props.fontFamily
        });

        setTimeout(() => {
            window.addEventListener('click', handleOutsideClick);
        });

        const handleOutsideClick = (e) => {
            logger.log('handle outside click', e.target, e.target.id, e.target.parentNode, e.target.parentNode.id);
            if (e.target.id === 'text_style' || e.target.parentNode.id === 'text_style') {
                textarea.style.fontSize = this.props.fontSize + 'px';
                textarea.style.fontStyle = this.props.fontStyle;
                textarea.style.fontWeight = this.props.fontWeight;
                textarea.style.textAlign = this.props.fontAlign;
                textarea.style.fontFamily = this.props.fontFamily;
                logger.log('textarea.style', textarea.style.fontSize, textarea.style.fontStyle, textarea.style.fontWeight);
                logger.log('props for textarea', this.props.fontSize, this.props.fontStyle, this.props.fontWeight);
                return;
            }
            if (e.target !== textarea) {
                // logger.log(textarea.value);
                // logger.log(x,y,,);
                // ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                // ctx.fillStyle = fontColor;
                const strs = textarea.value.split('\n');
                let left, right, top, bottom;
                bottom = textarea.getBoundingClientRect().top - rect.top;
                top = textarea.getBoundingClientRect().top - rect.top;
                left = textarea.getBoundingClientRect().left - rect.left;
                let height = textarea.getBoundingClientRect().top - rect.top;
                let width = 0;
                strs.forEach((str) => {
                    bottom = bottom + this.props.fontSize;
                    width = Math.max(width, ctx.measureText(str).width);
                });
                bottom = bottom + this.props.fontSize;
                right = left + width;
                const data = {
                    val: textarea.value,
                    fontSize: this.props.fontSize,
                    fontColor: fontColor,
                    fontFamily: this.props.fontFamily,
                    fontWeight: this.props.fontWeight,
                    fontStyle: this.props.fontStyle,
                    fontAlign: this.props.fontAlign,
                    x: left,
                    y: top,
                    bottom: bottom,
                    right: right
                };
                this.drawText({ data });
                this.saveAction({ action: { type: 'text', data }, emit: true });
                removeTextarea();
            }
        }

        function removeTextarea() {
            textarea.parentNode.removeChild(textarea);
            window.removeEventListener('click', handleOutsideClick);
        }
    }




    handleShapeEnd = (type) => {
        if (this.isDrawing) {
            const data = {
                start: this.shapeParams.start,
                end: this.shapeParams.end,
                width: this.state.canvasWidth,
                height: this.state.canvasHeight,
                brushColor: this.props.brushColor,
            }
            this.saveAction({ action: { type, data }, emit: true });
        }
        // Stop drawing & save the drawn line
        this.isDrawing = false;
    }

    clearLazerTimer = () => {
        if (this.fadeTimer) {
            clearInterval(this.fadeTimer);
        }
        if (this.lazerTimer) {
            clearTimeout(this.lazerTimer);
        }
    }

    startLazerTimeout = () => {
        const width = this.state.canvas.lazer.width;
        const height = this.state.canvas.lazer.height;
        const ctx = this.state.ctx.lazer;
        this.clearLazerTimer();
        logger.log('startLazerTimeout');
        this.lazerTimer = setTimeout(() => {
            // for (let i = 1; i < 10; i++) {
            var x = 0;
            this.fadeTimer = setInterval(() => {
                ctx.save();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = `rgba(0,0,0,${0.1 * x})`;
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
                if (++x === 10) {
                    clearInterval(this.fadeTimer);
                }
            }, 100);
            // }
            logger.log('this.lazerTimer');
        }, 1000);
    }

    getPointerPos = (e) => {
        // This method returns a DOMRect object with eight properties: left, top, right, bottom, x, y, width, height.
        const rect = this.state.canvas.temp.getBoundingClientRect();

        // use cursor pos as default
        let clientX = e.clientX; // Get the horizontal coordinate
        let clientY = e.clientY; // Get the vertical coordinate

        // use first touch if available
        if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        // return mouse/touch position inside canvas
        return {
            x: (clientX - rect.left),
            y: (clientY - rect.top)
        };
    };

    handlePointerMove = (x, y) => {
        if (this.props.disabled) return;

        this.corrdinate = { x, y };

        const isDisabled = false;

        if ((this.isPressing && !this.isDrawing) || (isDisabled && this.isPressing)) {
            // Start drawing and add point
            this.isDrawing = true;
            this.points.push(this.corrdinate);
        }

        if (this.isDrawing) {

            this.redoActions = [];
            // Add new point
            this.points.push(this.corrdinate);
            const len = this.points.length;
            if (len < 2) return;
            const point1 = this.points[len - 1];
            const point2 = this.points[len - 2];

            const drawPoint = {
                point1,
                point2,
                brushColor: this.props.brushColor,
                brushRadius: this.props.brushRadius,
                width: this.state.canvasWidth,
                height: this.state.canvasHeight,
            };

            if (this.mode === 'lazer') {
                // this.drawLazer(drawPoint);
                this.drawLazer({ points: [...this.points] });
                // emiting the lazer points data 
                this.props.roomClient.sendCanvasData('drawLazer', { points: [...this.points] });
            }
            else {
                this.drawPoints(drawPoint);
                // emiting the drawing points data 
                this.props.roomClient.sendCanvasData('drawPoint', { drawPoint });
            }


        }
        this.mouseHasMoved = true;
    };

    handleEraser = (x, y) => {
        if (this.props.disabled) return;

        this.corrdinate = { x, y };

        const isDisabled = false;

        if ((this.isPressing && !this.isDrawing) || (isDisabled && this.isPressing)) {
            // Start drawing and add point
            this.isDrawing = true;
            this.points.push(this.corrdinate);
        }

        if (this.isDrawing) {

            this.redoActions = [];
            // Add new point
            this.points.push(this.corrdinate);
            const len = this.points.length;
            if (len < 2) return;
            const point1 = this.points[len - 1];
            const point2 = this.points[len - 2];

            const eraserPoint = {
                point1,
                point2,
                eraserSize: this.props.eraserSize,
                width: this.state.canvasWidth,
                height: this.state.canvasHeight,
            };

            this.unDrawPoints(eraserPoint);

            // emiting the drawing points data 
            this.props.roomClient.sendCanvasData('eraserPoint', { eraserPoint });

        }
        this.mouseHasMoved = true;
    }

    handleShape = (x, y, shape) => {
        if (this.props.disabled) return;

        this.corrdinate = { x, y };

        const isDisabled = false;

        if ((this.isPressing && !this.isDrawing) || (isDisabled && this.isPressing)) {
            // Start drawing and add point
            this.isDrawing = true;
            this.shapeParams = {
                start: this.corrdinate,
                end: null,
            }
        }

        if (this.isDrawing) {
            this.shapeParams.end = this.corrdinate;
            this.drawShape({ start: this.shapeParams.start, end: this.shapeParams.end, shape });
        }
        this.mouseHasMoved = true;
    }

    handleCircle = (x, y) => {
        if (this.props.disabled) return;

        this.corrdinate = { x, y };

        const isDisabled = false;

        if ((this.isPressing && !this.isDrawing) || (isDisabled && this.isPressing)) {
            // Start drawing and add point
            this.isDrawing = true;
            this.cirlceParams = {
                center: this.corrdinate,
                radius: 0,
            };
            // this.points.push(this.corrdinate);
        }

        if (this.isDrawing) {
            const radius = Math.sqrt(Math.pow(this.corrdinate.x - this.cirlceParams.center.x, 2) + Math.pow(this.corrdinate.y - this.cirlceParams.center.y, 2));
            this.cirlceParams.radius = radius;
            this.drawCircle({ center: this.cirlceParams.center, radius: this.cirlceParams.radius });
        }
        this.mouseHasMoved = true;
    }

    handleRectangle = (x, y) => {
        if (this.props.disabled) return;

        this.corrdinate = { x, y };

        const isDisabled = false;

        if ((this.isPressing && !this.isDrawing) || (isDisabled && this.isPressing)) {
            // Start drawing and add point
            this.isDrawing = true;
            this.rectangleParams = {
                topLeft: this.corrdinate,
                bottomRight: null,
            };
            // this.points.push(this.corrdinate);
        }

        if (this.isDrawing) {
            this.rectangleParams.bottomRight = this.corrdinate;
            this.drawRectangle({ topLeft: this.rectangleParams.topLeft, bottomRight: this.rectangleParams.bottomRight });
        }
        this.mouseHasMoved = true;
    }

    handleStraightLine = (x, y) => {
        if (this.props.disabled) return;

        this.corrdinate = { x, y };

        const isDisabled = false;

        if ((this.isPressing && !this.isDrawing) || (isDisabled && this.isPressing)) {
            // Start drawing and add point
            this.isDrawing = true;
            this.straightLineParams = {
                point1: this.corrdinate,
                point2: null,
            };
            // this.points.push(this.corrdinate);
        }

        if (this.isDrawing) {
            this.straightLineParams.point2 = this.corrdinate;
            this.drawStraightLine({ point1: this.straightLineParams.point1, point2: this.straightLineParams.point2 });
        }
        this.mouseHasMoved = true;
    }

    handleElementEraser = (x, y) => {
        if (this.props.disabled) return;

        if (this.isPressing) {

            this.redoActions = [];
            this.corrdinate = { x, y };
            this.findLine({ point: this.corrdinate });
        }
    }

    findLine = ({ point }) => {
        logger.log('before find line', this.actions, JSON.stringify(this.actions));
        const actions = this.actions;
        logger.log(actions);
        for (let i = 0, actionslen = actions.length; i < actionslen; i++) {
            logger.log(actions);
            const { type, data } = actions[i];
            logger.log('Action number', i, type, data);
            if (type === 'pen') {
                const { points, brushColor, brushRadius } = data;
                logger.log('Pen action data', points, JSON.stringify(points));
                for (let j = 0, pointsLen = points.length; j < pointsLen; j++) {
                    const deltaX = Math.abs(point.x - points[j].x);
                    const deltaY = Math.abs(point.y - points[j].y);
                    const approx = 15;
                    if ((0 < deltaX && deltaX < approx) && (0 < deltaY && deltaY < approx)) {
                        logger.warn('FOUND', i);
                        this.deleteFoundLine({ index: i, emit: true, data });
                        return;
                    }
                }
            }
        }
    }

    drawText = ({ data }) => {
        const ctx = this.state.ctx.temp;
        const { fontStyle, fontSize, fontWeight, fontFamily, fontColor, x, y, val, fontAlign, bottom, right } = data;
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = fontColor;
        ctx.textAlign = fontAlign;
        const strs = val.split('\n');
        let X = x, Y = y;
        if (fontAlign === 'center') {
            X = X + (right - x) / 2;
        }
        else if (fontAlign === 'right') {
            X = X + (right - x);
        }
        strs.forEach((str) => {
            ctx.fillText(str, X, Y);
            Y = Y + fontSize;
        });
    }

    deleteFoundLine = ({ index, emit = true, data }) => {
        this.undoActions.push({ type: 'elementEraser', data: { index, data } });
        this.deleteAction({ index }, emit);
    }

    deleteAction = ({ index }, emit = true) => {
        logger.log('deleteAction', index, emit);
        logger.log('from deleteAction 1', this.actions, JSON.stringify(this.actions));
        const data = this.actions[index];
        this.actions.splice(index, 1);
        // this.redoLines.push(this.actions[index]);
        logger.log('from deleteAction 2', this.actions, JSON.stringify(this.actions));
        this.redraw({ actions: [...this.actions] });
        if (emit) {
            this.props.roomClient.sendCanvasData('deleteAction', { index });
        }
    }

    drawPoints = ({ point1, point2, brushColor, brushRadius, width, height }) => {

        const { p1, p2, radius } = this.getScaledPoints(point1, point2, brushRadius, width, height);
        point1 = p1;
        point2 = p2;
        brushRadius = radius;
        brushColor = this.handleBrushColor(brushColor);

        const ctx = this.state.ctx.temp;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushRadius * 2;

        ctx.beginPath();
        ctx.moveTo(point2.x, point2.y);
        ctx.lineTo(point1.x, point1.y);
        ctx.stroke();
        ctx.closePath();
    };

    drawShape = ({ start, end, shape, brushColor = this.props.brushColor }) => {
        const ctx = this.state.ctx.temp;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = this.handleBrushColor(brushColor);
        ctx.fillStyle = this.handleBrushColor(brushColor);
        ctx.lineWidth = 5;
        switch (shape) {
            case SHAPES.CIRCLE: {
                this.drawCircle({ start, end, ctx });
                break;
            }
            case SHAPES.RECTANGLE: {
                this.drawRectangle({ start, end, ctx });
                break;
            }
            case SHAPES.LINE: {
                this.drawStraightLine({ start, end, ctx });
                break;
            }
            case SHAPES.ARROW: {
                this.drawArrow({ start, end, ctx });
                break;
            }
            case SHAPES.TRIANGLE: {
                this.drawTriangle({ start, end, ctx });
                break;
            }
            case SHAPES.ROUNDED_RECTANGLE: {
                this.drawRoundRectangle({ start, end, ctx });
            }
            default:
                break;
        }
    }

    drawCircle = ({ start, end, ctx }) => {
        const center = start;
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.closePath();
    }

    drawRectangle = ({ start, end, ctx }) => {
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.beginPath();
        ctx.rect(start.x, start.y, width, height);
        ctx.closePath();
        ctx.stroke();
        ctx.closePath();
    }

    drawRoundRectangle = ({ start, end, ctx }) => {
        const width = end.x - start.x;
        const height = end.y - start.y;
        let radius = 60;
        radius = { x: width * 0.25, y: height * 0.25 };
        ctx.beginPath();
        ctx.moveTo(start.x + radius.x, start.y);
        ctx.lineTo(start.x + width - radius.x, start.y);
        ctx.quadraticCurveTo(start.x + width, start.y, start.x + width, start.y + radius.y);
        ctx.lineTo(start.x + width, start.y + height - radius.y);
        ctx.quadraticCurveTo(start.x + width, start.y + height, start.x + width - radius.x, start.y + height);
        ctx.lineTo(start.x + radius.x, start.y + height);
        ctx.quadraticCurveTo(start.x, start.y + height, start.x, start.y + height - radius.y);
        ctx.lineTo(start.x, start.y + radius.y);
        ctx.quadraticCurveTo(start.x, start.y, start.x + radius.x, start.y);
        ctx.closePath();
        ctx.stroke();
        ctx.closePath();
    }

    drawStraightLine = ({ start, end, ctx }) => {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.closePath();

        // this.drawArrowhead(ctx, start, end, 15);
    };

    drawTriangle = ({ start, end, ctx }) => {
        const p1 = {
            x: start.x, y: end.y
        }
        const p2 = end;
        const p3 = {
            x: (start.x + end.x) / 2,
            y: start.y
        }
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.closePath();

    }

    drawArrow = ({ start, end, ctx }) => {
        this.drawStraightLine({ start, end, ctx });
        this.drawArrowhead(ctx, start, end, 15);
    }

    drawArrowhead = (context, from, to, radius) => {
        let x_center = to.x;
        let y_center = to.y;

        let angle;
        let x;
        let y;

        context.beginPath();

        angle = Math.atan2(to.y - from.y, to.x - from.x)
        x = radius * Math.cos(angle) + x_center;
        y = radius * Math.sin(angle) + y_center;

        context.moveTo(x, y);

        angle += (1.0 / 3.0) * (2 * Math.PI)
        x = radius * Math.cos(angle) + x_center;
        y = radius * Math.sin(angle) + y_center;

        context.lineTo(x, y);

        angle += (1.0 / 3.0) * (2 * Math.PI)
        x = radius * Math.cos(angle) + x_center;
        y = radius * Math.sin(angle) + y_center;

        context.lineTo(x, y);

        context.closePath();

        context.fill();
    }

    drawLazer = ({ points }) => {
        this.clearLazerTimer();
        const ctx = this.state.ctx.temp;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.clearRect(
            0,
            0,
            ctx.canvas.width,
            ctx.canvas.height
        );
        let p1, p2;
        let r = 254, g = 16, b = 27;

        ctx.shadowColor = "rgb(" + r + "," + g + "," + b + ")";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + ",0.2)";
        ctx.lineWidth = 9;
        p1 = points[0];
        p2 = points[1];
        ctx.moveTo(p2.x, p2.y);
        ctx.beginPath();
        for (var i = 1, len = points.length; i < len; i++) {
            var midPoint = midPointBtw(p1, p2);
            ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = points[i];
            p2 = points[i + 1];
        }
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + ",0.2)";
        ctx.lineWidth = 7;
        p1 = points[0];
        p2 = points[1];
        ctx.moveTo(p2.x, p2.y);
        ctx.beginPath();
        for (var i = 1, len = points.length; i < len; i++) {
            var midPoint = midPointBtw(p1, p2);
            ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = points[i];
            p2 = points[i + 1];
        }
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + ",0.2)";
        ctx.lineWidth = 5;
        p1 = points[0];
        p2 = points[1];
        ctx.moveTo(p2.x, p2.y);
        ctx.beginPath();
        for (var i = 1, len = points.length; i < len; i++) {
            var midPoint = midPointBtw(p1, p2);
            ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = points[i];
            p2 = points[i + 1];
        }
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        p1 = points[0];
        p2 = points[1];
        ctx.moveTo(p2.x, p2.y);
        ctx.beginPath();
        for (var i = 1, len = points.length; i < len; i++) {
            var midPoint = midPointBtw(p1, p2);
            ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
            p1 = points[i];
            p2 = points[i + 1];
        }
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 0;
    }

    handleBrushColor = (brushColor) => {
        const canvas = this.state.canvas.grid;
        if (canvas.style.backgroundColor === '' && brushColor === 'white') {
            return 'black';
        }
        if (canvas.style.backgroundColor === brushColor) {
            return (brushColor === 'black' ? 'white' : 'black');
        }
        return brushColor;
    }

    unDrawPoints = ({ point1, point2, eraserSize, width, height }) => {

        const { p1, p2, radius } = this.getScaledPoints(point1, point2, eraserSize, width, height);
        point1 = p1;
        point2 = p2;
        eraserSize = radius;

        const ctx = this.state.ctx.drawing;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = eraserSize * 2;

        ctx.beginPath();
        ctx.moveTo(point2.x, point2.y);
        ctx.lineTo(point1.x, point1.y);
        ctx.stroke();
        ctx.closePath();
        ctx.globalCompositeOperation = "source-over";

    };

    saveAction = ({ newAction = true, action, emit = true }) => {
        logger.log('saveAction', action, newAction, emit);
        const { type, data } = action;
        // logger.log('saveAction', action, JSON.stringify(action));
        switch (type) {
            case 'pen': {
                logger.log('before Save Pen Data', data);
                // get color
                data.brushColor = this.handleBrushColor(data.brushColor);
                // get scaleLine
                const scaleLine = this.getScaledLine([...data.points], data.brushRadius, data.width, data.height);
                logger.log('scaledLine', scaleLine, data);
                data.points = [...scaleLine.points];
                data.brushRadius = scaleLine.radius;

                logger.log('After Save Pen Data', data);
                const { points, brushColor, brushRadius } = data;
                const line = {
                    points: [...points],
                    brushColor: brushColor,
                    brushRadius: brushRadius
                }
                logger.log('The line that is saved is', line, data);
                logger.log('SavePen before', this.undoActions);

                this.actions.push({ type: 'pen', data: line });

                if (newAction === true) {
                    this.undoActions.push({ type: 'pen', data: line });
                }

                logger.log('SavePen after', this.undoActions);

                // Reset points array
                this.points.length = 0;

                const width = this.state.canvas.temp.width;
                const height = this.state.canvas.temp.height;

                logger.log('Width and Height', width, height);

                // Copy the line to the drawing canvas
                this.state.ctx.drawing.drawImage(this.state.canvas.temp, 0, 0, width, height);
                logger.log('printed to drawing');

                // Clear the temporary line-drawing canvas
                this.state.ctx.temp.clearRect(0, 0, width, height);

                logger.warn('Actions', this.actions);
                break;
            }
            case 'eraser': {
                const scaleLine = this.getScaledLine([...data.points], data.eraserSize, data.width, data.height);
                logger.log('scaledLine', scaleLine, data);
                data.points = [...scaleLine.points];
                data.eraserSize = scaleLine.radius;

                const { points, eraserSize } = data;
                const erase = {
                    points: [...points],
                    eraserSize,
                }
                // logger.log('SavePen before', this.actions, JSON.stringify(this.actions));
                this.actions.push({ type: 'eraser', data: erase });
                if (newAction === true) {
                    this.undoActions.push({ type: 'eraser', data: erase });
                }
                this.points.length = 0;
                break;
            }
            case 'text': {
                const { fontColor, fontFamily, fontSize, val, x, y } = data;
                // const text = {
                //     fontC
                // }
                logger.log('SaveText before', this.undoActions, JSON.stringify(this.undoActions));

                this.actions.push({ type: 'text', data });
                if (newAction === true) {
                    this.undoActions.push({ type: 'text', data });
                }
                logger.log('SaveText after', this.undoActions, JSON.stringify(this.undoActions));

                const width = this.state.canvas.temp.width;
                const height = this.state.canvas.temp.height;

                // Copy the line to the drawing canvas
                this.state.ctx.drawing.drawImage(this.state.canvas.temp, 0, 0, width, height);
                logger.log('printed to drawing');

                // Clear the temporary line-drawing canvas
                this.state.ctx.temp.clearRect(0, 0, width, height);

                logger.warn('Actions', this.actions);
                break;
            }
            case SHAPES.ROUNDED_RECTANGLE:
            case SHAPES.CIRCLE:
            case SHAPES.RECTANGLE:
            case SHAPES.LINE:
            case SHAPES.TRIANGLE:
            case SHAPES.ARROW: {
                const scaledShape = this.getScaledShape(data.start, data.end, data.width, data.height);
                logger.log(type, scaledShape, data);
                data.start = scaledShape.start;
                data.end = scaledShape.end;
                data.brushColor = this.handleBrushColor(data.brushColor);

                this.actions.push({ type, data });
                if (newAction === true) {
                    this.undoActions.push({ type, data });
                }
                this.shapeParams = null;

                const width = this.state.canvas.temp.width;
                const height = this.state.canvas.temp.height;

                logger.log('Width and Height', width, height);

                // Copy the line to the drawing canvas
                this.state.ctx.drawing.drawImage(this.state.canvas.temp, 0, 0, width, height);
                logger.log('printed to drawing');

                // Clear the temporary line-drawing canvas
                this.state.ctx.temp.clearRect(0, 0, width, height);

                logger.warn('Actions', this.actions);
                break;
            }
            default:
                break;
        }

        if (emit) {
            this.props.roomClient.sendCanvasData('saveAction', { action: JSON.stringify(action) });
        }
    }

    drawGrid = (ctx) => {
        if (this.props.hideGrid) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.beginPath();
        ctx.setLineDash([5, 1]);
        ctx.setLineDash([]);
        ctx.strokeStyle = this.props.gridColor;
        ctx.lineWidth = 0.5;

        const gridSize = this.props.gridSize || 25;

        let countX = 0;
        while (countX < ctx.canvas.width) {
            countX += gridSize;
            ctx.moveTo(countX, 0);
            ctx.lineTo(countX, ctx.canvas.height);
        }
        ctx.stroke();

        let countY = 0;
        while (countY < ctx.canvas.height) {
            countY += gridSize;
            ctx.moveTo(0, countY);
            ctx.lineTo(ctx.canvas.width, countY);
        }
        ctx.stroke();
        console.log('yo');
    };

    handleActionsColor = (actions, bgColor, color) => {
        for (let i = 0, actionslen = actions.length; i < actionslen; i++) {
            const { type, data } = actions[i];
            logger.log('Action number', i, type, data);
            switch (type) {
                case 'pen': {
                    const { brushColor } = data;
                    if (brushColor === bgColor) {
                        actions[i].data.brushColor = color;
                    }
                    break;
                }
                case 'text': {
                    const { fontColor } = data;
                    if (fontColor === bgColor) {
                        actions[i].data.fontColor = color;
                    }
                    break;
                }
                default:
                    break;
            }
        }
        return actions;
    }

    invertColor = (bgColor, color) => {
        logger.log('BEFORE', this.actions, this.undoActions, this.redoActions);

        this.actions = [...this.handleActionsColor(this.actions, bgColor, color)];
        this.undoActions = [...this.handleActionsColor(this.undoActions, bgColor, color)];
        this.redoActions = [...this.handleActionsColor(this.redoActions, bgColor, color)];

        logger.log('AFTER', this.actions, this.undoActions, this.redoActions);

        const canvas = this.state.canvas;
        canvas.grid.style.backgroundColor = bgColor;
        this.setState({
            canvas: canvas,
        }, () => {
            this.redraw({ actions: [...this.actions] });
        });
    }

    clear = ({ redrawClean = false, emit = true }) => {
        if (redrawClean === false) {
            this.undoActions.push({ type: 'clearScreen', data: [...this.actions] });
        }
        this.actions = [];
        this.valuesChanged = true;
        this.state.ctx.drawing.clearRect(
            0,
            0,
            this.state.canvas.drawing.width,
            this.state.canvas.drawing.height
        );
        this.state.ctx.temp.clearRect(
            0,
            0,
            this.state.canvas.temp.width,
            this.state.canvas.temp.height
        );
        if (emit) {
            this.props.roomClient.sendCanvasData('clearScreen');
        }
    };

    undo = (emit) => {

        logger.log('before undo', this.undoActions, JSON.stringify(this.undoActions));
        if (this.undoActions.length < 1) return;
        const action = this.undoActions.pop();
        logger.log('after undo', this.undoActions, JSON.stringify(this.undoActions));
        switch (action.type) {
            case 'text':
            case 'eraser':
            case SHAPES.ROUNDED_RECTANGLE:
            case SHAPES.CIRCLE:
            case SHAPES.RECTANGLE:
            case SHAPES.LINE:
            case SHAPES.TRIANGLE:
            case SHAPES.ARROW:
            case 'pen': {
                for (let i = this.actions.length - 1; i >= 0; i--) {
                    const a = this.actions[i];
                    logger.log('UNDO',a.type);
                    if (a.type === action.type) {
                        logger.log('UNDO','MATCHED');
                        this.redoActions.push(a);
                        this.deleteAction({ index: i }, false);
                        break;
                    }
                }
                break;
            }
            case 'elementEraser': {
                const { index, data } = action.data;
                const { points, brushColor, brushRadius } = data;
                logger.log(points, brushColor, brushRadius);
                this.drawLine({ points, brushColor, brushRadius });
                this.redoActions.push({ type: 'elementEraser', data: { actions: [...this.actions] } });
                this.saveAction({ newAction: false, action: { type: 'pen', data: data }, emit: false });
                break;
            }
            case 'clearScreen': {
                // const { actions } = action.data;
                this.redoActions.push(action);
                this.redraw({ actions: [...action.data] });
                break;
            }
            default:
                break;
        }
        if (emit) {
            this.props.roomClient.sendCanvasData('undoScreen');
        }
    };

    redo = (emit) => {
        if (this.redoActions.length < 1) return;
        logger.log('from redo', this.redoActions, JSON.stringify(this.redoActions));
        const action = this.redoActions.pop();
        if (action === undefined) return;
        switch (action.type) {
            case 'pen': {
                const { points, brushColor, brushRadius } = action.data;
                this.drawLine({
                    points: [...points],
                    brushColor,
                    brushRadius
                });
                this.points = points
                break;
            }
            case 'eraser': {
                const { points, eraserSize } = action.data;
                this.unDrawLine({
                    points: [...points],
                    eraserSize
                });
                this.points = points
                break;
            }
            case 'text': {
                // const { points, brushColor, brushRadius } = action.data;
                this.drawText({ data: action.data });
                break;
            }
            case SHAPES.ROUNDED_RECTANGLE:
            case SHAPES.CIRCLE:
            case SHAPES.RECTANGLE:
            case SHAPES.LINE:
            case SHAPES.TRIANGLE:
            case SHAPES.ARROW: {
                const { start, end, brushColor } = action.data;
                this.drawShape({ start, end, shape: action.type, brushColor });
                break;
            }
            case 'elementEraser': {
                const { actions } = action.data;
                this.redraw({ actions: [...actions] });
                break;
            }
            case 'clearScreen': {
                this.clear({ emit: false });
            }
            default:
                break;
        }
        // this.saveLine({ brushColor, brushRadius, emit: false });
        this.saveAction({ action, emit: false });
        if (emit) {
            this.props.roomClient.sendCanvasData('redoScreen');
        }
    }

    test = () => {
        const actions = [...this.actions];
        this.redraw({ actions });
    }

    redraw = ({ actions, newAction = false }) => {
        logger.log('I am from redarw', actions);
        this.clear({ redrawClean: true, emit: false });
        actions.forEach(action => {
            logger.log('redraw', action);
            switch (action.type) {
                case 'pen': {
                    logger.log('redraw Pen', action);
                    const { points, brushColor, brushRadius } = action.data;
                    this.drawLine({
                        points,
                        brushColor,
                        brushRadius: brushRadius
                    });
                    this.points = points;
                    break;
                }
                case 'eraser': {
                    const { points, eraserSize } = action.data;
                    this.unDrawLine({
                        points: [...points],
                        eraserSize
                    });
                    this.points = points;
                    break;
                }
                case 'text': {
                    // const { points, brushColor, brushRadius } = action.data;
                    this.drawText({ data: action.data });
                    break;
                }
                case 'deleteLine': {
                    const { index } = action.data;
                    this.deleteFoundLine({ index, emit: false, data: this.actions[index].data });
                    // this.deleteLine({ index }, false);
                    break;
                }
                case 'deleteAction': {
                    const { index } = action.data;
                    this.deleteAction({ index }, false);
                    break;
                }
                case SHAPES.ROUNDED_RECTANGLE:
                case SHAPES.CIRCLE:
                case SHAPES.RECTANGLE:
                case SHAPES.LINE:
                case SHAPES.TRIANGLE:
                case SHAPES.ARROW: {
                    const { start, end, brushColor } = action.data;
                    this.drawShape({ start, end, shape: action.type, brushColor });
                    break;
                }
                // case 'undoScreen':{
                //     this.undo(false);
                //     break;
                // }
                default:
                    break;
            }

            logger.log('saveRedrawn', action);
            this.saveAction({ newAction, action, emit: false });
        });
    }

    drawLine({ points, brushColor, brushRadius }) {
        if (points.length < 2) return;

        // const values = this.getScaledLine([...points], brushRadius);
        // points = [...values.points];
        // brushRadius = values.radius;

        const ctx = this.state.ctx.temp;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = brushColor;
        // console.log(ctx);

        ctx.clearRect(
            0,
            0,
            ctx.canvas.width,
            ctx.canvas.height
        );
        ctx.lineWidth = brushRadius * 2;

        let p1 = points[0];
        let p2 = points[1];


        ctx.moveTo(p2.x, p2.y);
        ctx.beginPath();

        for (var i = 1, len = points.length; i < len; i++) {
            // we pick the point between pi+1 & pi+2 as the
            // end point and p1 as our control point
            // var midPoint = midPointBtw(p1, p2);
            ctx.lineTo(p2.x, p2.y);
            p1 = points[i];
            p2 = points[i + 1];
        }
        // Draw last line as a straight line while
        // we wait for the next point to be able to calculate
        // the bezier control point
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.closePath();
    }

    unDrawLine({ points, eraserSize }) {
        if (points.length < 2) return;

        // const values = this.getScaledLine([...points], eraserSize);
        // points = [...values.points];
        // eraserSize = values.radius;

        const ctx = this.state.ctx.drawing;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = eraserSize * 2;

        let p1 = points[0];
        let p2 = points[1];

        ctx.moveTo(p2.x, p2.y);
        ctx.beginPath();

        for (var i = 1, len = points.length; i < len; i++) {
            // we pick the point between pi+1 & pi+2 as the
            // end point and p1 as our control point
            // var midPoint = midPointBtw(p1, p2);
            ctx.lineTo(p2.x, p2.y);
            p1 = points[i];
            p2 = points[i + 1];
        }
        // Draw last line as a straight line while
        // we wait for the next point to be able to calculate
        // the bezier control point
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.closePath();
        ctx.globalCompositeOperation = "source-over";
    }

    getScaledShape = (start, end, width = this.state.canvasWidth, height = this.state.canvasHeight) => {
        start = this.getScaledPoint(start, width, height);
        end = this.getScaledPoint(end, width, height);
        return { start, end };
    }

    getScaledLine = (points, radius, width = this.state.canvasWidth, height = this.state.canvasHeight) => {
        radius = this.getScaledRadius(radius, width, height);
        points.forEach((point) => {
            point = this.getScaledPoint(point, width, height);
        });
        return { points, radius };
    }

    getScaledPoints = (p1, p2, radius, width = this.state.canvasWidth, height = this.state.canvasHeight) => {
        radius = this.getScaledRadius(radius, width, height);
        p1 = this.getScaledPoint(p1, width, height);
        p2 = this.getScaledPoint(p2, width, height);
        return { p1, p2, radius };
    }

    getScaledRadius = (radius, width = this.state.canvasWidth, height = this.state.canvasHeight) => {
        const scaleX = this.state.canvasWidth / width;
        const scaleY = this.state.canvasHeight / height;
        const scaleAvg = (scaleX + scaleY) / 2;
        radius = radius * scaleAvg;
        return radius;
    }

    getScaledPoint = (point, width = this.state.canvasWidth, height = this.state.canvasHeight) => {
        const scaleX = this.state.canvasWidth / width;
        const scaleY = this.state.canvasHeight / height;
        point.x = point.x * scaleX;
        point.y = point.y * scaleY;
        return point;
    }

    getCanvasBlob = () => {
        const ctx = this.state.ctx.drawing;
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = this.props.backgroundColor;
        ctx.fillRect(0, 0, this.state.canvas.drawing.width, this.state.canvas.drawing.height);
        // const dataUrl = this.state.canvas.drawing.toDataURL("image/jpeg");
        this.state.canvas.drawing.toBlob(function (blob) {
            // let url = URL.createObjectURL(blob);
            blob.name = `canvasSnapshot.png`;
            logger.log('getCanvasBlob', blob);
            store.dispatch(canvasAction.canvasUrl({ canvasUrl: blob, updateCanvasUrl: false, isUrlReady: true }));
        });
        this.redraw({ actions: [...this.actions] });
    }

    getStream = () => {
        const canvas = this.state.canvas.drawing;
        logger.log('getStream', canvas);
        logger.log('getCanvas', canvas.captureStream(25));
        return canvas.captureStream(25);
    }

    getDataUrl = () => {
        const ctx = this.state.ctx.drawing;
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = this.props.backgroundColor;
        ctx.fillRect(0, 0, this.state.canvas.drawing.width, this.state.canvas.drawing.height);
        const dataUrl = this.state.canvas.drawing.toDataURL("image/jpeg");
        this.redraw({ actions: [...this.actions] });
        logger.log(dataUrl);
        return dataUrl;
    }

    saveOrDownloadCanvas = () => {
        let a = document.createElement('a');
        a.href = this.getDataUrl();
        a.download = 'my-canvas.jpeg';
        document.body.appendChild(a);
        a.click();
        this.redraw({ actions: [...this.actions] });
    }

    handleCanvasResize = (newWidth, newHeight) => {
        let width = this.state.canvasWidth;
        let height = this.state.canvasHeight;
        this.setState({
            canvasWidth: newWidth,
            canvasHeight: newHeight,
        }, () => {
            logger.log('SCALE', this.state.canvasWidth, this.state.canvasHeight, width, height, (this.state.canvasWidth / width), (this.state.canvasHeight / height));
            logger.log('BEFORE', this.actions);

            this.actions = this.handleActionsResize(this.actions, width, height, 'action');
            // this.undoActions = this.handleActionsResize(this.undoActions, width, height, 'undoAction');
            // this.redoActions = this.handleActionsResize(this.redoActions, width, height, 'redoAction');

            logger.log('AFTER', this.actions);

            this.redraw({ actions: [...this.actions] });
        });
    };

    handleActionsResize = (actions, width, height, type) => {
        logger.log(type);
        for (let i = 0, actionslen = actions.length; i < actionslen; i++) {
            const { type, data } = actions[i];
            logger.log('Action number', i, type, data);
            switch (type) {
                case 'pen': {
                    let { points, brushRadius } = data;
                    const scaledLine = this.getScaledLine([...points], brushRadius, width, height);
                    actions[i].data.points = [...scaledLine.points];
                    actions[i].data.brushRadius = scaledLine.radius;
                    break;
                }
                case 'eraser': {
                    let { points, eraserSize } = data;
                    const scaledLine = this.getScaledLine([...points], eraserSize, width, height);
                    actions[i].data.points = [...scaledLine.points];
                    actions[i].data.eraserSize = scaledLine.radius;
                    break;
                }
                // case 'text': {
                //     const { fontColor } = data;
                //     if (fontColor === bgColor) {
                //         actions[i].data.fontColor = color;
                //     }
                //     break;
                // }
                default:
                    break;
            }
        }
        return actions;
    }
}

const dimensionsPropTypes = PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
]);

Canvas.defaultProps = {
    canvasWidth: 700,
    canvasHeight: 400,
    lazyRadius: 12,
    smoothDraw: false,
    backgroundColor: 'white',
    hideGrid: false,
    gridColor: 'rgba(150,150,150,0.37)',
    brushColor: 'white',
    brushRadius: 5,
    eraserSize: 5,
    gridSize: 25,
    hideInterface: false,
    catenaryColor: "#0a0302",
    disabled: false,
    mode: 'pen',
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontAlign: 'left',
    fontFamily: 'Arial',
}

Canvas.prototypes = {
    canvasWidth: dimensionsPropTypes,
    canvasHeight: dimensionsPropTypes,
    lazyRadius: PropTypes.number,
    smoothDraw: PropTypes.bool,
    backgroundColor: PropTypes.string,
    hideGrid: PropTypes.bool,
    gridColor: PropTypes.string,
    brushColor: PropTypes.string,
    brushRadius: PropTypes.number,
    gridSize: PropTypes.number,
    hideInterface: PropTypes.bool,
    disabled: PropTypes.bool,
    mode: PropTypes.string,
    fontSize: PropTypes.number,
    fontStyle: PropTypes.string,
    fontWeight: PropTypes.string,
    fontAlign: PropTypes.string,
    fontFamily: PropTypes.string,
};

const mapStateToProps = (state) => {
    return {
        updateCanvasUrl: state.canvas.updateCanvasUrl
    };
};


export default connect(mapStateToProps, null, null, { forwardRef: true })(withRoomContext(Canvas));
