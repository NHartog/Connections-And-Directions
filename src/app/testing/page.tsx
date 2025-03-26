'use client'
import { Box, Button, SpeedDial, SpeedDialAction, SpeedDialIcon, Stack } from '@mui/material';
import { dia, shapes, highlighters, elementTools, linkTools, util } from '@joint/core';
import * as joint from '@joint/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import SaveIcon from "@mui/icons-material/Save";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import React from "react";

import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

export default function Home() {
  const [paper, setPaper] = useState<dia.Paper>()
  const [graph, setGraph] = useState<dia.Graph>()
  const [panningEnabled, setPanningEnabled] = useState<boolean>(true)
  const [selectionManager, setSelectionManager] = useState<SelectionManager>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shiftHeld = useRef<boolean>(false)
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null)
  const boxWrapperRef = useRef<HTMLElement>(null)
  const width = 8000 // in pixels
  const height = 8000 // in pixels
  const elementWidth = 150 // in pixels
  const elementHeight = 50 // in pixels

  const onImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click(); // Opens file dialog
    }
  };

  useEffect(() => {

    // Listen for the keydown event to check if Shift is pressed
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Shift') {
        shiftHeld.current = true
      }
    });

    // Listen for the keyup event to check if Shift is released
    document.addEventListener('keyup', (event) => {
      if (event.key === 'Shift') {
        shiftHeld.current = false
      }
    });
  }, [])

  class SelectionManager {
    private selected: Set<joint.dia.Element> = new Set();
    private isSelectionDragging = false;
    private isElementDragging = false;
    private initialPositions: Map<joint.dia.Cell.ID, { x: number; y: number }> = new Map();

    constructor(private paper: joint.dia.Paper, private graph: joint.dia.Graph) {
      this.initEvents();
    }

    private initEvents() {
      // Rubberband selection start
      this.paper.on('blank:pointerdown', (event, x, y) => this.startSelectionDragging(x, y));

      // Rubberband selection end
      this.paper.on('blank:pointerup', () => this.stopSelectionDragging());

      // Element drag start (only after selection dragging is done)
      this.paper.on('element:pointerdown', (elementView, event) => this.startElementDragging(elementView, event));

      // Element drag move (only moves after selection)
      this.paper.on('element:pointermove', (elementView, event, x, y) => this.dragElements(elementView, x, y));

      // Element drag stop
      this.paper.on('element:pointerup', () => this.stopElementDragging());
    }

    private startSelectionDragging(x: number, y: number) {
      this.isSelectionDragging = true;

      // Clear previous selection
      this.clearSelection();

      // Create a temporary selection box
      const selectionBox = new joint.shapes.standard.Rectangle();
      selectionBox.position(x, y);
      selectionBox.resize(1, 1);
      selectionBox.attr({ body: { fill: 'rgba(0, 0, 255, 0.1)', stroke: 'blue', 'stroke-dasharray': '5,5' } });
      selectionBox.addTo(this.graph);

      // Update the box size on mouse move
      this.paper.on('blank:pointermove', (event, newX, newY) => {
        selectionBox.resize(newX - x, newY - y);
      });

      // On mouse up, select elements inside the box
      this.paper.once('blank:pointerup', () => {
        const bbox = selectionBox.getBBox();
        this.graph.getElements().forEach((el) => {
          if (bbox.containsRect(el.getBBox())) {
            this.addElement(el);
          }
        });

        selectionBox.remove();
        this.isSelectionDragging = false; // Enable dragging after selection
      });
    }

    private stopSelectionDragging() {
      this.isSelectionDragging = false;
    }

    private startElementDragging(elementView: joint.dia.ElementView, event: joint.dia.Event) {
      if (this.isSelectionDragging) return; // Prevent dragging while selecting

      const element = elementView.model;
      this.isElementDragging = true;

      if (!this.selected.has(element)) {
        this.clearSelection();
        this.addElement(element);
      }

      // Store initial positions
      this.initialPositions.clear();
      this.selected.forEach((el) => {
        this.initialPositions.set(el.id, el.position());
      });
    }

    private dragElements(elementView: joint.dia.ElementView, x: number, y: number) {
      if (!this.isElementDragging) return;

      const draggedElement = elementView.model;
      if (!this.selected.has(draggedElement)) return;

      const initialPosition = this.initialPositions.get(draggedElement.id);
      if (!initialPosition) return;

      // Offset drag by element width and height
      const dx = x - initialPosition.x - elementWidth / 2; // Offset by half the width
      const dy = y - initialPosition.y - elementHeight / 2; // Offset by half the height

      // Move all selected elements
      this.selected.forEach((el) => {
        const pos = this.initialPositions.get(el.id);
        if (pos) {
          el.position(pos.x + dx, pos.y + dy);
        }
      });
    }

    private stopElementDragging() {
      this.isElementDragging = false;
    }

    addElement(element: joint.dia.Element) {
      this.selected.add(element);
      element.attr('body/stroke', 'blue'); // Highlight selection
    }

    clearSelection() {
      if (!shiftHeld.current) {
        this.selected.forEach((el) => el.attr('body/stroke', 'black'));
        this.selected.clear();
      }
    }

    getSelectedElements() {
      return Array.from(this.selected);
    }
  }

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
      router: {
        name: 'orthogonal'
      },
      connector: {
        name: 'rounded'
      }
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

    setSelectionManager(new SelectionManager(paper, graph))

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
      if (selectionManager) {
        graph?.removeCells(selectionManager?.getSelectedElements())
        selectionManager?.clearSelection()
      }
    }

    if (event.key == 'Escape') {
      selectionManager?.clearSelection()
    }
  }, [selectionManager, graph]);

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


  function onSave() {
    // Convert JSON object to string
    if (!graph) {
      return;
    }

    const jsonString = JSON.stringify(graph.toJSON(), null, 2)

    // Create a Blob with JSON data
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create a downloadable URL
    const url = URL.createObjectURL(blob);

    // Create an anchor element and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.json"; // File name
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Release the object URL
    URL.revokeObjectURL(url);
  }


  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Get the first file

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string; // Read file content
        const json = JSON.parse(text); // Parse JSON
        console.log(json)
        if (graph) {
          graph.fromJSON(json)
        }
        console.log("Imported JSON:", json);
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };

    console.log(file)

    reader.readAsText(file); // Read file as text
  };

  return (
    <Stack direction="row" sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ width: 'calc(100% - 300px)', height: '100%' }}>
        <Box sx={{ position: 'fixed', zIndex: 2 }}>
          <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomIn()}>+</Button>
          <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomOut()}>-</Button>
          <Button variant="contained" onClick={() => transformWrapperRef.current?.resetTransform()}>x</Button>
          <Button variant="contained" onClick={() => transformWrapperRef.current?.centerView()}>o</Button>
          <Button onClick={() => addElement('attribute', new shapes.standard.Ellipse())} variant="contained">Add Attribute</Button>
          <Button onClick={() => addElement('entity', new shapes.standard.Rectangle())} variant="contained">Add Entity</Button>
          <Button onClick={() => addElement('relationship', new shapes.standard.Polygon())} variant="contained">Add Relationship</Button>
        </Box>
        <Box sx={{ position: 'fixed', zIndex: 2, bottom: 16, right: 316 }}>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            onChange={handleImport}
            style={{ display: "none" }}
          />
          <SpeedDial
            ariaLabel="SpeedDial actions"
            icon={<SpeedDialIcon />}
          >
            <SpeedDialAction
              icon={<SaveIcon />}
              tooltipTitle="Save"
              onClick={onSave}
            />
            <SpeedDialAction
              icon={<FileUploadIcon />}
              tooltipTitle="Import"
              onClick={onImport}
            />
          </SpeedDial>
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

                  if (e.button == 0) {
                    setPanningEnabled(false);
                  }
                }}
                onMouseUp={() => setPanningEnabled(true)}
              />
            </TransformComponent>
          </TransformWrapper>
        </Box>
      </Box>
      <Box sx={{ backgroundColor: 'red', width: '300px', height: '100%' }}>

      </Box>
    </Stack>
  )
}

