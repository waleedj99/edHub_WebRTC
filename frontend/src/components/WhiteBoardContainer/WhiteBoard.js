import React, { useRef, useState,useEffect } from 'react';
import { Button, Container, FormControl, InputLabel, MenuItem, Select, Slider, TextField, Typography } from '@material-ui/core';
import { ReactComponent as UndoIcon } from "../../Assets/Icons/whiteboard/undo.svg"
import { ReactComponent as RedoIcon } from "../../Assets/Icons/whiteboard/redo.svg"

import { ReactComponent as Downloads } from "../../Assets/Icons/whiteboard/downloadwebrtc.svg"
import { ReactComponent as Ellipse } from "../../Assets/Icons/whiteboard/Ellipse.svg"
import { ReactComponent as Grid1 } from "../../Assets/Icons/whiteboard/grid 1.svg"
import { ReactComponent as Pen } from "../../Assets/Icons/whiteboard/pen.svg"
import { ReactComponent as Pointericon } from "../../Assets/Icons/whiteboard/pointer.svg"
import { ReactComponent as Texticon } from "../../Assets/Icons/whiteboard/Texticon.svg"
import { ReactComponent as Rectangleicon } from "../../Assets/Icons/whiteboard/Rectangle.svg"
import { ReactComponent as Dottedsqicon } from "../../Assets/Icons/whiteboard/dottedsquare.svg"
import { ReactComponent as EraserIcon } from "../../Assets/Icons/whiteboard/eradd.svg"
import { ReactComponent as ElementEraserIcon } from "../../Assets/Icons/whiteboard/element eraser.svg"
import { ReactComponent as Down } from "../../Assets/Icons/whiteboard/down.svg"
import Sidebar from "../Sidebar/Sidebar"
import BottomBar from "../BottomBar/BottomBar"
import { ReactComponent as UnderlineEraserIcon } from "../../Assets/Icons/whiteboard/eraser.svg"
import { ReactComponent as Fourlines } from "../../Assets/Icons/whiteboard/4lines.svg"

import { ReactComponent as Circleicon } from "../../Assets/Icons/whiteboard/Circle.svg"
import { ReactComponent as Slantline } from "../../Assets/Icons/whiteboard/slantline.svg"
import { ReactComponent as StarIcon } from "../../Assets/Icons/whiteboard/Star 1.svg"
import { ReactComponent as SqIcon } from "../../Assets/Icons/whiteboard/Rectangle2.svg"
import { ReactComponent as Arrow } from "../../Assets/Icons/whiteboard/Arrow 2.svg"
import { ReactComponent as TriangleIcon } from "../../Assets/Icons/whiteboard/triangle.svg"




import { CirclePicker, } from 'react-color';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import ZoomOutIcon from '@material-ui/icons/ZoomOut';
import Logger from '../../Logger';
import Canvas from './Canvas';
import { SHAPES } from '../../Utils/Constants';
import "./wb.css"
import Modal from "react-modal"
import { useMediaQuery } from 'react-responsive'

const logger = new Logger('WhiteBoard');
const cursor = "cursor-pen"
const wbc = "wb-container"
const WhiteBoard = (props) => {
    const [hideGrid, setHideGrid] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [color, setColor] = useState('black');
    const [brushRadius, setBrushRadius] = useState(5);
    const [eraserSize, setEraserSize] = useState(5);
    const [gridSize, setGridSize] = useState(25);
    const [mode, setMode] = useState('pen');
    const [bgColor, setBgColor] = useState('white');
    const [fontSize, setFontSize] = useState(16);
    const [fontStyle, setFontStyle] = useState('normal');
    const [fontWeight, setFontWeight] = useState('normal');
    const [fontAlign, setFontAlign] = useState('left');
    const [fontFamily, setFontFamily] = useState('Arial');
    const [size, setSize] = useState({ height: 1000, width: 1000 });
    const [modalIsOpen, setModalIsOpen] = useState(false)
    const [modalIsOpenEraser, setEraserModalIsOpen] = useState(false)
    const [modalIsOpenText, setTextModalIsOpen] = useState(false)
    const [modalIsOpenSq, setSqModalIsOpen] = useState(false)
    const [modalIsOpenColor, setColorModalIsOpen] = useState(false)
    const [canvasHasContent, setCanvasHasContent] = useState(false);

    //this is for media queries
    const isLaptop = useMediaQuery({ maxWidth: 1424, minWidth: 1224 })
    const isDesktop = useMediaQuery({ minWidth: 2000 })
    const canvasRef = useRef();
    logger.log(canvasRef);

    const handleBgColor = (bgColor) => {
        if (bgColor === 'white') {
            // setColor('white');
            setBgColor('black');
            canvasRef.current.invertColor('black', 'white');
        }
        else {
            // setColor('black');
            setBgColor('white');
            canvasRef.current.invertColor('white', 'black');
        }
    }
    const handleZoom = (zoomType) => {
        let width, height;
        if (zoomType === 'in') {
            if (size.width <= 100 || size.height <= 100) return;
            width = size.width - 100;
            height = size.height - 100;
        }
        else {
            width = size.width + 100;
            height = size.height + 100;
        }
        resizeCanvas(width, height);
    }
    const resizeCanvas = (width, height) => {
        setSize({
            width: width,
            height: height,
        });
        canvasRef.current.handleCanvasResize(width, height);
    }
    const handleDownloadCanvas = () => {
        canvasRef.current.saveOrDownloadCanvas();
    }

    const handleSelectColor = () => {
        if(!['pen','text',...Object.values(SHAPES)].includes(mode)){
            setMode('pen');
        }
        setColorModalIsOpen(true);
    }

    const handleGetStream = () => {
        const stream = canvasRef.current.getStream();
        props.getStreamFromCanvas(stream);
    }

    useEffect(() => {
        handleGetStream();
    }, []);


    return (
        <div>
            <div className="wb-navbar">
                <div className="wb-undo">
                    <div onClick={() => { canvasRef.current.undo(true) }} className="wbur" style={{width:"100%"}}> <UndoIcon  className="wb-icon" /></div>
                    <div className="wb-vl"></div>
                    <div onClick={() => { canvasRef.current.redo(true) }} className="wbur" style={{width:"100%"}}><RedoIcon  className="wb-icon" />
                        </div>
                </div>

                <div className="wb-toolbar">
                    <div className="tooltip" style={{ width: "18px", height: "18px" }}> <Pen onClick={() => { setMode('pen') }} className={mode == "pen" ? "wb-icon-a tooltip" : "wb-icon tooltip"} /> <span className="tooltiptextdown">Pen</span></div>


                    <div className="tooltip  " style={{ height: "18px" }}><EraserIcon onClick={() => setEraserModalIsOpen(true)} className={mode == "eraser" ? "wb-icon-a tooltip" : "wb-icon tooltip"} /><span className="tooltiptextdown">Eraser</span> </div>
                    <div className="wb-ti tooltip"><Texticon onClick={() => { setMode('text') }} className={mode == "text" ? "wb-icon-a tooltip" : "wb-icon tooltip"} /><Down className="wb-icon" onClick={() => { setTextModalIsOpen(true) }} styles={{ marginleft: "5px" }} /><span className="tooltiptextdown">Text</span></div>


                    <div className="tooltip" style={{ height: "18px" }}>     <Rectangleicon onClick={() => setSqModalIsOpen(true)} className="wb-icon" /><span className="tooltiptextdown">Shapes</span></div>


                    <div className="tooltip  " style={{ width: "26px", height: "25px" }}>    <Pointericon onClick={() => { setMode('lazer') }} className={mode == "lazer" ? "wb-icon-a tooltip" : "wb-icon tooltip"} /><span className="tooltiptextdown">Lazer</span></div>


                    <div className="tooltip" style={{ height: "24px" }}>     <Grid1 className="wb-icon" onClick={() => { setHideGrid(!hideGrid); }} /><span className="tooltiptextdown">Select</span></div>

                    <div className="tooltip  " style={{ height: "20px" }}>        <Dottedsqicon className="wb-icon" onClick={() => {setMode('select') }} /><span className="tooltiptextdown">Selector</span></div>

                    <div className="tooltip  " style={{ height: "21px" }}>        <Ellipse onClick={() => { handleSelectColor() }} className="wb-icon" style={{ fill: color }} /><span class="tooltiptextdown">Color</span></div>

                    <div className="tooltip  " style={{ height: "25px" }} disabled={!canvasHasContent}>          <Downloads onClick={() => { handleDownloadCanvas() }} className="wb-icon" /><span class="tooltiptextdown">Download</span></div>
                </div>
                <div className="wb-clearscreen" onClick={() => { canvasRef.current.clear(true) }}> Clear Board</div>
            </div>
            {/*<Container>
                <Button variant="contained" color="primary" onClick={() => { setHideGrid(!hideGrid); }}>{hideGrid ? 'Turn Grid On' : 'Turn Grid Off'}</Button>
                <Button variant="contained" color="primary" onClick={() => { setShowColorPicker(!showColorPicker); }}>Pick Color</Button>

                {showColorPicker ? <CirclePicker color={color} onChange={(color) => { console.log(color); setColor(color.hex); }} /> : null}

                <Select
                    labelId="demo-simple-select-outlined-label"
                    id="demo-simple-select-outlined"
                    value={brushRadius}
                    onChange={(val) => { setBrushRadius(val.target.value); }}
                    label="Brush Size"
                >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={30}>30</MenuItem>
                    <MenuItem value={40}>40</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                </Select>
                <Button variant="contained" color="primary" onClick={() => { canvasRef.current.clear(true) }}>Clear Screen</Button>
            
                <Button variant="contained" color="primary" onClick={() => { setMode('pen') }}>Pen</Button>
                <Button variant="contained" color="primary" onClick={() => { setMode('lazer') }}>Lazer</Button>
                <Button variant="contained" color="primary" onClick={() => { setMode('eraser') }}>Eraser</Button>
                <Select
                    labelId="demo-simple-select-outlined-label"
                    id="demo-simple-select-outlined"
                    value={eraserSize}
                    onChange={(val) => { setEraserSize(val.target.value); }}
                    label="Brush Size"
                >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={30}>30</MenuItem>
                    <MenuItem value={40}>40</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                </Select>
                <Button variant="contained" color="primary" onClick={() => { setMode('elementEraser') }}>Element Eraser</Button>
                <Button variant="contained" color="primary" onClick={() => { setMode('text') }}>Text</Button>
                <Button variant="contained" color="primary" onClick={() => { setMode(SHAPES.CIRCLE) }}>Circle</Button>
                <Button variant="contained" color="primary" onClick={() => { setMode(SHAPES.RECTANGLE) }}>Rectangle</Button>
                <Button variant="contained" color="primary" onClick={() => { setMode(SHAPES.LINE) }}>Line</Button>
                <Button variant="contained" color="primary" onClick={() => { setMode(SHAPES.ARROW) }}>Arrow</Button>
                <Button variant="contained" color="primary" onClick={() => { setMode(SHAPES.TRIANGLE) }}>Triangle</Button>
                <Button variant="contained" color="primary" onClick={() => { setMode(SHAPES.ROUNDED_RECTANGLE) }}>Rounded Rectangle</Button>
                
                <Button variant="contained" color="primary" onClick={() => handleBgColor(bgColor)}>{bgColor === 'white' ? 'Dark Mode' : 'Light Mode'}</Button>
                <Button variant="contained" color="primary" onClick={() => { handleDownloadCanvas() }}>Save WhiteBoard</Button>
                <Button variant="contained" color="primary" onClick={() => { setMode('select') }}>Select</Button>
                <Typography id="continuous-slider" gutterBottom>
                    Grid Size
                </Typography>
                <Slider value={gridSize} onChange={(e, val) => setGridSize(val)} aria-labelledby="continuous-slider" min={1} max={200} />
                <ZoomOutIcon onClick={() => handleZoom('in')} />
                {`${size.width / 10}%`}
                <ZoomInIcon onClick={() => handleZoom('out')} />
                <div id="text_style">
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontSize(12) }}>S</Button>
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontSize(16) }}>M</Button>
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontSize(20) }}>L</Button>
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontSize(24) }}>XL</Button>
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontSize(28) }}>XXL</Button>
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { fontStyle === 'normal' ? setFontStyle('italic') : setFontStyle('normal') }}>Italic</Button>
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { fontWeight === 'normal' ? setFontWeight('bold') : setFontWeight('normal') }}>Bold</Button>

                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontAlign('left') }}>Left</Button>
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontAlign('center') }}>Center</Button>
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontAlign('right') }}>Right</Button>

                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontFamily('Arial') }}>Arial</Button>
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontFamily('Verdana') }}>Verdana</Button>
                    <Button id="text_style" variant="contained" color="primary" onClick={() => { setFontFamily('Times') }}>Times</Button>
                </div>
            <Sidebar/>*/}
            {/* Note to Mohit: Connect Cursor dynamically based on which option is active  in css check line 23*/}
            <div className={mode} style={{ width: "100%", display: 'flex', justifyContent: "center" }} >
              
                <Canvas
                    ref={canvasRef}
                    hideGrid={hideGrid}
                    canvasWidth={2414}
                    canvasHeight={1100}
                    brushColor={color}
                    brushRadius={brushRadius}
                    mode={mode}
                    gridSize={gridSize}
                    eraserSize={eraserSize}
                    backgroundColor={bgColor}
                    fontSize={fontSize}
                    fontStyle={fontStyle}
                    fontWeight={fontWeight}
                    fontAlign={fontAlign}
                    fontFamily={fontFamily}
                    setMode={setMode}
                    setCanvasHasContent={setCanvasHasContent}
                />



            </div>


            {/*} </Container>*/}
            <div style={{ height: "70px" }}><BottomBar /></div>



            {/*all modals are below this line*/}
            <Modal isOpen={modalIsOpen} onRequestClose={() => setModalIsOpen(false)} contentLabel="onRequestClose Example"
                className="Modal-pen"
                overlayClassName="Overlay">
                <div> </div>


            </Modal>
            <Modal isOpen={modalIsOpenEraser} onRequestClose={() => setEraserModalIsOpen(false)} contentLabel="onRequestClose Example"
                className="Modal-eraser"
                overlayClassName="Overlay">
                <div className="wb-Eraser">          <div onClick={() => { setMode('eraser') }}> <ElementEraserIcon className="wb-erasericon" />Eraser</div>
                    <div onClick={() => { setMode('elementEraser') }}><UnderlineEraserIcon className="wb-erasericon" />Element Eraser</div>
                </div>
            </Modal>

            <Modal isOpen={modalIsOpenText} onRequestClose={() => {setMode('text'); setTextModalIsOpen(false)}} contentLabel="onRequestClose Example"
                className="Modal-text"
                overlayClassName="Overlay">
                <div className={fontSize === 12 ? "wb-text-active" : "wb-text-unactive"} onClick={() => { setFontSize(12) }}> S </div>
                <div className={fontSize === 16 ? "wb-text-active" : "wb-text-unactive"} onClick={() => { setFontSize(16) }}> M</div>
                <div className={fontSize === 20 ? "wb-text-active" : "wb-text-unactive"} onClick={() => { setFontSize(20) }}> L </div>
                <div className={fontSize === 24 ? "wb-text-active" : "wb-text-unactive"} onClick={() => { setFontSize(24) }}> XL</div>
                <div className={fontSize === 28 ? "wb-text-active" : "wb-text-unactive"} onClick={() => { setFontSize(28) }}> XXL</div>
                <div className={fontStyle == 'italic' ? "wb-text-active" : "wb-text-unactive"} onClick={() => { fontStyle === 'normal' ? setFontStyle('italic') : setFontStyle('normal') }} ><i>I</i></div>
                <div className={fontWeight == 'bold' ? "wb-text-active" : "wb-text-unactive"} onClick={() => { fontWeight === 'normal' ? setFontWeight('bold') : setFontWeight('normal') }} ><b>B</b></div>
                <div className="wb-text-unactive" onClick={() => { setFontAlign('center') }}><Fourlines /></div>

            </Modal>

            <Modal isOpen={modalIsOpenSq} onRequestClose={() => setSqModalIsOpen(false)} contentLabel="onRequestClose Example"
                className="Modal-sq"
                overlayClassName="Overlay">
                <div className="wb-sq-row">
                    <div className={mode == 'shapeRectangle' ? "wb-text-active" : "wb-text-unactive"} onClick={() => { setMode(SHAPES.RECTANGLE) }}> <SqIcon /> </div>
                    <div className={mode == 'shapeLine' ? "wb-text-active" : "wb-text-unactive"} onClick={() => { setMode(SHAPES.LINE) }}> <Slantline /> </div>
                    <div className={mode == 'shapeArrow' ? "wb-text-active" : "wb-text-unactive"} onClick={() => { setMode(SHAPES.ARROW) }}> <Arrow /> </div>

                </div>

                <div className="wb-sq-row">
                    <div className={mode == 'shapeCircle' ? "wb-text-active" : "wb-text-unactive"} onClick={() => { setMode(SHAPES.CIRCLE) }}> <Circleicon /> </div>
                    <div className={mode == 'shapeTriangle' ? "wb-text-active" : "wb-text-unactive"} onClick={() => { setMode(SHAPES.TRIANGLE) }}> <TriangleIcon /> </div>
                    {/*<div className="wb-text-unactive" onClick={() => { setFontAlign('center') }}> <StarIcon/> </div>*/}

                </div>

            </Modal>

            <Modal isOpen={modalIsOpenColor} onRequestClose={() => setColorModalIsOpen(false)} contentLabel="onRequestClose Example"
                className="Modal-color"
                overlayClassName="Overlay">
                <div><CirclePicker color={color} onChange={(color) => { console.log(color); setColor(color.hex); }} /> </div>
            </Modal>
        </div>
    )
}

export default WhiteBoard;
