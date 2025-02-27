"use client"
import { Box, Button } from '@mui/material';
import { dia, shapes } from '@joint/core';
import { useEffect, useRef, useState } from 'react';

import React from "react";

import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

export default function Home() {
  const [, setPaper] = useState<dia.Paper>()
  const [graph, setGraph] = useState<dia.Graph>()
  const [panningEnabled, setPanningEnabled] = useState<boolean>(true)
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null)
  const boxWrapperRef = useRef<HTMLElement>(null)
  const width = 8000 // in pixels
  const height = 8000 // in pixels
  const elementWidth = 150 // in pixels
  const elementHeight = 50 // in pixels

  //Note, the creation of the paper must be inside the useEffect to allow the div with id "paper" to exist before its initialization
  useEffect(() => {
    // create paper
    const namespace = shapes;

    const graph = new dia.Graph({}, { cellNamespace: namespace });
    setGraph(graph)

    setPaper(new dia.Paper({
      el: document.getElementById('joinjs_graph'),
      model: graph,
      width: width,
      height: height,
      gridSize: 10,
      drawGrid: {
        color: '#c9c9c9',
        thickness: 1,
        name: 'mesh',
      },
      background: { color: '#F5F5F5' },
      cellViewNamespace: namespace
    }));
  }, [])

  const addElement = (name: string, shape: dia.Element) => {
    if (graph) {
      shape.position(width / 2 - elementWidth / 2, height / 2 - elementHeight / 2);
      shape.resize(elementWidth, elementHeight);
      shape.attr('label', { text: name });

      if (shape instanceof shapes.standard.Polygon) {
        shape.attr('body/refPoints', '50,0 100,50 50,100 0,50');
      }

      shape.addTo(graph);

    }
  }
  return (
    <>
      <Box sx={{ position: 'fixed', zIndex: 2 }}>
        <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomIn()}>+</Button>
        <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomOut()}>-</Button>
        <Button variant="contained" onClick={() => transformWrapperRef.current?.resetTransform()}>x</Button>
        <Button variant="contained" onClick={() => transformWrapperRef.current?.centerView()}>o</Button>
        <Button onClick={() => addElement('attribute', new shapes.standard.Ellipse())} variant="contained">Add Attribute</Button>
        <Button onClick={() => addElement('entity', new shapes.standard.Rectangle())} variant="contained">Add Entity</Button>
        <Button onClick={() => addElement('relationship', new shapes.standard.Polygon())} variant="contained">Add Relationship</Button>
      </Box>
      <Box sx={{ width: '100%', height: '100%' }} ref={boxWrapperRef}>
        <TransformWrapper
          centerOnInit={true}
          initialPositionX={-width / 2 + (boxWrapperRef.current?.clientWidth || 0) / 2}
          initialPositionY={-height / 2 + (boxWrapperRef.current?.clientHeight || 0) / 2}
          doubleClick={{ mode: 'toggle' }}
          panning={{ disabled: !panningEnabled }}
          ref={transformWrapperRef}
        >
          <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
            <Box id="joinjs_graph"
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('.joint-element')) {
                  setPanningEnabled(false); // Disable panning while dragging an element
                }
              }}
              onMouseUp={() => setPanningEnabled(true)} />
          </TransformComponent>
        </TransformWrapper>
      </Box>
    </>
  )
}

