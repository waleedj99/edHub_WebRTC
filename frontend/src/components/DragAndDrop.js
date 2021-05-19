import React, { Component } from 'react';

import './DragAndDrop.css';

class DragAndDrop extends Component {
    dropRef = React.createRef();
    dropCss = React.createRef();

    handleDragIn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropCss.current.style.visibility = 'visible';
    }
    handleDragOut = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropCss.current.style.visibility = 'hidden';
    }
    handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropCss.current.style.visibility = 'hidden';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            this.props.handleDrop(e.dataTransfer.files);
        }
    }
    componentDidMount() {
        let div = this.dropRef.current;
        div.addEventListener('dragenter', this.handleDragIn);
        div.addEventListener('dragleave', this.handleDragOut);
        div.addEventListener('dragover', this.handleDragIn);
        div.addEventListener('drop', this.handleDrop);
    }
    componentWillUnmount() {
        let div = this.dropRef.current;
        div.removeEventListener('dragenter', this.handleDragIn);
        div.removeEventListener('dragleave', this.handleDragOut);
        div.removeEventListener('dragover', this.handleDragIn);
        div.removeEventListener('drop', this.handleDrop);
    }
    render() {
        return (
            <div
                className="outterDivDropbox"
                ref={this.dropRef} >
                <div className="outlineDropbox" ref={this.dropCss}>
                    <div className="dropboxText">
                        <div > Drag & Drop here! </div>
                    </div >
                </div>
                {this.props.children}
            </div >
        )
    }
}
export default DragAndDrop