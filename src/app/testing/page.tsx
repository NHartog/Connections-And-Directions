'use client'
import { Box, Button } from '@mui/material';
import { dia, shapes, highlighters, elementTools, linkTools, util } from '@joint/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import React from "react";

import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

export default function Home() {
  const [paper, setPaper] = useState<dia.Paper>()
  const [graph, setGraph] = useState<dia.Graph>()
  const selectedCells = useRef<dia.Cell[]>([])
  const [panningEnabled, setPanningEnabled] = useState<boolean>(true)
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null)
  const boxWrapperRef = useRef<HTMLElement>(null)
  const width = 8000 // in pixels
  const height = 8000 // in pixels
  const elementWidth = 150 // in pixels
  const elementHeight = 50 // in pixels

  const singleLine = new shapes.standard.Link(
    {
      z: 0,
      attrs: {
        line: {
          stroke: 'black',    // Black line color
          strokeWidth: 4,     // Line thickness
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
          targetMarker: { type: 'none' },   // No arrowhead at target
          sourceMarker: { type: 'none' }    // No arrowhead at source
        }
      },
    }
  );
  // This will be the double line used in chens
  const doubleLine = new shapes.standard.DoubleLink(
    {
      z: 0,
      attrs: {
        line: {
          stroke: 'white',      // Main line color (white)
          strokeWidth: 2,       // Thickness of the main line
          fill: 'none',
          targetMarker: { type: 'none' },     // Removes arrowhead at target
          sourceMarker: { type: 'none' }
        },
        outline: {
          stroke: 'black',      // Outline color (black)
          strokeWidth: 10,       // Thickness of the outline (should be greater than strokeWidth)
        }
      },
      router: {
        name: 'orthogonal'
      },
      connector: {
        name: 'rounded'
      }
    }
  )

  //Note, the creation of the paper must be inside the useEffect to allow the div with id "paper" to exist before its initialization
  useEffect(() => {
    // create paper
    const namespace = shapes;

    const graph = new dia.Graph({}, { cellNamespace: namespace });
    setGraph(graph)

    const paper = new dia.Paper({
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
      interactive: true,
      linkPinning: false,
      snapLinks: { radius: 10 },
      defaultLink: doubleLine,
      linkLayer: 0,
      defaultConnectionPoint: {
        name: 'boundary',
        args: {
          sticky: true,
          perpendicular: true
        }
      },
      validateConnection: (
        sourceView,
        sourceMagnet,
        targetView,
        targetMagnet,
        end
      ) => {
        const source = sourceView.model;
        const target = targetView.model;
        if (source.isLink() || target.isLink()) return false;
        if (targetMagnet === sourceMagnet) return false;
        if (end === 'target' ? targetMagnet : sourceMagnet) {
          return true;
        }
        if (source === target) return false;
        return end === 'target' ? target.isElement() && !target.hasPorts() : source.isElement() && !source.hasPorts();
      },
      background: { color: '#F5F5F5' },
      cellViewNamespace: namespace
    })

    //This is in charge of highlighting a clicked element, maybe useful
    paper.on('element:pointerclick', (elementView) => {
      const highlightId = 'my-element-highlight';
      const isHighlighted = highlighters.mask.get(elementView, highlightId);

      if (isHighlighted) {
        highlighters.mask.remove(elementView, highlightId);
        console.log("checking inclusion")

        if (selectedCells.current.some((cell) => { console.log(cell.cid, elementView.model.cid); return cell.cid == elementView.model.cid })) {
          console.log('it does include')
          selectedCells.current = selectedCells.current.filter(item => item !== elementView.model);
        }
      } else {
        highlighters.mask.add(elementView, { selector: 'root' }, highlightId, {
          deep: true,
          attrs: {
            'stroke': '#FF4365',
            'stroke-width': 3
          }
        });
        if (!selectedCells.current.some((cell) => cell.cid == elementView.model.cid)) {
          selectedCells.current = [...selectedCells.current, elementView.model];
        }
      }
    });

    paper.on('link:click', (linkView) => {
      const highlightId = 'my-element-highlight';
      const isHighlighted = highlighters.mask.get(linkView, highlightId);

      if (isHighlighted) {
        highlighters.mask.remove(linkView, highlightId);
        if (selectedCells.current.some((cell) => cell.cid == linkView.model.cid)) {
          selectedCells.current = selectedCells.current.filter(item => item !== linkView.model);;
        }
      } else {
        highlighters.mask.add(linkView, { selector: 'root' }, highlightId, {
          deep: true,
          attrs: {
            'stroke': '#FF4365',
            'stroke-width': 3
          }
        });
        if (!selectedCells.current.some((cell) => cell.cid == linkView.model.cid)) {
          selectedCells.current = [...selectedCells.current, linkView.model];
        }
      }
    });

    const verticesTool = new linkTools.Vertices();
    const segmentsTool = new linkTools.Segments();
    const sourceArrowheadTool = new linkTools.SourceArrowhead();
    const targetArrowheadTool = new linkTools.TargetArrowhead();
    const boundaryTool = new linkTools.Boundary();
    const removeButton = new linkTools.Remove();

    const toolsView = new dia.ToolsView({
      tools: [
        verticesTool, segmentsTool,
        sourceArrowheadTool, targetArrowheadTool,
        boundaryTool, removeButton
      ]
    });

    paper.on('link:mouseenter', function(linkView) {
      linkView.addTools(toolsView);
    });

    paper.on('link:mouseleave', (linkView) => {
      linkView.removeTools();
    });
    paper.on('element:mouseenter', elementView => {
      elementView.showTools();
    });

    paper.on('element:mouseleave', elementView => {
      elementView.hideTools();
    });


    setPaper(paper)
  }, [])

  // Handle delete and backspace key events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      graph?.removeCells(selectedCells.current)
      selectedCells.current = []
    }
  }, [selectedCells, graph]);

  useEffect(() => {
    console.log(selectedCells)
  }, [selectedCells])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const addElement = (name: string, shape: dia.Element) => {
    if (graph && paper) {
      //shape.addTo(graph);
      shape.position(width / 2 - elementWidth / 2, height / 2 - elementHeight / 2);
      shape.resize(elementWidth, elementHeight);
      shape.attr('label', { text: name });
      // Define ports separately
      const portRadius = 8;
      const portAttrs = {
        circle: {
          cursor: 'crosshair',
          fill: '#4D64DD',
          stroke: '#F4F7F6',
          magnet: 'active',
          r: portRadius,
        },
      };

      const ports = {
        groups: {
          top: {
            position: 'top',
            attrs: portAttrs,
          },
          bottom: {
            position: 'bottom',
            attrs: portAttrs,
          },
          right: {
            position: 'right',
            attrs: portAttrs,
          },
          left: {
            position: 'left',
            attrs: portAttrs,
          },
        },
      };

      // Apply ports after initialization
      shape.set('ports', ports);

      // 1) Create element tools
      const boundaryTool = new elementTools.Boundary();
      const removeButton = new elementTools.Remove({
        useModelGeometry: true,
        x: '10%',
        y: '50%',
      });
      const connectTool = new elementTools.Connect({
        useModelGeometry: true,
        x: '90%',
        y: '50%',
      })

      // 2) Create tools view
      const toolsView = new dia.ToolsView({
        name: 'basic-tools',
        tools: [boundaryTool, removeButton, connectTool]
      });

      shape.addTo(graph)
      // 3) Attach the tools to the original shape's view
      const shapeView = shape.findView(paper);
      shapeView.addTools(toolsView);
      shapeView.hideTools(); // Hide the tools


      if (shape instanceof shapes.standard.Polygon) {
        shape.attr('body/refPoints', '50,0 100,50 50,100 0,50');
      }


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
                const target = e.target as HTMLElement;
                console.log(target)

                // Check if clicking an element
                if (target.closest('.joint-element')) {
                  setPanningEnabled(false); // Disable panning while dragging an element
                }

                if (target.closest('.joint-link')) {
                  setPanningEnabled(false);
                }

                if (target.closest('.joint-tool')) {
                  setPanningEnabled(false);
                }
              }}
              onMouseUp={() => setPanningEnabled(true)}
            />
          </TransformComponent>
        </TransformWrapper>
      </Box>
    </>
  )
}

